import { EmailVerificationTokenRepository } from '../../repositories/email-verification-token.repository';
import { UserRepository } from '../../repositories/user.repository';
import { ValidationErrors } from '../../../shared/errors';

export interface VerifyEmailRequestDto {
  token: string;
}

export interface VerifyEmailResponseDto {
  success: boolean;
  message: string;
  user: {
    id: number;
    username: string;
    email: string;
    isEmailVerified: boolean;
    emailVerifiedAt: Date;
  };
}

// Errores específicos para verificación de email
export class EmailVerificationErrors {
  static tokenNotFound(token: string) {
    return new ValidationErrors.invalidFormat('Verification token', `token '${token}' not found`);
  }

  static tokenExpired(expiresAt: Date) {
    return new ValidationErrors.invalidFormat(
      'Verification token', 
      `expired on ${expiresAt.toLocaleDateString()}`
    );
  }

  static tokenAlreadyUsed(usedAt: Date) {
    return new ValidationErrors.invalidFormat(
      'Verification token', 
      `already used on ${usedAt.toLocaleDateString()}`
    );
  }

  static emailAlreadyVerified() {
    return new ValidationErrors.invalidFormat(
      'Email', 
      'already verified'
    );
  }
}

interface VerifyEmailUseCase {
  execute(dto: VerifyEmailRequestDto): Promise<VerifyEmailResponseDto>;
}

export class VerifyEmail implements VerifyEmailUseCase {
  constructor(
    private readonly emailVerificationTokenRepository: EmailVerificationTokenRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: VerifyEmailRequestDto): Promise<VerifyEmailResponseDto> {
    const { token } = dto;

    // 1. Validar formato del token
    this.validateTokenFormat(token);

    // 2. Buscar el token en la base de datos
    const verificationToken = await this.emailVerificationTokenRepository.findByToken(token);
    if (!verificationToken) {
      throw EmailVerificationErrors.tokenNotFound(token);
    }

    // 3. Verificar que el token no haya expirado
    if (verificationToken.isExpired()) {
      throw EmailVerificationErrors.tokenExpired(verificationToken.expiresAt);
    }

    // 4. Verificar que el token no haya sido usado
    if (verificationToken.isUsed()) {
      throw EmailVerificationErrors.tokenAlreadyUsed(verificationToken.usedAt!);
    }

    // 5. Obtener el usuario
    const user = await this.userRepository.findById(verificationToken.userId);
    if (!user) {
      throw new Error('User not found for verification token');
    }

    // 6. Verificar que el email no esté ya verificado
    if (user.isEmailVerified) {
      throw EmailVerificationErrors.emailAlreadyVerified();
    }

    // 7. Marcar el token como usado
    await this.emailVerificationTokenRepository.markAsUsed(token);

    // 8. Marcar el usuario como verificado
    const updatedUser = await this.userRepository.updateById(user.id, {
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    });

    // 9. Limpiar otros tokens del usuario (opcional)
    await this.emailVerificationTokenRepository.deleteByUserId(user.id);

    // 10. Retornar respuesta exitosa
    return {
      success: true,
      message: 'Email verified successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        isEmailVerified: updatedUser.isEmailVerified!,
        emailVerifiedAt: updatedUser.emailVerifiedAt!
      }
    };
  }

  private validateTokenFormat(token: string): void {
    if (!token || token.trim().length === 0) {
      throw ValidationErrors.requiredField('Verification token');
    }

    const trimmed = token.trim();

    // Token debe ser hexadecimal de 64 caracteres (32 bytes)
    if (trimmed.length !== 64) {
      throw ValidationErrors.invalidFormat(
        'Verification token', 
        '64-character hexadecimal string'
      );
    }

    if (!/^[a-f0-9]+$/i.test(trimmed)) {
      throw ValidationErrors.invalidFormat(
        'Verification token', 
        'hexadecimal string'
      );
    }
  }
}