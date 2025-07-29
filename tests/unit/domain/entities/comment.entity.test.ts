import { CommentEntity } from '@/domain/entities/comment.entity';

describe('CommentEntity', () => {
  const validCommentData = {
    id: 1,
    postId: 1,
    authorId: 1,
    parentCommentId: null,
    content: 'This is a test comment',
    isEdited: false,
    editedAt: null,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    isHidden: false,
    createdAt: new Date(),
    updatedAt: null,
    author: {
      id: 1,
      username: 'testuser',
      reputation: 100,
      role: { id: 3, name: 'user' }
    },
    _count: {
      votes: 5,
      replies: 2
    },
    voteScore: 3
  };

  describe('constructor', () => {
    it('should create a comment entity with all properties', () => {
      // Act
      const comment = new CommentEntity(
        validCommentData.id,
        validCommentData.postId,
        validCommentData.authorId,
        validCommentData.parentCommentId,
        validCommentData.content,
        validCommentData.isEdited,
        validCommentData.editedAt,
        validCommentData.isDeleted,
        validCommentData.deletedAt,
        validCommentData.deletedBy,
        validCommentData.deletionReason,
        validCommentData.isHidden,
        validCommentData.createdAt,
        validCommentData.updatedAt,
        validCommentData.author,
        undefined, // parentComment
        undefined, // replies
        validCommentData._count,
        validCommentData.voteScore
      );

      // Assert
      expect(comment.id).toBe(validCommentData.id);
      expect(comment.postId).toBe(validCommentData.postId);
      expect(comment.authorId).toBe(validCommentData.authorId);
      expect(comment.content).toBe(validCommentData.content);
      expect(comment.isEdited).toBe(false);
      expect(comment.isDeleted).toBe(false);
      expect(comment.isHidden).toBe(false);
      expect(comment.voteScore).toBe(validCommentData.voteScore);
    });
  });

  describe('fromObject', () => {
    it('should create a comment entity from a valid object', () => {
      // Act
      const comment = CommentEntity.fromObject(validCommentData);

      // Assert
      expect(comment).toBeInstanceOf(CommentEntity);
      expect(comment.id).toBe(validCommentData.id);
      expect(comment.postId).toBe(validCommentData.postId);
      expect(comment.content).toBe(validCommentData.content);
      expect(comment.author).toBe(validCommentData.author);
    });

    it('should throw error if id is missing', () => {
      // Arrange
      const dataWithoutId = { ...validCommentData };
      delete (dataWithoutId as any).id;

      // Act & Assert
      expect(() => CommentEntity.fromObject(dataWithoutId))
        .toThrow('Comment id is required');
    });

    it('should throw error if postId is missing', () => {
      // Arrange
      const dataWithoutPostId = { ...validCommentData };
      delete (dataWithoutPostId as any).postId;

      // Act & Assert
      expect(() => CommentEntity.fromObject(dataWithoutPostId))
        .toThrow('Comment postId is required');
    });

    it('should throw error if content is missing', () => {
      // Arrange
      const dataWithoutContent = { ...validCommentData };
      delete (dataWithoutContent as any).content;

      // Act & Assert
      expect(() => CommentEntity.fromObject(dataWithoutContent))
        .toThrow('Comment content is required');
    });
  });

  describe('domain methods', () => {
    let comment: CommentEntity;

    beforeEach(() => {
      comment = CommentEntity.fromObject(validCommentData);
    });

    describe('isAuthor', () => {
      it('should return true if user is the author', () => {
        expect(comment.isAuthor(1)).toBe(true);
      });

      it('should return false if user is not the author', () => {
        expect(comment.isAuthor(2)).toBe(false);
      });
    });

    describe('canBeEditedBy', () => {
      it('should allow author to edit their comment', () => {
        expect(comment.canBeEditedBy(1, 'user')).toBe(true);
      });

      it('should not allow non-author to edit comment', () => {
        expect(comment.canBeEditedBy(2, 'user')).toBe(false);
      });

      it('should not allow editing deleted comments', () => {
        comment.isDeleted = true;
        expect(comment.canBeEditedBy(1, 'user')).toBe(false);
      });

      it('should not allow editing hidden comments', () => {
        comment.isHidden = true;
        expect(comment.canBeEditedBy(1, 'user')).toBe(false);
      });
    });

    describe('canBeDeletedBy', () => {
      it('should allow author to delete their comment', () => {
        expect(comment.canBeDeletedBy(1, 'user')).toBe(true);
      });

      it('should allow admin to delete any comment', () => {
        expect(comment.canBeDeletedBy(2, 'admin')).toBe(true);
      });

      it('should allow moderator to delete any comment', () => {
        expect(comment.canBeDeletedBy(2, 'moderator')).toBe(true);
      });

      it('should not allow regular user to delete others comments', () => {
        expect(comment.canBeDeletedBy(2, 'user')).toBe(false);
      });

      it('should not allow deleting already deleted comments', () => {
        comment.isDeleted = true;
        expect(comment.canBeDeletedBy(1, 'user')).toBe(false);
      });
    });

    describe('canBeVotedBy', () => {
      it('should allow voting on other users comments', () => {
        expect(comment.canBeVotedBy(2)).toBe(true);
      });

      it('should not allow voting on own comment', () => {
        expect(comment.canBeVotedBy(1)).toBe(false);
      });

      it('should not allow voting on deleted comments', () => {
        comment.isDeleted = true;
        expect(comment.canBeVotedBy(2)).toBe(false);
      });

      it('should not allow voting on hidden comments', () => {
        comment.isHidden = true;
        expect(comment.canBeVotedBy(2)).toBe(false);
      });
    });

    describe('markAsEdited', () => {
      it('should mark comment as edited with timestamp', () => {
        // Arrange
        const beforeEdit = new Date();

        // Act
        comment.markAsEdited();

        // Assert
        expect(comment.isEdited).toBe(true);
        expect(comment.editedAt).toBeInstanceOf(Date);
        expect(comment.editedAt!.getTime()).toBeGreaterThanOrEqual(beforeEdit.getTime());
        expect(comment.updatedAt).toBeInstanceOf(Date);
      });
    });

    describe('markAsDeleted', () => {
      it('should mark comment as deleted with metadata', () => {
        // Act
        comment.markAsDeleted(2, 'user_request');

        // Assert
        expect(comment.isDeleted).toBe(true);
        expect(comment.deletedBy).toBe(2);
        expect(comment.deletionReason).toBe('user_request');
        expect(comment.deletedAt).toBeInstanceOf(Date);
      });
    });

    describe('hideByModeration', () => {
      it('should hide comment by moderation', () => {
        // Act
        comment.hideByModeration(2);

        // Assert
        expect(comment.isHidden).toBe(true);
        expect(comment.deletedBy).toBe(2);
        expect(comment.deletionReason).toBe('moderation');
      });
    });

    describe('isVisible', () => {
      it('should return true for normal comments', () => {
        expect(comment.isVisible()).toBe(true);
      });

      it('should return false for deleted comments', () => {
        comment.isDeleted = true;
        expect(comment.isVisible()).toBe(false);
      });

      it('should return false for hidden comments', () => {
        comment.isHidden = true;
        expect(comment.isVisible()).toBe(false);
      });
    });

    describe('getDisplayContent', () => {
      it('should return original content for normal comments', () => {
        expect(comment.getDisplayContent()).toBe('This is a test comment');
      });

      it('should return deletion message for deleted comments', () => {
        comment.isDeleted = true;
        expect(comment.getDisplayContent()).toBe('[Comentario eliminado]');
      });

      it('should return moderation message for deleted by moderation', () => {
        comment.isDeleted = true;
        comment.deletionReason = 'moderation';
        expect(comment.getDisplayContent()).toBe('[Este comentario ha sido eliminado por moderación]');
      });

      it('should return hidden message for hidden comments', () => {
        comment.isHidden = true;
        expect(comment.getDisplayContent()).toBe('[Este comentario ha sido ocultado por moderación]');
      });
    });

    describe('isReply', () => {
      it('should return false for root comments', () => {
        expect(comment.isReply()).toBe(false);
      });

      it('should return true for reply comments', () => {
        comment.parentCommentId = 123;
        expect(comment.isReply()).toBe(true);
      });
    });

    describe('hasReplies', () => {
      it('should return true when comment has replies', () => {
        expect(comment.hasReplies()).toBe(true); // _count.replies = 2
      });

      it('should return false when comment has no replies', () => {
        comment._count = { votes: 5, replies: 0 };
        expect(comment.hasReplies()).toBe(false);
      });

      it('should return false when _count is undefined', () => {
        comment._count = undefined;
        expect(comment.hasReplies()).toBe(false);
      });
    });

    describe('time-related methods', () => {
      beforeEach(() => {
        // Mock de una fecha conocida para tests consistentes
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      describe('getMinutesSinceCreation', () => {
        it('should calculate minutes since creation correctly', () => {
          // Arrange - comentario creado hace 30 minutos
          comment.createdAt = new Date('2024-01-01T11:30:00Z');

          // Act & Assert
          expect(comment.getMinutesSinceCreation()).toBe(30);
        });
      });

      describe('canStillBeEdited', () => {
        it('should allow editing within time limit', () => {
          // Arrange - comentario creado hace 15 minutos
          comment.createdAt = new Date('2024-01-01T11:45:00Z');

          // Act & Assert
          expect(comment.canStillBeEdited(30)).toBe(true);
        });

        it('should not allow editing after time limit', () => {
          // Arrange - comentario creado hace 45 minutos
          comment.createdAt = new Date('2024-01-01T11:15:00Z');

          // Act & Assert
          expect(comment.canStillBeEdited(30)).toBe(false);
        });

        it('should use default 30 minutes if no limit specified', () => {
          // Arrange - comentario creado hace 45 minutos
          comment.createdAt = new Date('2024-01-01T11:15:00Z');

          // Act & Assert
          expect(comment.canStillBeEdited()).toBe(false);
        });
      });
    });
  });
});