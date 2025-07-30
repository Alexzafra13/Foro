import { PasswordResetTokenRepository } from '../../repositories/password-reset-token.repository';
import { UserRepository } from '../../repositories/user.repository';
import { ActivityLogRepository } from '../../repositories/activity-log.repository';
import { UserErrors, ValidationErrors } from '../../../shared/errors';
import { bcryptAdapter } from '../../../config/bcrypt.adapter';
import { ActivityLogEntity } from '../../entities/activity-log.entity';

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
  confirmPassword: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ResetPasswordResponseDto {
  success: boolean;
  message: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

interface ResetPasswordUseCase {
  execute(dto: ResetPasswordDto): Promise<ResetPasswordResponseDto>;
}

export class ResetPassword implements ResetPasswordUseCase {
  constructor(
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly userRepository: UserRepository,
    private readonly activityLogRepository: ActivityLogRepository
  ) {}

  async execute(dto: ResetPasswordDto): Promise<ResetPasswordResponseDto> {
    const { token, newPassword, confirmPassword, ipAddress, userAgent } = dto;

    // 1. Validar input básico
    this.validateInput(token, newPassword, confirmPassword);

    // 2. Buscar y validar token
    const resetToken = await this.passwordResetTokenRepository.findByToken(token);
    if (!resetToken) {
      throw UserErrors.invalidCredentials(); // Token no encontrado
    }

    // 3. Verificar que el token no haya expirado
    if (resetToken.isExpired()) {
      throw UserErrors.invalidCredentials(); // Token expirado
    }

    // 4. Verificar que el token no haya sido usado
    if (resetToken.isUsed()) {
      throw UserErrors.invalidCredentials(); // Token ya usado
    }

    // 5. Obtener usuario asociado
    const user = await this.userRepository.findById(resetToken.userId);
    if (!user) {
      throw UserErrors.userNotFound(resetToken.userId);
    }

    // 6. Verificar que el usuario no esté baneado
    if (user.isBannedUser()) {
      throw UserErrors.insufficientPermissions();
    }

    // 7. Validar nueva contraseña
    this.validatePasswordStrength(newPassword);

    // 8. Verificar que no sea la misma contraseña actual
    const isSamePassword = bcryptAdapter.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw ValidationErrors.invalidFormat('New password', 'different from current password');
    }

    // 9. Encriptar nueva contraseña
    const newPasswordHash = bcryptAdapter.hash(newPassword);

    // 10. Actualizar contraseña del usuario
    await this.userRepository.updateById(user.id, {
      passwordHash: newPasswordHash,
      updatedAt: new Date()
    });

    // 11. Marcar token como usado
    await this.passwordResetTokenRepository.markAsUsed(token);

    // 12. Limpiar otros tokens del usuario
    await this.passwordResetTokenRepository.deleteByUserId(user.id);

    // 13. Registrar actividad
    try {
      const activityLog = ActivityLogEntity.createPasswordResetCompletedLog(
        user.id,
        ipAddress,
        userAgent
      );
      await this.activityLogRepository.create(activityLog);
    } catch (error) {
      console.error('Error logging password reset completion:', error);
    }

    // 14. Retornar confirmación
    return {
      success: true,
      message: 'Password reset successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    };
  }

  private validateInput(token: string, newPassword: string, confirmPassword: string): void {
    if (!token || token.trim().length === 0) {
      throw ValidationErrors.requiredField('Reset token');
    }

    if (!newPassword || newPassword.trim().length === 0) {
      throw ValidationErrors.requiredField('New password');
    }

    if (!confirmPassword || confirmPassword.trim().length === 0) {
      throw ValidationErrors.requiredField('Password confirmation');
    }

    if (newPassword !== confirmPassword) {
      throw ValidationErrors.invalidFormat('Password confirmation', 'passwords must match');
    }
  }

  private validatePasswordStrength(password: string): void {
    // Reutilizar la misma validación del ChangePassword use case
    if (password.length < 6) {
      throw ValidationErrors.minLength('Password', 6);
    }

    if (password.length > 100) {
      throw ValidationErrors.maxLength('Password', 100);
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const criteriaCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar]
      .filter(Boolean).length;

    if (criteriaCount < 2) {
      throw ValidationErrors.invalidFormat(
        'Password', 
        'at least two of: uppercase letters, lowercase letters, numbers, or special characters'
      );
    }

    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty', 
      'letmein', 'welcome', 'monkey', '1234567890'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      throw ValidationErrors.invalidFormat('Password', 'not a common password');
    }

    if (password.includes(' ')) {
      throw ValidationErrors.invalidFormat('Password', 'no spaces allowed');
    }
  }
}