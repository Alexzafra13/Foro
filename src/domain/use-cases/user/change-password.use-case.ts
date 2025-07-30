import { UserRepository } from '../../repositories/user.repository';
import { ActivityLogRepository } from '@/domain/repositories/activity-log.repository';
import { UserErrors, ValidationErrors } from '../../../shared/errors';
import { bcryptAdapter } from '../../../config/bcrypt.adapter';
import { ActivityLogEntity } from '../../entities/activity-log.entity';

export interface ChangePasswordRequestDto {
  userId: number; // Del JWT
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  ipAddress?: string;
}

export interface ChangePasswordResponseDto {
  success: boolean;
  message: string;
  changedAt: Date;
}

interface ChangePasswordUseCase {
  execute(dto: ChangePasswordRequestDto): Promise<ChangePasswordResponseDto>;
}

export class ChangePassword implements ChangePasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly activityLogRepository: ActivityLogRepository
  ) {}

  async execute(dto: ChangePasswordRequestDto): Promise<ChangePasswordResponseDto> {
    const { userId, currentPassword, newPassword, confirmPassword, ipAddress } = dto;

    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw UserErrors.userNotFound(userId);
    }

    // 2. Validaciones básicas
    this.validatePasswords(currentPassword, newPassword, confirmPassword);

    // 3. Verificar contraseña actual
    const isCurrentPasswordValid = bcryptAdapter.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw ValidationErrors.invalidFormat('Current password', 'correct current password');
    }

    // 4. Verificar que la nueva contraseña sea diferente
    const isSamePassword = bcryptAdapter.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw ValidationErrors.invalidFormat('New password', 'different from current password');
    }

    // 5. Hashear nueva contraseña
    const newPasswordHash = bcryptAdapter.hash(newPassword);

    // 6. Actualizar contraseña en la base de datos
    await this.userRepository.updateById(userId, {
      passwordHash: newPasswordHash,
      updatedAt: new Date()
    });

    // 7. Registrar actividad en el log
    try {
      const activityLog = ActivityLogEntity.createPasswordChangedLog(userId, ipAddress);
      await this.activityLogRepository.create(activityLog);
    } catch (error) {
      console.error('Error logging password change activity:', error);
      // No fallar la operación por errores en el log
    }

    // 8. Retornar confirmación
    return {
      success: true,
      message: 'Password changed successfully',
      changedAt: new Date()
    };
  }

  private validatePasswords(currentPassword: string, newPassword: string, confirmPassword: string): void {
    // Validar que todos los campos estén presentes
    if (!currentPassword || currentPassword.trim().length === 0) {
      throw ValidationErrors.requiredField('Current password');
    }

    if (!newPassword || newPassword.trim().length === 0) {
      throw ValidationErrors.requiredField('New password');
    }

    if (!confirmPassword || confirmPassword.trim().length === 0) {
      throw ValidationErrors.requiredField('Password confirmation');
    }

    // Validar longitud de nueva contraseña
    if (newPassword.length < 6) {
      throw ValidationErrors.minLength('New password', 6);
    }

    if (newPassword.length > 100) {
      throw ValidationErrors.maxLength('New password', 100);
    }

    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      throw ValidationErrors.invalidFormat('Password confirmation', 'passwords must match');
    }

    // Validar fortaleza de la contraseña
    this.validatePasswordStrength(newPassword);
  }

  private validatePasswordStrength(password: string): void {
    const minLength = 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    // Validación básica: al menos 6 caracteres
    if (password.length < minLength) {
      throw ValidationErrors.minLength('Password', minLength);
    }

    // Validación de fortaleza (al menos 2 de estos criterios)
    const criteriaCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar]
      .filter(Boolean).length;

    if (criteriaCount < 2) {
      throw ValidationErrors.invalidFormat(
        'Password', 
        'at least two of: uppercase letters, lowercase letters, numbers, or special characters'
      );
    }

    // Validar que no sea una contraseña común
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty', 
      'letmein', 'welcome', 'monkey', '1234567890'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      throw ValidationErrors.invalidFormat('Password', 'not a common password');
    }

    // Validar que no contenga espacios
    if (password.includes(' ')) {
      throw ValidationErrors.invalidFormat('Password', 'no spaces allowed');
    }
  }
}