// src/domain/use-cases/user/get-public-profile.use-case.ts - CON NUEVOS FILTROS DE PRIVACIDAD
import { UserRepository } from '../../repositories/user.repository';
import { UserSettingsRepository } from '../../repositories/user-settings.repository';
import { PostRepository } from '../../repositories/post.repository';
import { CommentRepository } from '../../repositories/comment.repository';
import { UserErrors } from '../../../shared/errors';

export interface GetPublicProfileRequestDto {
  username: string; // Username del perfil a ver
  viewerUserId?: number; // Usuario que está viendo (opcional, puede ser anónimo)
}

export interface PublicUserProfileDto {
  id: number;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  reputation: number;
  role: {
    id: number;
    name: string;
  };
  isEmailVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  stats: PublicUserStatsDto;
  
  // Campos opcionales según configuración de privacidad
  email?: string;
  
  // Metadatos
  isPrivateProfile: boolean;
  isOwnProfile: boolean; // Si es el perfil del propio usuario
  accessLevel: 'full' | 'limited' | 'restricted'; // Nuevo campo para indicar nivel de acceso
}

export interface PublicUserStatsDto {
  totalPosts: number;
  totalComments: number;
  totalVotes: number;
  joinedDaysAgo: number;
  lastActivityAt: Date | null;
}

interface GetPublicProfileUseCase {
  execute(dto: GetPublicProfileRequestDto): Promise<PublicUserProfileDto>;
}

export class GetPublicProfile implements GetPublicProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userSettingsRepository: UserSettingsRepository,
    private readonly postRepository: PostRepository,
    private readonly commentRepository: CommentRepository
  ) {}

  async execute(dto: GetPublicProfileRequestDto): Promise<PublicUserProfileDto> {
    const { username, viewerUserId } = dto;

    // 1. Obtener usuario por username
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw UserErrors.userNotFound(`Usuario '${username}' no encontrado`);
    }

    // 2. Obtener información del viewer
    const viewerUser = viewerUserId ? await this.userRepository.findById(viewerUserId) : null;
    const isOwnProfile = viewerUserId === user.id;
    
    // 3. Determinar permisos del viewer
    const viewerPermissions = this.getViewerPermissions(viewerUser);
    
    // 4. Verificar si el usuario está baneado (solo visible para admins/mods)
    if (user.isBanned && !viewerPermissions.canViewBannedUsers) {
      throw UserErrors.userNotFound(`Usuario '${username}' no encontrado`);
    }

    // 5. Obtener configuraciones de privacidad
    const userSettings = await this.getUserSettings(user.id);
    
    // 6. Determinar nivel de acceso
    const accessLevel = this.determineAccessLevel(userSettings, viewerPermissions, isOwnProfile);
    
    // 7. Si acceso denegado, lanzar error
    if (accessLevel === 'denied') {
      throw UserErrors.insufficientPermissions();
    }
    
    // 8. Construir perfil según nivel de acceso
    return this.buildProfileResponse(user, userSettings, accessLevel, isOwnProfile);
  }

  private getViewerPermissions(viewerUser: any) {
    const isAdmin = viewerUser?.role?.name === 'admin';
    const isModerator = viewerUser?.role?.name === 'moderator';
    const isAuthenticated = !!viewerUser;
    
    return {
      isAdmin,
      isModerator,
      isAuthenticated,
      canViewBannedUsers: isAdmin || isModerator,
      canBypassPrivacyRestrictions: isAdmin || isModerator
    };
  }

  private determineAccessLevel(userSettings: any, viewerPermissions: any, isOwnProfile: boolean): 'full' | 'limited' | 'restricted' | 'denied' {
    // El propio usuario siempre ve su perfil completo
    if (isOwnProfile) return 'full';
    
    // Admins/mods pueden saltarse algunas restricciones
    if (viewerPermissions.canBypassPrivacyRestrictions) return 'full';
    
    // Verificar restrictToModerators (más restrictivo)
    if (userSettings.restrictToModerators) {
      if (viewerPermissions.isModerator || viewerPermissions.isAdmin) {
        return 'full';
      }
      return 'denied'; // Completamente bloqueado para no-moderadores
    }
    
    // Verificar privateProfile (restrictivo medio)
    if (userSettings.privateProfile) {
      if (viewerPermissions.isAuthenticated) {
        return 'limited'; // Información básica para usuarios autenticados
      }
      return 'denied'; // Bloqueado para no autenticados
    }
    
    // Perfil público con posibles restricciones específicas
    return 'full';
  }

  private async buildProfileResponse(
    user: any, 
    userSettings: any, 
    accessLevel: 'full' | 'limited' | 'restricted', 
    isOwnProfile: boolean
  ): Promise<PublicUserProfileDto> {
    
    // Base del perfil que siempre se muestra
    const baseProfile = {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl || null,
      reputation: user.reputation,
      role: user.role!,
      isEmailVerified: user.isEmailVerified || false,
      isOwnProfile,
      accessLevel
    };

    // Perfil limitado (privateProfile = true)
    if (accessLevel === 'limited') {
      return {
        ...baseProfile,
        bio: null,
        createdAt: user.createdAt,
        lastLoginAt: null,
        stats: {
          totalPosts: 0,
          totalComments: 0,
          totalVotes: 0,
          joinedDaysAgo: this.calculateJoinedDaysAgo(user.createdAt),
          lastActivityAt: null
        },
        isPrivateProfile: true
      };
    }

    // Perfil completo - aplicar filtros específicos
    const stats = await this.getUserStats(user.id, user.createdAt, userSettings);
    
    const fullProfile: PublicUserProfileDto = {
      ...baseProfile,
      bio: user.bio || null,
      createdAt: user.createdAt, // ✅ CORREGIDO: Siempre mantener para cálculos, filtrar después
      lastLoginAt: userSettings.showLastSeen ? (user.lastLoginAt || null) : null,
      stats: userSettings.showStats ? stats : this.getEmptyStats(user.createdAt),
      isPrivateProfile: false
    };

    // Agregar email si está configurado para mostrarse
    if (userSettings.showEmail) {
      fullProfile.email = user.email;
    }

    // ✅ FILTRADO CORRECTO: Si showJoinDate es false, ocultar la fecha en el frontend
    if (!userSettings.showJoinDate) {
      // Para el frontend, enviamos una fecha muy genérica o null
      fullProfile.createdAt = new Date('2020-01-01'); // Fecha genérica
    }

    return fullProfile;
  }

  private async getUserSettings(userId: number) {
    try {
      const settings = await this.userSettingsRepository.findByUserId(userId);
      return {
        privateProfile: settings?.privateProfile || false,
        showEmail: settings?.showEmail || false,
        showLastSeen: settings?.showLastSeen || true,
        // Nuevas configuraciones
        showStats: settings?.showStats ?? true,
        showJoinDate: settings?.showJoinDate ?? true,
        restrictToModerators: settings?.restrictToModerators || false
      };
    } catch (error) {
      console.warn(`No settings found for user ${userId}, using defaults`);
      return {
        privateProfile: false,
        showEmail: false,
        showLastSeen: true,
        showStats: true,
        showJoinDate: true,
        restrictToModerators: false
      };
    }
  }

  private async getUserStats(userId: number, userCreatedAt: Date, userSettings: any): Promise<PublicUserStatsDto> {
    try {
      // Si showStats es false, retornar estadísticas vacías
      if (!userSettings.showStats) {
        return this.getEmptyStats(userCreatedAt);
      }

      // Obtener estadísticas reales
      let postsCount = 0;
      let commentsCount = 0;

      try {
        const postsResult = await this.postRepository.findMany(
          { authorId: userId },
          { page: 1, limit: 1 }
        );
        postsCount = postsResult.pagination?.total || 0;
      } catch (error) {
        console.warn(`Could not get posts count for user ${userId}:`, error);
      }

      try {
        const commentsResult = await this.commentRepository.findMany(
          { authorId: userId },
          { page: 1, limit: 1 }
        );
        commentsCount = commentsResult.pagination?.total || 0;
      } catch (error) {
        console.warn(`Could not get comments count for user ${userId}:`, error);
      }

      const votesCount = 0; // Implementar después si es necesario

      // Calcular última actividad
      const [lastPost, lastComment] = await Promise.all([
        this.getLatestPost(userId),
        this.getLatestComment(userId)
      ]);

      let lastActivityAt: Date | null = null;
      if (lastPost && lastComment) {
        lastActivityAt = lastPost.createdAt > lastComment.createdAt ? lastPost.createdAt : lastComment.createdAt;
      } else if (lastPost) {
        lastActivityAt = lastPost.createdAt;
      } else if (lastComment) {
        lastActivityAt = lastComment.createdAt;
      }

      return {
        totalPosts: postsCount,
        totalComments: commentsCount,
        totalVotes: votesCount,
        joinedDaysAgo: this.calculateJoinedDaysAgo(userCreatedAt),
        lastActivityAt
      };
    } catch (error) {
      console.error(`Error getting user stats for ${userId}:`, error);
      return this.getEmptyStats(userCreatedAt);
    }
  }

  private getEmptyStats(userCreatedAt: Date): PublicUserStatsDto {
    return {
      totalPosts: 0,
      totalComments: 0,
      totalVotes: 0,
      joinedDaysAgo: this.calculateJoinedDaysAgo(userCreatedAt),
      lastActivityAt: null
    };
  }

  private calculateJoinedDaysAgo(createdAt: Date): number {
    const now = new Date();
    const diffTime = now.getTime() - createdAt.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  private async getLatestPost(userId: number) {
    try {
      const posts = await this.postRepository.findMany(
        { authorId: userId }, 
        { page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' }
      );
      return posts.data.length > 0 ? posts.data[0] : null;
    } catch {
      return null;
    }
  }

  private async getLatestComment(userId: number) {
    try {
      const comments = await this.commentRepository.findMany(
        { authorId: userId }, 
        { page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' }
      );
      return comments.data.length > 0 ? comments.data[0] : null;
    } catch {
      return null;
    }
  }
}