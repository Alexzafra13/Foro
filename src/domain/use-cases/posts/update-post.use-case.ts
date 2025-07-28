import { PostRepository } from '../../repositories/post.repository';
import { UserRepository } from '../../repositories/user.repository';
import { PostEntity } from '../../entities/post.entity';
import { PostErrors, ValidationErrors, UserErrors } from '../../../shared/errors';

export interface UpdatePostRequestDto {
  postId: number;
  userId: number; // Del JWT
  title?: string;
  content?: string;
  isLocked?: boolean; // Solo admin/moderator
  isPinned?: boolean; // Solo admin/moderator
}

export interface UpdatePostResponseDto {
  id: number;
  title: string;
  content: string;
  isLocked: boolean;
  isPinned: boolean;
  updatedAt: Date;
}

interface UpdatePostUseCase {
  execute(dto: UpdatePostRequestDto): Promise<UpdatePostResponseDto>;
}

export class UpdatePost implements UpdatePostUseCase {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: UpdatePostRequestDto): Promise<UpdatePostResponseDto> {
    const { postId, userId, title, content, isLocked, isPinned } = dto;

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

    // 3. Verificar permisos de edición
    if (!existingPost.canBeEditedBy(userId, user.role!.name)) {
      if (existingPost.isLocked) {
        throw PostErrors.postIsLocked();
      }
      throw UserErrors.insufficientPermissions();
    }

    // 4. Validar campos a actualizar
    const updateData = this.buildUpdateData(dto, user.role!.name);

    // 5. Actualizar el post
    const updatedPost = await this.postRepository.updateById(postId, updateData);

    // 6. Retornar respuesta
    return {
      id: updatedPost.id,
      title: updatedPost.title,
      content: updatedPost.content,
      isLocked: updatedPost.isLocked,
      isPinned: updatedPost.isPinned,
      updatedAt: updatedPost.updatedAt!
    };
  }

  private buildUpdateData(dto: UpdatePostRequestDto, userRole: string) {
    const updateData: any = {};

    // Solo actualizar campos que fueron enviados
    if (dto.title !== undefined) {
      this.validateTitle(dto.title);
      updateData.title = dto.title.trim();
    }

    if (dto.content !== undefined) {
      this.validateContent(dto.content);
      updateData.content = dto.content.trim();
    }

    // Solo admin/moderator pueden cambiar estos campos
    if (['admin', 'moderator'].includes(userRole)) {
      if (dto.isLocked !== undefined) {
        updateData.isLocked = dto.isLocked;
      }

      if (dto.isPinned !== undefined) {
        updateData.isPinned = dto.isPinned;
      }
    }

    // Validar que al menos un campo fue enviado
    if (Object.keys(updateData).length === 0) {
      throw ValidationErrors.requiredField('At least one field to update');
    }

    return updateData;
  }

  private validateTitle(title: string): void {
    if (title.trim().length < 5) {
      throw ValidationErrors.minLength('Title', 5);
    }

    if (title.trim().length > 200) {
      throw ValidationErrors.maxLength('Title', 200);
    }
  }

  private validateContent(content: string): void {
    if (content.trim().length < 10) {
      throw ValidationErrors.minLength('Content', 10);
    }

    if (content.trim().length > 10000) {
      throw ValidationErrors.maxLength('Content', 10000);
    }
  }
}