import { CommentVoteRepository } from '@/domain/repositories/comment-vote.repository';
import { CommentRepository } from '@/domain/repositories/comment.repository'; 
import { UserRepository } from '@/domain/repositories/user.repository';
import { UserErrors } from '@/shared';

export interface VoteCommentRequestDto {
  commentId: number;
  userId: number;
  voteType: 1 | -1;
}

export interface VoteCommentResponseDto {
  success: boolean;
  action: 'created' | 'updated' | 'removed';
  newVoteType: 1 | -1 | null;
  voteScore: number;
  userVote: 1 | -1 | null;
  message: string;
}

export class VoteComment {
  constructor(
    private readonly commentVoteRepository: CommentVoteRepository,
    private readonly commentRepository: CommentRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: VoteCommentRequestDto): Promise<VoteCommentResponseDto> {
    const { commentId, userId, voteType } = dto;

    // Validaciones
    if (![1, -1].includes(voteType)) {
      throw new Error('Invalid vote type. Must be 1 (upvote) or -1 (downvote)');
    }

    // Verificar que el comentario existe
    const comment = await this.commentRepository.findById(commentId);
    if (!comment || comment.isDeleted) {
      throw new Error('Comment not found or deleted');
    }

    // Verificar que el usuario existe y está verificado
    const user = await this.userRepository.findById(userId);
    if (!user || !user.isEmailVerified) {
      throw UserErrors.insufficientPermissions();
    }

    // Verificar si ya existe un voto
    const existingVote = await this.commentVoteRepository.findByUserAndComment(userId, commentId);

    let action: 'created' | 'updated' | 'removed';
    let newVoteType: 1 | -1 | null;

    if (!existingVote) {
      // Crear nuevo voto
      await this.commentVoteRepository.create({
        userId,
        commentId,
        voteType
      });
      action = 'created';
      newVoteType = voteType;
    } else if (existingVote.voteType === voteType) {
      // Mismo voto = remover
      await this.commentVoteRepository.deleteById(existingVote.id);
      action = 'removed';
      newVoteType = null;
    } else {
      // Cambiar voto
      await this.commentVoteRepository.updateById(existingVote.id, { voteType });
      action = 'updated';
      newVoteType = voteType;
    }

    // Calcular nuevo score y actualizar reputación del autor
    const voteScore = await this.commentVoteRepository.getCommentVoteScore(commentId);
    
    if (comment.authorId) {
      await this.updateAuthorReputation(comment.authorId, action, voteType, existingVote?.voteType);
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
    const author = await this.userRepository.findById(authorId);
    if (!author) return;

    let reputationChange = 0;

    if (action === 'created') {
      reputationChange = newVoteType === 1 ? 2 : -1; // +2 por upvote, -1 por downvote (menos que posts)
    } else if (action === 'updated') {
      const oldChange = oldVoteType === 1 ? 2 : -1;
      const newChange = newVoteType === 1 ? 2 : -1;
      reputationChange = newChange - oldChange;
    } else if (action === 'removed') {
      reputationChange = newVoteType === 1 ? -2 : 1;
    }

    if (reputationChange !== 0) {
      const newReputation = Math.max(0, author.reputation + reputationChange);
      await this.userRepository.updateById(authorId, { reputation: newReputation });
    }
  }
}