
import { PostRepository } from '../../repositories/post.repository';
import { PostEntity } from '../../entities/post.entity'; 
import { PostErrors, AuthErrors } from '../../../shared/errors';

export interface GetPostDetailRequestDto {
  postId: number;
  userId: number; // ✅ AHORA REQUERIDO (no opcional)
}

export interface PostDetailResponseDto {
  id: number;
  channelId: number;
  title: string;
  content: string;
  isLocked: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  author: {
    id: number;
    username: string;
    reputation: number;
    role: {
      id: number;
      name: string;
    };
  } | null;
  channel: {
    id: number;
    name: string;
    isPrivate: boolean;
  };
  stats: {
    comments: number;
    votes: number;
    voteScore: number;
  };
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canVote: boolean;
    canComment: boolean;
  };
}

interface GetPostDetailUseCase {
  execute(dto: GetPostDetailRequestDto): Promise<PostDetailResponseDto>;
}

export class GetPostDetail implements GetPostDetailUseCase {
  constructor(private readonly postRepository: PostRepository) {}

  async execute(dto: GetPostDetailRequestDto): Promise<PostDetailResponseDto> {
    const { postId, userId } = dto;

    // ✅ NUEVO: Verificar que el usuario esté autenticado
    if (!userId) {
      throw AuthErrors.tokenRequired();
    }

    // 1. Buscar el post con toda la información
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw PostErrors.postNotFound(postId);
    }

    // 2. TODO: Verificar permisos de lectura (canal privado, etc.)
    // Por ahora: solo usuarios autenticados pueden ver posts

    // 3. Incrementar contador de vistas (async, no bloqueante)
    this.postRepository.incrementViews(postId).catch(error => {
      console.error('Error incrementing post views:', error);
    });

    // 4. Calcular permisos del usuario actual
    const permissions = this.calculatePermissions(post, userId);

    // 5. Formatear y retornar respuesta
    return {
      id: post.id,
      channelId: post.channelId,
      title: post.title,
      content: post.content,
      isLocked: post.isLocked,
      isPinned: post.isPinned,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author ? {
        id: post.author.id,
        username: post.author.username,
        reputation: post.author.reputation,
        role: post.author.role
      } : null,
      channel: {
        id: post.channel!.id,
        name: post.channel!.name,
        isPrivate: post.channel!.isPrivate
      },
      stats: {
        comments: post._count?.comments || 0,
        votes: post._count?.votes || 0,
        voteScore: post.voteScore || 0
      },
      permissions
    };
  }

  private calculatePermissions(post: PostEntity, userId: number) {
    const isAuthor = post.isAuthor(userId);
    const canInteract = !post.isLocked; // Los posts bloqueados no permiten interacción

    return {
      canEdit: isAuthor && canInteract,
      canDelete: isAuthor, // Los autores siempre pueden eliminar
      canVote: !isAuthor && canInteract, // No puedes votar tus propios posts
      canComment: canInteract
    };
  }
}