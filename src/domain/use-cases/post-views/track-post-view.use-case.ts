// src/domain/use-cases/post-views/track-post-view.use-case.ts - CORREGIDO
import { PostViewRepository } from '../../repositories/post-view.repository';
import { PostRepository } from '../../repositories/post.repository';
import { PostViewStats } from '../../datasources/post-view.datasource';
import { ValidationErrors, PostErrors } from '../../../shared/errors';

export interface TrackPostViewRequestDto {
  userId: number;
  postId: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface TrackPostViewResponseDto {
  viewCreated: boolean;
  isFirstView: boolean;
  totalViews: number;
  uniqueViews: number;
  message: string;
}

interface TrackPostViewUseCase {
  execute(dto: TrackPostViewRequestDto): Promise<TrackPostViewResponseDto>;
}

export class TrackPostView implements TrackPostViewUseCase {
  constructor(
    private readonly postViewRepository: PostViewRepository,
    private readonly postRepository: PostRepository
  ) {}

  async execute(dto: TrackPostViewRequestDto): Promise<TrackPostViewResponseDto> {
    const { userId, postId, ipAddress, userAgent } = dto;

    // 1. Validaciones básicas
    this.validateInput(dto);

    // 2. Verificar que el post existe
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw PostErrors.postNotFound(postId);
    }

    // 3. ✅ CORREGIDO: Verificar si existe una vista previa (no por día, sino en general)
    const existingView = await this.postViewRepository.findByUserAndPost(userId, postId);
    const isFirstView = !existingView;
    
    let viewCreated = false;

    // 4. ✅ CORREGIDO: Solo crear vista si es la primera vez
    if (isFirstView) {
      // Crear nueva vista (el datasource usa upsert, así que es seguro)
      await this.postViewRepository.create({
        userId,
        postId,
        ipAddress,
        userAgent
      });

      viewCreated = true;

      // 5. Actualizar contador de vistas únicas en el post
      const uniqueViews = await this.postViewRepository.countUniqueViewsForPost(postId);
      await this.postRepository.updateViews(postId, uniqueViews);
    }

    // 6. Obtener estadísticas actuales
    const stats = await this.postViewRepository.getPostViewStats(postId);

    // 7. Retornar respuesta
    return {
      viewCreated,
      isFirstView,
      totalViews: stats.totalViews,
      uniqueViews: stats.uniqueViews,
      message: isFirstView 
        ? 'First view registered for this post'
        : 'View already registered for this post'
    };
  }

  // ✅ Método adicional para obtener estadísticas
  async getPostViewStats(postId: number): Promise<PostViewStats> {
    return await this.postViewRepository.getPostViewStats(postId);
  }

  private validateInput(dto: TrackPostViewRequestDto): void {
    if (!dto.userId || dto.userId <= 0) {
      throw ValidationErrors.requiredField('User ID');
    }

    if (!dto.postId || dto.postId <= 0) {
      throw ValidationErrors.requiredField('Post ID');
    }

    // Validar IP si se proporciona
    if (dto.ipAddress && dto.ipAddress.length > 45) {
      throw ValidationErrors.maxLength('IP Address', 45);
    }

    // Validar User Agent si se proporciona
    if (dto.userAgent && dto.userAgent.length > 1000) {
      throw ValidationErrors.maxLength('User Agent', 1000);
    }
  }
}