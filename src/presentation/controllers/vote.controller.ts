import { Request, Response } from 'express';
import { VotePost } from '@/domain/votes/vote-post.use-case'; 
import { VoteComment } from '@/domain/votes/vote-comment.use-case'; 
import { CustomError, DomainError } from '../../shared/errors';

export class VoteController {
  constructor(
    private readonly votePostUseCase: VotePost,
    private readonly voteCommentUseCase: VoteComment
  ) {}

  // POST /api/posts/:id/vote
  async votePost(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.id);
      const { voteType } = req.body;
      const userId = req.user?.userId!;

      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid post ID'
        });
      }

      if (![1, -1].includes(voteType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid vote type. Use 1 for upvote or -1 for downvote'
        });
      }

      const result = await this.votePostUseCase.execute({
        postId,
        userId,
        voteType
      });

      res.json(result);
    } catch (error) {
      this.handleError(error, res, 'Error voting on post');
    }
  }

  // POST /api/comments/:id/vote
  async voteComment(req: Request, res: Response) {
    try {
      const commentId = parseInt(req.params.id);
      const { voteType } = req.body;
      const userId = req.user?.userId!;

      if (isNaN(commentId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid comment ID'
        });
      }

      if (![1, -1].includes(voteType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid vote type. Use 1 for upvote or -1 for downvote'
        });
      }

      const result = await this.voteCommentUseCase.execute({
        commentId,
        userId,
        voteType
      });

      res.json(result);
    } catch (error) {
      this.handleError(error, res, 'Error voting on comment');
    }
  }

  private handleError(error: any, res: Response, defaultMessage: string) {
    console.error(defaultMessage, error);
    
    if (error instanceof DomainError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: 'DomainError'
      });
    }

    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.name
      });
    }

    if (error.message) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
