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

export class EmailVerificationErrors {
  static tokenNotFound(token: string) {
    return ValidationErrors.invalidFormat('Verification token', `token '${token}' not found`);
  }

  static tokenExpired(expiresAt: Date) {
    return ValidationErrors.invalidFormat(
      'Verification token', 
      `expired on ${expiresAt.toLocaleDateString()}`
    );
  }

  static tokenAlreadyUsed(usedAt: Date) {
    return ValidationErrors.invalidFormat(
      'Verification token', 
      `already used on ${usedAt.toLocaleDateString()}`
    );
  }

  static emailAlreadyVerified() {
    return ValidationErrors.invalidFormat(
      'Email', 
      'already verified'
    );
  }
}

export class VerifyEmail {
  constructor(
    private readonly emailVerificationTokenRepository: EmailVerificationTokenRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: VerifyEmailRequestDto): Promise<VerifyEmailResponseDto> {
    const { token } = dto;

    this.validateTokenFormat(token);

    const verificationToken = await this.emailVerificationTokenRepository.findByToken(token);
    if (!verificationToken) {
      throw EmailVerificationErrors.tokenNotFound(token);
    }

    if (verificationToken.isExpired()) {
      throw EmailVerificationErrors.tokenExpired(verificationToken.expiresAt);
    }

    if (verificationToken.isUsed()) {
      throw EmailVerificationErrors.tokenAlreadyUsed(verificationToken.usedAt!);
    }

    const user = await this.userRepository.findById(verificationToken.userId);
    if (!user) {
      throw new Error('User not found for verification token');
    }

    if (user.isEmailVerified) {
      throw EmailVerificationErrors.emailAlreadyVerified();
    }

    await this.emailVerificationTokenRepository.markAsUsed(token);

    const updatedUser = await this.userRepository.updateById(user.id, {
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    });

    await this.emailVerificationTokenRepository.deleteByUserId(user.id);

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