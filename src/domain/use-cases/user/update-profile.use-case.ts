// src/domain/use-cases/user/update-profile.use-case.ts - VERSIÓN COMPLETA
import { UserRepository } from '../../repositories/user.repository';
import { ActivityLogRepository } from '../../repositories/activity-log.repository';
import { UserErrors, ValidationErrors } from '../../../shared/errors';
import { ActivityLogEntity } from '../../entities/activity-log.entity';

export interface UpdateProfileRequestDto {
  userId: number; // Del JWT
  username?: string;
  bio?: string;
  avatarUrl?: string;
  ipAddress?: string;
}

export interface UpdateProfileResponseDto {
  id: number;
  username: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  reputation: number;
  role: {
    id: number;
    name: string;
  };
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  changes: string[]; // Lista de campos que cambiaron
}

interface UpdateProfileUseCase {
  execute(dto: UpdateProfileRequestDto): Promise<UpdateProfileResponseDto>;
}

export class UpdateProfile implements UpdateProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly activityLogRepository: ActivityLogRepository
  ) {}

  async execute(dto: UpdateProfileRequestDto): Promise<UpdateProfileResponseDto> {
    const { userId, username, bio, avatarUrl, ipAddress } = dto;

    // 1. Verificar que el usuario existe
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw UserErrors.userNotFound(userId);
    }

    // 2. Verificar que el usuario no esté baneado
    if (existingUser.isBannedUser()) {
      throw UserErrors.insufficientPermissions();
    }

    // 3. Validar y preparar datos de actualización
    const updateData: any = {};
    const changes: string[] = [];

    // Validar y actualizar username si se proporciona
    if (username !== undefined) {
      await this.validateUsername(username, userId);
      if (username !== existingUser.username) {
        updateData.username = username.trim();
        changes.push('username');
      }
    }

    // Validar y actualizar bio si se proporciona
    if (bio !== undefined) {
      this.validateBio(bio);
      const trimmedBio = bio.trim() || null;
      if (trimmedBio !== existingUser.bio) {
        updateData.bio = trimmedBio;
        changes.push('bio');
      }
    }

    // Actualizar avatar si se proporciona
    if (avatarUrl !== undefined) {
      this.validateAvatarUrl(avatarUrl);
      if (avatarUrl !== existingUser.avatarUrl) {
        updateData.avatarUrl = avatarUrl;
        changes.push('avatar');
      }
    }

    // 4. Si no hay cambios, retornar usuario actual
    if (changes.length === 0) {
      return this.formatUserResponse(existingUser, changes);
    }

    // 5. Actualizar usuario en la base de datos
    const updatedUser = await this.userRepository.updateById(userId, updateData);

    // 6. Registrar actividad en el log
    try {
      const activityLog = ActivityLogEntity.createProfileUpdatedLog(
        userId, 
        changes, 
        ipAddress
      );
      await this.activityLogRepository.create(activityLog);
    } catch (error) {
      console.error('Error logging profile update activity:', error);
      // No fallar la operación por errores en el log
    }

    // 7. Retornar usuario actualizado
    return this.formatUserResponse(updatedUser, changes);
  }

  private async validateUsername(username: string, currentUserId: number): Promise<void> {
    // Validaciones básicas
    if (!username || username.trim().length < 3) {
      throw ValidationErrors.minLength('Username', 3);
    }

    if (username.trim().length > 32) {
      throw ValidationErrors.maxLength('Username', 32);
    }

    const trimmedUsername = username.trim();

    // Validar formato (solo letras, números, guiones y guiones bajos)
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      throw ValidationErrors.invalidFormat(
        'Username', 
        'letters, numbers, hyphens and underscores only'
      );
    }

    // Verificar que no existe otro usuario con el mismo username
    const existingUserWithUsername = await this.userRepository.findByUsername(trimmedUsername);
    if (existingUserWithUsername && existingUserWithUsername.id !== currentUserId) {
      throw UserErrors.usernameAlreadyExists(trimmedUsername);
    }
  }

  private validateBio(bio: string): void {
    if (bio && bio.trim().length > 500) {
      throw ValidationErrors.maxLength('Bio', 500);
    }

    // Validación básica de contenido inapropiado
    const forbiddenWords = ['spam', 'hack', 'phishing']; // Lista básica
    const lowerBio = bio.toLowerCase();
    
    for (const word of forbiddenWords) {
      if (lowerBio.includes(word)) {
        throw ValidationErrors.invalidFormat('Bio', 'appropriate content');
      }
    }
  }

  private validateAvatarUrl(avatarUrl: string): void {
    if (!avatarUrl) return;

    // Validar que sea una URL válida
    try {
      new URL(avatarUrl);
    } catch {
      throw ValidationErrors.invalidFormat('Avatar URL', 'valid URL');
    }

    // Validar longitud
    if (avatarUrl.length > 500) {
      throw ValidationErrors.maxLength('Avatar URL', 500);
    }

    // Validar que sea una imagen (extensiones permitidas)
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasValidExtension = validExtensions.some(ext => 
      avatarUrl.toLowerCase().includes(ext)
    );

    if (!hasValidExtension) {
      throw ValidationErrors.invalidFormat(
        'Avatar URL', 
        'image file (jpg, png, gif, webp)'
      );
    }
  }

  private formatUserResponse(user: any, changes: string[]): UpdateProfileResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      bio: user.bio || null,
      avatarUrl: user.avatarUrl || null,
      reputation: user.reputation,
      role: user.role!,
      isEmailVerified: user.isEmailVerified || false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt || new Date(),
      lastLoginAt: user.lastLoginAt || null,
      changes
    };
  }
}