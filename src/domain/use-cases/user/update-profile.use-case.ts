// src/domain/use-cases/user/update-profile.use-case.ts - VALIDACIÓN CORREGIDA
import { UserRepository } from '../../repositories/user.repository';
import { ActivityLogRepository } from '../../repositories/activity-log.repository';
import { UserErrors, ValidationErrors } from '../../../shared/errors';
import { ActivityLogEntity } from '../../entities/activity-log.entity';

export interface UpdateProfileRequestDto {
  userId: number; // Del JWT
  username?: string;
  bio?: string | null;
  avatarUrl?: string | null;
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
      const trimmedBio = bio?.trim() || null;
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

  private validateBio(bio: string | null): void {
    // Si bio es null, undefined o string vacío, no hacer validaciones
    if (!bio) {
      return;
    }

    if (bio.trim().length > 500) {
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

  // 🔧 VALIDACIÓN CORREGIDA PARA AVATARES
  private validateAvatarUrl(avatarUrl: string | null): void {
    if (!avatarUrl) return;

    console.log('🔍 Validating avatar URL:', avatarUrl);

    // Validar longitud máxima
    if (avatarUrl.length > 500) {
      throw ValidationErrors.maxLength('Avatar URL', 500);
    }

    // Lista de extensiones de imagen válidas
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

    // 🆕 VALIDACIÓN INTELIGENTE: Distinguir entre archivos internos y URLs externas
    
    // CASO 1: Archivos internos del servidor (uploads)
    if (avatarUrl.startsWith('/uploads/') || avatarUrl.includes('/uploads/')) {
      console.log('✅ Internal upload file detected:', avatarUrl);
      
      // Validaciones adicionales para archivos internos
      if (avatarUrl.includes('..') || avatarUrl.includes('<') || avatarUrl.includes('>')) {
        throw ValidationErrors.invalidFormat('Avatar URL', 'secure file path');
      }
      
      return; // Válido - es un archivo interno del servidor
    }

    // CASO 2: URLs externas - validar como URL completa
    try {
      const urlObj = new URL(avatarUrl);
      
      // Validar que sea HTTP/HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw ValidationErrors.invalidFormat('Avatar URL', 'HTTP or HTTPS URL');
      }
      
      // Validar que no sea localhost o IPs privadas (seguridad)
      const hostname = urlObj.hostname.toLowerCase();
      const privatePatterns = [
        /^localhost$/,
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[01])\./,
        /^192\.168\./,
        /^0\./,
        /^169\.254\./,
        /^::1$/,
        /^fc00:/,
        /^fe80:/
      ];
      
      if (privatePatterns.some(pattern => pattern.test(hostname))) {
        throw ValidationErrors.invalidFormat('Avatar URL', 'public URL (private IPs not allowed)');
      }
      
      console.log('✅ Valid external URL:', avatarUrl);
      return; // Válido - URL externa correcta
      
    } catch (urlError) {
      // CASO 3: Podría ser una ruta relativa sin / inicial
      if (avatarUrl.startsWith('uploads/')) {
        console.log('✅ Relative upload path detected:', avatarUrl);
        
        // Validaciones de seguridad para rutas relativas
        if (avatarUrl.includes('..') || avatarUrl.includes('<') || avatarUrl.includes('>')) {
          throw ValidationErrors.invalidFormat('Avatar URL', 'secure file path');
        }
        
        return; // Válido - ruta relativa de uploads
      }
      
      // Si llegamos aquí, no es ni URL válida ni ruta interna
      console.error('❌ Invalid avatar URL format:', avatarUrl, urlError);
      throw ValidationErrors.invalidFormat(
        'Avatar URL', 
        'valid URL or internal file path'
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