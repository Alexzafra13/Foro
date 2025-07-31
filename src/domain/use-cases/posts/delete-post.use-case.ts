// src/domain/use-cases/posts/delete-post.use-case.ts - CORREGIDO
import { PostRepository } from '../../repositories/post.repository';
import { UserRepository } from '../../repositories/user.repository';
import { PostErrors, UserErrors } from '../../../shared/errors';

export interface DeletePostRequestDto {
  postId: number;
  userId: number; // Del JWT
}

export interface DeletePostResponseDto {
  id: number;
  title: string;
  deletedAt: Date;
  message: string;
}

interface DeletePostUseCase {
  execute(dto: DeletePostRequestDto): Promise<DeletePostResponseDto>;
}

// ✅ EXPORT AGREGADO
export class DeletePost implements DeletePostUseCase {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: DeletePostRequestDto): Promise<DeletePostResponseDto> {
    const { postId, userId } = dto;

    // 1. Validar que el post existe
    const existingPost = await this.postRepository.findById(postId);
    if (!existingPost) {
      throw PostErrors.postNotFound(postId);
    }

    // 2. Obtener información del usuario
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw UserErrors.userNotFound(userId);
    }

    // 3. Verificar permisos de eliminación
    if (!existingPost.canBeDeletedBy(userId, user.role!.name)) {
      throw UserErrors.insufficientPermissions();
    }

    // 4. Eliminar el post (esto también eliminará comentarios por CASCADE)
    const deletedPost = await this.postRepository.deleteById(postId);

    // 5. Retornar confirmación
    return {
      id: deletedPost.id,
      title: deletedPost.title,
      deletedAt: new Date(),
      message: 'Post deleted successfully'
    };
  }
}