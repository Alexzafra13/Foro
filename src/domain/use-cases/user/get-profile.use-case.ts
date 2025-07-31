// src/domain/use-cases/user/get-profile.use-case.ts - REEMPLAZAR COMPLETO
import { UserRepository } from '../../repositories/user.repository';
import { UserSettingsRepository } from '../../repositories/user-settings.repository';
import { PostRepository } from '../../repositories/post.repository';
import { CommentRepository } from '../../repositories/comment.repository';
import { UserErrors } from '../../../shared/errors';

export interface GetProfileRequestDto {
  userId: number; // Del JWT
  includeSettings?: boolean; // Si incluir configuraciones
  includeStats?: boolean; // Si incluir estadísticas
}

export interface UserProfileDto {
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
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  lastLoginAt: Date | null;
  settings?: UserSettingsDto;
  stats?: UserStatsDto;
}

export interface UserSettingsDto {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  emailNotifications: boolean;
  postNotifications: boolean;
  commentNotifications: boolean;
  privateProfile: boolean;
  showEmail: boolean;
  showLastSeen: boolean;
}

export interface UserStatsDto {
  totalPosts: number;
  totalComments: number;
  totalVotes: number;
  joinedDaysAgo: number;
  lastActivityAt: Date | null;
}

interface GetProfileUseCase {
  execute(dto: GetProfileRequestDto): Promise<UserProfileDto>;
}

export class GetProfile implements GetProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userSettingsRepository: UserSettingsRepository,
    private readonly postRepository: PostRepository,
    private readonly commentRepository: CommentRepository
  ) {}

  async execute(dto: GetProfileRequestDto): Promise<UserProfileDto> {
    const { userId, includeSettings = false, includeStats = false } = dto;

    // 1. Obtener usuario
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw UserErrors.userNotFound(userId);
    }

    // 2. Construir respuesta base
    const profile: UserProfileDto = {
      id: user.id,
      username: user.username,
      email: user.email,
      bio: user.bio || null,
      avatarUrl: user.avatarUrl || null,
      reputation: user.reputation,
      role: user.role!,
      isEmailVerified: user.isEmailVerified || false,
      emailVerifiedAt: user.emailVerifiedAt || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt || null,
      lastLoginAt: user.lastLoginAt || null
    };

    // 3. Incluir configuraciones si se solicita
    if (includeSettings) {
      profile.settings = await this.getUserSettings(userId);
    }

    // 4. Incluir estadísticas si se solicita
    if (includeStats) {
      profile.stats = await this.getUserStats(user);
    }

    return profile;
  }

  private async getUserSettings(userId: number): Promise<UserSettingsDto> {
    try {
      const settings = await this.userSettingsRepository.findByUserId(userId);
      
      if (!settings) {
        // Retornar configuraciones por defecto
        return {
          theme: 'system',
          language: 'es',
          timezone: 'UTC',
          emailNotifications: true,
          postNotifications: true,
          commentNotifications: true,
          privateProfile: false,
          showEmail: false,
          showLastSeen: true
        };
      }

      return {
        theme: settings.theme as 'light' | 'dark' | 'system',
        language: settings.language,
        timezone: settings.timezone,
        emailNotifications: settings.emailNotifications,
        postNotifications: settings.postNotifications,
        commentNotifications: settings.commentNotifications,
        privateProfile: settings.privateProfile,
        showEmail: settings.showEmail,
        showLastSeen: settings.showLastSeen
      };
    } catch (error) {
      console.error('Error fetching user settings:', error);
      // Retornar configuraciones por defecto en caso de error
      return {
        theme: 'system',
        language: 'es',
        timezone: 'UTC',
        emailNotifications: true,
        postNotifications: true,
        commentNotifications: true,
        privateProfile: false,
        showEmail: false,
        showLastSeen: true
      };
    }
  }

  private async getUserStats(user: any): Promise<UserStatsDto> {
    try {
      // ✅ ESTADÍSTICAS REALES DE LA BASE DE DATOS
      
      // 1. Contar posts del usuario
      const totalPosts = await this.postRepository.countByUserId(user.id);
      
      // 2. Contar comentarios del usuario  
      const totalComments = await this.commentRepository.countByUserId(user.id);
      
      // 3. Calcular días desde registro
      const joinedDate = new Date(user.createdAt);
      const now = new Date();
      const joinedDaysAgo = Math.floor((now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24));

      // 4. Calcular votos recibidos (suma de votos en posts)
      let totalVotes = 0;
      try {
        totalVotes = await this.postRepository.getTotalVotesForUser(user.id);
      } catch (error) {
        console.error('Error calculating votes:', error);
        totalVotes = 0;
      }

      return {
        totalPosts,
        totalComments,
        totalVotes,
        joinedDaysAgo,
        lastActivityAt: user.lastLoginAt
      };
    } catch (error) {
      console.error('Error calculating user stats:', error);
      return {
        totalPosts: 0,
        totalComments: 0,
        totalVotes: 0,
        joinedDaysAgo: 0,
        lastActivityAt: null
      };
    }
  }
}