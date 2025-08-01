// src/domain/use-cases/invites/generate-invite-code.use-case.ts - COMPLETO

import { InviteCodeRepository } from '../../repositories/invite-code.repository';
import { UserRepository } from '../../repositories/user.repository';
import { UserErrors, ValidationErrors } from '../../../shared/errors';

export interface GenerateInviteCodeRequestDto {
  createdBy: number; // ID del admin/moderator
  customCode?: string; // Código personalizado opcional
}

export interface GenerateInviteCodeResponseDto {
  code: string;
  createdBy: number;
  createdAt: Date;
  expiresAt: Date;
  creator: {
    id: number;
    username: string;
    role: string;
  };
}

interface GenerateInviteCodeUseCase {
  execute(dto: GenerateInviteCodeRequestDto): Promise<GenerateInviteCodeResponseDto>;
}

export class GenerateInviteCode implements GenerateInviteCodeUseCase {
  constructor(
    private readonly inviteCodeRepository: InviteCodeRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: GenerateInviteCodeRequestDto): Promise<GenerateInviteCodeResponseDto> {
    const { createdBy, customCode } = dto;

    // 1. Verificar que el usuario existe y tiene permisos
    const creator = await this.userRepository.findById(createdBy);
    if (!creator) {
      throw UserErrors.userNotFound(createdBy);
    }

    // Solo admin y moderators pueden generar códigos
    if (!['admin', 'moderator'].includes(creator.role!.name)) {
      throw UserErrors.insufficientPermissions();
    }

    // 2. Generar o validar código
    const code = customCode ? this.validateCustomCode(customCode) : this.generateSecureCode();

    // 3. Verificar que el código no existe
    const existingCode = await this.inviteCodeRepository.findByCode(code);
    if (existingCode) {
      throw ValidationErrors.invalidFormat('Code', 'unique code (already exists)');
    }

    // 4. Crear el código de invitación
    const inviteCode = await this.inviteCodeRepository.create({
      code,
      createdBy
    });

    // 5. Calcular fecha de expiración (7 días)
    const expiresAt = new Date(inviteCode.createdAt);
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 6. Retornar respuesta
    return {
      code: inviteCode.code,
      createdBy: inviteCode.createdBy!,
      createdAt: inviteCode.createdAt,
      expiresAt,
      creator: {
        id: creator.id,
        username: creator.username,
        role: creator.role!.name
      }
    };
  }

  private generateSecureCode(): string {
    // Genera un código de 12 caracteres: 3 grupos de 4 separados por guiones
    // Ejemplo: ABCD-1234-EFGH
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < 3; i++) {
      if (i > 0) code += '-';
      for (let j = 0; j < 4; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    
    return code;
  }

  private validateCustomCode(customCode: string): string {
    const trimmed = customCode.trim().toUpperCase();

    // Validaciones del código personalizado
    if (trimmed.length < 6) {
      throw ValidationErrors.minLength('Custom code', 6);
    }

    if (trimmed.length > 20) {
      throw ValidationErrors.maxLength('Custom code', 20);
    }

    // Solo permitir letras, números y guiones
    if (!/^[A-Z0-9-]+$/.test(trimmed)) {
      throw ValidationErrors.invalidFormat(
        'Custom code', 
        'alphanumeric characters and hyphens only'
      );
    }

    // No debe empezar o terminar con guión
    if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
      throw ValidationErrors.invalidFormat(
        'Custom code', 
        'cannot start or end with hyphen'
      );
    }

    // No debe tener guiones consecutivos
    if (trimmed.includes('--')) {
      throw ValidationErrors.invalidFormat(
        'Custom code', 
        'cannot have consecutive hyphens'
      );
    }

    return trimmed;
  }
}