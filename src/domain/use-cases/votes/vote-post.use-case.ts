// src/domain/use-cases/votes/vote-post.use-case.ts - CORREGIDO
import { VoteRepository } from '@/domain/repositories/vote.repository';
import { PostRepository } from '@/domain/repositories/post.repository';
import { UserRepository } from '@/domain/repositories/user.repository';
import { NotificationRepository } from '@/domain/repositories/notification.repository';
import { PostErrors, UserErrors } from '@/shared';

export interface VotePostRequestDto {
  postId: number;
  userId: number;
  voteType: 1 | -1; // 1 = upvote, -1 = downvote
}

export interface VotePostResponseDto {
  success: boolean;
  action: 'created' | 'updated' | 'removed';
  newVoteType: 1 | -1 | null;
  voteScore: number;
  userVote: 1 | -1 | null;
  message: string;
}

export class VotePost {
  constructor(
    private readonly voteRepository: VoteRepository,
    private readonly postRepository: PostRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationRepository?: NotificationRepository // ✅ AGREGAR OPCIONAL
  ) {}

  async execute(dto: VotePostRequestDto): Promise<VotePostResponseDto> {
    const { postId, userId, voteType } = dto;

    // Validaciones
    if (![1, -1].includes(voteType)) {
      throw new Error('Invalid vote type. Must be 1 (upvote) or -1 (downvote)');
    }

    // Verificar que el post existe
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw PostErrors.postNotFound(postId);
    }

    // Verificar que el usuario existe y está verificado
    const user = await this.userRepository.findById(userId);
    if (!user || !user.isEmailVerified) {
      throw UserErrors.insufficientPermissions();
    }

    // Verificar si ya existe un voto
    const existingVote = await this.voteRepository.findByUserAndPost(userId, postId);

    let action: 'created' | 'updated' | 'removed';
    let newVoteType: 1 | -1 | null;

    if (!existingVote) {
      // Crear nuevo voto
      await this.voteRepository.create({
        userId,
        postId,
        voteType
      });
      action = 'created';
      newVoteType = voteType;
    } else if (existingVote.voteType === voteType) {
      // Mismo voto = remover
      await this.voteRepository.deleteById(existingVote.id);
      action = 'removed';
      newVoteType = null;
    } else {
      // Cambiar voto
      await this.voteRepository.updateById(existingVote.id, { voteType });
      action = 'updated';
      newVoteType = voteType;
    }

    // Calcular nuevo score y actualizar reputación del autor
    const voteScore = await this.voteRepository.getPostVoteScore(postId);
   
    if (post.authorId) {
      await this.updateAuthorReputation(post.authorId, action, voteType, existingVote?.voteType);
    }

    // ✅ CORREGIDO: Validar que authorId no sea null/undefined
    if (this.notificationRepository && 
        post.authorId && // ✅ Verificar que authorId existe
        post.authorId !== userId && 
        action === 'created' && 
        voteType === 1) {
      
      try {
        const voter = await this.userRepository.findById(userId);
        
        await this.notificationRepository.create({
          userId: post.authorId, // ✅ Ahora sabemos que no es null
          type: 'post_vote',
          content: `${voter?.username || 'Alguien'} votó positivamente tu post`,
          relatedData: {
            postId: post.id,
            voteType: voteType,
            authorId: voter?.id,
            authorUsername: voter?.username,
            postTitle: post.title
          }
        });
      } catch (error) {
        console.error('Error creating vote notification:', error);
        // No lanzar error para no bloquear el voto
      }
    }

    const actionMessages = {
      created: voteType === 1 ? 'Upvote added' : 'Downvote added',
      updated: voteType === 1 ? 'Changed to upvote' : 'Changed to downvote',
      removed: 'Vote removed'
    };

    return {
      success: true,
      action,
      newVoteType,
      voteScore,
      userVote: newVoteType,
      message: actionMessages[action]
    };
  }

  private async updateAuthorReputation(
    authorId: number,
    action: 'created' | 'updated' | 'removed',
    newVoteType: 1 | -1,
    oldVoteType?: 1 | -1
  ) {
    try {
      const author = await this.userRepository.findById(authorId);
      if (!author) return;

      let reputationChange = 0;

      if (action === 'created') {
        reputationChange = newVoteType === 1 ? 5 : -2; // +5 por upvote, -2 por downvote
      } else if (action === 'updated') {
        // Revertir voto anterior y aplicar nuevo
        const oldChange = oldVoteType === 1 ? 5 : -2;
        const newChange = newVoteType === 1 ? 5 : -2;
        reputationChange = newChange - oldChange;
      } else if (action === 'removed') {
        // Revertir el cambio (usar oldVoteType si existe, sino newVoteType)
        const removedVoteType = oldVoteType || newVoteType;
        reputationChange = removedVoteType === 1 ? -5 : 2;
      }

      if (reputationChange !== 0) {
        const newReputation = Math.max(0, author.reputation + reputationChange);
        await this.userRepository.updateById(authorId, { reputation: newReputation });
      }
    } catch (error) {
      console.error('Error updating author reputation:', error);
      // No lanzar error para no bloquear el voto
    }
  }
}