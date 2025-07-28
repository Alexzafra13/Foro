import { InviteCodeRepository } from '../../repositories/invite-code.repository';
import { ValidationErrors, InviteCodeErrors } from '../../../shared/errors';

export interface ValidateInviteCodeRequestDto {
  code: string;
}

export interface ValidateInviteCodeResponseDto {
  isValid: boolean;
  code: string;
  isUsed: boolean;
  isExpired: boolean;
  createdAt: Date;
  expiresAt: Date;
  creator?: {
    username: string;
    role: string;
  };
  usedBy?: {
    username: string;
    usedAt: Date;
  };
}

interface ValidateInviteCodeUseCase {
  execute(dto: ValidateInviteCodeRequestDto): Promise<ValidateInviteCodeResponseDto>;
}

export class ValidateInviteCode implements ValidateInviteCodeUseCase {
  constructor(private readonly inviteCodeRepository: InviteCodeRepository) {}

  async execute(dto: ValidateInviteCodeRequestDto): Promise<ValidateInviteCodeResponseDto> {
    const { code } = dto;

    // 1. Validar formato del código
    this.validateCodeFormat(code);

    // 2. Buscar el código
    const inviteCode = await this.inviteCodeRepository.findByCode(code.trim().toUpperCase());
    
    if (!inviteCode) {
      throw InviteCodeErrors.codeNotFound(code);
    }

    // 3. Verificar si está usado
    const isUsed = inviteCode.isUsed();
    
    // 4. Verificar si está expirado (7 días)
    const isExpired = inviteCode.isExpired(168); // 7 días = 168 horas

    // 5. Calcular fecha de expiración
    const expiresAt = new Date(inviteCode.createdAt);
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 6. Determinar si es válido
    const isValid = !isUsed && !isExpired;

    // 7. Si no es válido para uso en registro, lanzar error específico
    if (isUsed) {
      throw InviteCodeErrors.codeAlreadyUsed(
        code, 
        inviteCode.user!.username, 
        inviteCode.usedAt!
      );
    }

    if (isExpired) {
      throw InviteCodeErrors.codeExpired(code, expiresAt);
    }

    // 8. Retornar información del código
    return {
      isValid,
      code: inviteCode.code,
      isUsed,
      isExpired,
      createdAt: inviteCode.createdAt,
      expiresAt,
      creator: inviteCode.creator ? {
        username: inviteCode.creator.username,
        role: inviteCode.creator.role
      } : undefined,
      usedBy: inviteCode.user ? {
        username: inviteCode.user.username,
        usedAt: inviteCode.usedAt!
      } : undefined
    };
  }

  private validateCodeFormat(code: string): void {
    if (!code || code.trim().length === 0) {
      throw ValidationErrors.requiredField('Invite code');
    }

    const trimmed = code.trim();

    if (trimmed.length < 6) {
      throw ValidationErrors.minLength('Invite code', 6);
    }

    if (trimmed.length > 20) {
      throw ValidationErrors.maxLength('Invite code', 20);
    }

    // Verificar que solo contenga caracteres válidos
    if (!/^[A-Za-z0-9-]+$/.test(trimmed)) {
      throw ValidationErrors.invalidFormat(
        'Invite code', 
        'alphanumeric characters and hyphens only'
      );
    }
  }
}