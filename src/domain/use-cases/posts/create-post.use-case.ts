import { PostRepository } from '../../repositories/post.repository';
import { UserRepository } from '../../repositories/user.repository';
import { PostEntity } from '../../entities/post.entity';
import { PostErrors, ValidationErrors, UserErrors } from '../../../shared/errors';

export interface CreatePostRequestDto {
  channelId: number;
  title: string;
  content: string;
  authorId: number; // Viene del JWT del middleware
}

export interface CreatePostResponseDto {
  id: number;
  channelId: number;
  title: string;
  content: string;
  isLocked: boolean;
  isPinned: boolean;
  createdAt: Date;
  author: {
    id: number;
    username: string;
    reputation: number;
    role: {
      id: number;
      name: string;
    };
  };
  channel: {
    id: number;
    name: string;
    isPrivate: boolean;
  };
}

interface CreatePostUseCase {
  execute(dto: CreatePostRequestDto): Promise<CreatePostResponseDto>;
}

export class CreatePost implements CreatePostUseCase {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: CreatePostRequestDto): Promise<CreatePostResponseDto> {
    const { channelId, title, content, authorId } = dto;

    // 1. Validaciones básicas
    this.validateInput(title, content, channelId);

    // 2. Verificar que el usuario existe
    const author = await this.userRepository.findById(authorId);
    if (!author) {
      throw UserErrors.userNotFound(authorId);
    }

    // 3. TODO: Verificar permisos del canal (por ahora asumimos que puede)
    // En el futuro aquí validaremos:
    // - Si el canal existe
    // - Si es privado, que el usuario sea miembro
    // - Si el usuario tiene permisos para postear

    // 4. Crear el post
    const newPost = await this.postRepository.create({
      channelId,
      authorId,
      title: title.trim(),
      content: content.trim()
    });

    // 5. Retornar respuesta formateada
    return {
      id: newPost.id,
      channelId: newPost.channelId,
      title: newPost.title,
      content: newPost.content,
      isLocked: newPost.isLocked,
      isPinned: newPost.isPinned,
      createdAt: newPost.createdAt,
      author: {
        id: author.id,
        username: author.username,
        reputation: author.reputation,
        role: author.role!
      },
      channel: newPost.channel!
    };
  }

  private validateInput(title: string, content: string, channelId: number): void {
    // Validar título
    if (!title || title.trim().length === 0) {
      throw ValidationErrors.requiredField('Title');
    }

    if (title.trim().length < 5) {
      throw ValidationErrors.minLength('Title', 5);
    }

    if (title.trim().length > 200) {
      throw ValidationErrors.maxLength('Title', 200);
    }

    // Validar contenido
    if (!content || content.trim().length === 0) {
      throw ValidationErrors.requiredField('Content');
    }

    if (content.trim().length < 10) {
      throw ValidationErrors.minLength('Content', 10);
    }

    if (content.trim().length > 10000) {
      throw ValidationErrors.maxLength('Content', 10000);
    }

    // Validar channelId
    if (!channelId || channelId <= 0) {
      throw ValidationErrors.requiredField('Channel ID');
    }
  }
}