// src/domain/use-cases/posts/get-post-detail.use-case.ts - ACTUALIZADO CON avatarUrl
import { PostRepository } from '../../repositories/post.repository';
import { PostEntity } from '../../entities/post.entity'; 
import { PostErrors, AuthErrors } from '../../../shared/errors';

export interface GetPostDetailRequestDto {
  postId: number;
  userId: number; // ✅ REQUERIDO (foro privado)
}

export interface PostDetailResponseDto {
  id: number;
  channelId: number;
  title: string;
  content: string;
  views: number; // ✅ AGREGAR VIEWS
  isLocked: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  author: {
    id: number;
    username: string;
    reputation: number;
    avatarUrl: string | null;
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
    views: number; // ✅ AGREGAR VIEWS EN STATS
  };
  voteScore: number;
  userVote: 1 | -1 | null;
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

    // ✅ VALIDAR AUTENTICACIÓN (foro privado)
    if (!userId) {
      throw AuthErrors.tokenRequired();
    }

    // 1. Buscar el post con toda la información CON userId
    const post = await this.postRepository.findById(postId, userId);
    if (!post) {
      throw PostErrors.postNotFound(postId);
    }

    // 2. Verificar permisos de lectura para canales privados adicionales
    if (post.channel?.isPrivate) {
      // Aquí podrías agregar lógica adicional para verificar membresía del canal
      // Por ahora, como es foro privado, todos los usuarios autenticados pueden ver
    }

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
  views: post.views || 0, // ✅ INCLUIR VIEWS
  isLocked: post.isLocked,
  isPinned: post.isPinned,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  author: post.author ? {
    id: post.author.id,
    username: post.author.username,
    reputation: post.author.reputation,
    avatarUrl: post.author.avatarUrl || null,
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
    voteScore: post.voteScore || 0,
    views: post.views || 0 // ✅ INCLUIR VIEWS EN STATS
  },
  voteScore: post.voteScore || 0,
  userVote: post.userVote || null,
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