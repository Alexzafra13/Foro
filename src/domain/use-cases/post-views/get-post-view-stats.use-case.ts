// src/domain/use-cases/post-views/get-post-view-stats.use-case.ts
import { PostViewRepository } from '../../repositories/post-view.repository';
import { PostRepository } from '../../repositories/post.repository';
import { PostViewStats } from '../../datasources/post-view.datasource';
import { ValidationErrors, PostErrors, UserErrors } from '../../../shared/errors';

export interface GetPostViewStatsRequestDto {
  postId: number;
  userId: number; // Para verificar permisos
  userRole: string;
}

export interface GetPostViewStatsResponseDto extends PostViewStats {
  postTitle: string;
  postAuthor: string;
  recentViewers?: {
    userId: number;
    username: string;
    viewedAt: Date;
  }[];
}

interface GetPostViewStatsUseCase {
  execute(dto: GetPostViewStatsRequestDto): Promise<GetPostViewStatsResponseDto>;
}

export class GetPostViewStats implements GetPostViewStatsUseCase {
  constructor(
    private readonly postViewRepository: PostViewRepository,
    private readonly postRepository: PostRepository
  ) {}

  async execute(dto: GetPostViewStatsRequestDto): Promise<GetPostViewStatsResponseDto> {
    const { postId, userId, userRole } = dto;

    // 1. Validaciones básicas
    this.validateInput(dto);

    // 2. Verificar permisos (solo admin/moderator o autor del post)
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw PostErrors.postNotFound(postId);
    }

    const isAdmin = ['admin', 'moderator'].includes(userRole);
    const isAuthor = post.isAuthor(userId);

    if (!isAdmin && !isAuthor) {
      throw UserErrors.insufficientPermissions();
    }

    // 3. Obtener estadísticas completas
    const stats = await this.postViewRepository.getPostViewStats(postId);

    // 4. Si es admin, obtener también viewers recientes
    let recentViewers = undefined;
    if (isAdmin) {
      const recentViews = await this.postViewRepository.findMany({
        postId,
        viewedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Última semana
      });

      // Aquí podrías hacer un join con usuarios para obtener usernames
      // Por simplicidad, solo devolvemos los IDs
      recentViewers = recentViews.slice(0, 10).map(view => ({
        userId: view.userId,
        username: `User ${view.userId}`, // En una implementación real, harías join con User
        viewedAt: view.viewedAt
      }));
    }

    // 5. Formatear respuesta
    return {
      ...stats,
      postTitle: post.title,
      postAuthor: post.author?.username || 'Unknown',
      recentViewers
    };
  }

  private validateInput(dto: GetPostViewStatsRequestDto): void {
    if (!dto.postId || dto.postId <= 0) {
      throw ValidationErrors.requiredField('Post ID');
    }

    if (!dto.userId || dto.userId <= 0) {
      throw ValidationErrors.requiredField('User ID');
    }

    if (!dto.userRole || dto.userRole.trim().length === 0) {
      throw ValidationErrors.requiredField('User Role');
    }
  }
}