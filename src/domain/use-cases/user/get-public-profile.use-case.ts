// src/domain/use-cases/user/get-public-profile.use-case.ts
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

    // 2. Verificar si el usuario está baneado (solo mostrar a admins/mods)
    const viewerUser = viewerUserId ? await this.userRepository.findById(viewerUserId) : null;
    const canViewBannedUsers = viewerUser && ['admin', 'moderator'].includes(viewerUser.role?.name || '');
    
    if (user.isBanned && !canViewBannedUsers) {
      throw UserErrors.userNotFound(`Usuario '${username}' no encontrado`);
    }

    // 3. Obtener configuraciones de privacidad
    const userSettings = await this.getUserSettings(user.id);
    const isOwnProfile = viewerUserId === user.id;
    
    // 4. Si el perfil es privado y no es el propio usuario, retornar perfil limitado
    if (userSettings.privateProfile && !isOwnProfile && !canViewBannedUsers) {
      return {
        id: user.id,
        username: user.username,
        bio: null,
        avatarUrl: user.avatarUrl || null,
        reputation: user.reputation,
        role: user.role!,
        isEmailVerified: user.isEmailVerified || false,
        createdAt: user.createdAt,
        lastLoginAt: null,
        stats: {
          totalPosts: 0,
          totalComments: 0,
          totalVotes: 0,
          joinedDaysAgo: this.calculateJoinedDaysAgo(user.createdAt),
          lastActivityAt: null
        },
        isPrivateProfile: true,
        isOwnProfile: false
      };
    }

    // 5. Obtener estadísticas completas
    const stats = await this.getUserStats(user.id, user.createdAt);

    // 6. Construir perfil público completo
    const profile: PublicUserProfileDto = {
      id: user.id,
      username: user.username,
      bio: user.bio || null,
      avatarUrl: user.avatarUrl || null,
      reputation: user.reputation,
      role: user.role!,
      isEmailVerified: user.isEmailVerified || false,
      createdAt: user.createdAt,
      lastLoginAt: userSettings.showLastSeen ? (user.lastLoginAt || null) : null,
      stats,
      isPrivateProfile: false,
      isOwnProfile
    };

    // 7. Incluir email si está configurado para mostrarse públicamente
    if (userSettings.showEmail) {
      profile.email = user.email;
    }

    return profile;
  }

  private async getUserSettings(userId: number) {
    try {
      const settings = await this.userSettingsRepository.findByUserId(userId);
      return {
        privateProfile: settings?.privateProfile || false,
        showEmail: settings?.showEmail || false,
        showLastSeen: settings?.showLastSeen || true
      };
    } catch (error) {
      // Si no existen configuraciones, usar valores por defecto
      console.warn(`No settings found for user ${userId}, using defaults`);
      return {
        privateProfile: false,
        showEmail: false,
        showLastSeen: true
      };
    }
  }

  private async getUserStats(userId: number, userCreatedAt: Date): Promise<PublicUserStatsDto> {
    try {
      // Obtener conteos de posts y comentarios
      // Nota: Si no tienes estos métodos implementados, usar 0 por defecto
      let postsCount = 0;
      let commentsCount = 0;

      try {
        // Intentar obtener posts del usuario usando findMany
        const postsResult = await this.postRepository.findMany(
          { authorId: userId },
          { page: 1, limit: 1 }
        );
        postsCount = postsResult.pagination?.total || 0;
      } catch (error) {
        console.warn(`Could not get posts count for user ${userId}:`, error);
      }

      try {
        // Intentar obtener comentarios del usuario usando findMany
        const commentsResult = await this.commentRepository.findMany(
          { authorId: userId },
          { page: 1, limit: 1 }
        );
        commentsCount = commentsResult.pagination?.total || 0;
      } catch (error) {
        console.warn(`Could not get comments count for user ${userId}:`, error);
      }

      // Para los votos, usar 0 por ahora (implementar después)
      const votesCount = 0;

      // Calcular última actividad (último post o comentario)
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
      console.warn(`Error getting user stats for user ${userId}:`, error);
      return {
        totalPosts: 0,
        totalComments: 0,
        totalVotes: 0,
        joinedDaysAgo: this.calculateJoinedDaysAgo(userCreatedAt),
        lastActivityAt: null
      };
    }
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
        { page: 1, limit: 1 }
      );
      return comments.data.length > 0 ? comments.data[0] : null;
    } catch {
      return null;
    }
  }

  private calculateJoinedDaysAgo(createdAt: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}