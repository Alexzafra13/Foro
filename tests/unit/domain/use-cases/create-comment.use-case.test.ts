import { CreateComment } from '@/domain/use-cases/comments/create-comment.use-case';
import { CommentRepository } from '@/domain/repositories/comment.repository';
import { UserRepository } from '@/domain/repositories/user.repository';
import { PostRepository } from '@/domain/repositories/post.repository';
import { ValidationErrors, UserErrors, PostErrors } from '@/shared/errors';
import { TestFactory } from '../../../helpers/factories';

describe('CreateComment Use Case', () => {
  let createComment: CreateComment;
  let mockCommentRepository: jest.Mocked<CommentRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockPostRepository: jest.Mocked<PostRepository>;

  beforeEach(() => {
    mockCommentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      findByPostId: jest.fn(),
      findReplies: jest.fn(),
      getCommentStats: jest.fn(),
    };

    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
    };

    mockPostRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      incrementViews: jest.fn(),
    };

    createComment = new CreateComment(
      mockCommentRepository,
      mockUserRepository,
      mockPostRepository
    );

    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validCreateCommentDto = {
      postId: 1,
      content: 'This is a test comment that meets the minimum length requirement.',
      authorId: 1,
      parentCommentId: undefined
    };

    const mockAuthor = TestFactory.createVerifiedUser(); // Usuario verificado
    const mockPost = TestFactory.createPostEntity({
      id: 1,
      isLocked: false
    });

    const mockComment = {
      id: 1,
      postId: 1,
      authorId: 1,
      parentCommentId: null,
      content: validCreateCommentDto.content,
      isEdited: false,
      editedAt: null,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
      isHidden: false,
      createdAt: new Date(),
      updatedAt: null,
      author: mockAuthor,
      _count: { votes: 0, replies: 0 },
      voteScore: 0,
      isReply: () => false,
      parentComment: undefined
    };

    it('should create a comment successfully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockAuthor);
      mockPostRepository.findById.mockResolvedValue(mockPost);
      mockCommentRepository.create.mockResolvedValue(mockComment as any);

      // Act
      const result = await createComment.execute(validCreateCommentDto);

      // Assert
      expect(result).toEqual({
        id: mockComment.id,
        postId: mockComment.postId,
        content: mockComment.content,
        isReply: false,
        parentCommentId: null,
        createdAt: mockComment.createdAt,
        author: {
          id: mockAuthor.id,
          username: mockAuthor.username,
          reputation: mockAuthor.reputation,
          role: mockAuthor.role!
        },
        parentComment: undefined,
        stats: {
          voteScore: 0,
          repliesCount: 0
        }
      });

      expect(mockUserRepository.findById).toHaveBeenCalledWith(validCreateCommentDto.authorId);
      expect(mockPostRepository.findById).toHaveBeenCalledWith(validCreateCommentDto.postId);
      expect(mockCommentRepository.create).toHaveBeenCalledWith({
        postId: validCreateCommentDto.postId,
        authorId: validCreateCommentDto.authorId,
        content: validCreateCommentDto.content.trim(),
        parentCommentId: undefined
      });
    });

    it('should throw error if user does not exist', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(createComment.execute(validCreateCommentDto))
        .rejects
        .toThrow(UserErrors.userNotFound(validCreateCommentDto.authorId));

      expect(mockPostRepository.findById).not.toHaveBeenCalled();
      expect(mockCommentRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if user email is not verified', async () => {
      // Arrange
      const unverifiedUser = TestFactory.createUnverifiedUser();
      mockUserRepository.findById.mockResolvedValue(unverifiedUser);

      // Act & Assert
      await expect(createComment.execute(validCreateCommentDto))
        .rejects
        .toThrow(UserErrors.insufficientPermissions());

      expect(mockPostRepository.findById).not.toHaveBeenCalled();
      expect(mockCommentRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if post does not exist', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockAuthor);
      mockPostRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(createComment.execute(validCreateCommentDto))
        .rejects
        .toThrow(PostErrors.postNotFound(validCreateCommentDto.postId));

      expect(mockCommentRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if post is locked', async () => {
      // Arrange
      const lockedPost = TestFactory.createPostEntity({
        id: 1,
        isLocked: true
      });
      
      mockUserRepository.findById.mockResolvedValue(mockAuthor);
      mockPostRepository.findById.mockResolvedValue(lockedPost);

      // Act & Assert
      await expect(createComment.execute(validCreateCommentDto))
        .rejects
        .toThrow(PostErrors.postIsLocked());

      expect(mockCommentRepository.create).not.toHaveBeenCalled();
    });

    it('should create a reply comment successfully', async () => {
      // Arrange
      const parentComment = {
        id: 5,
        postId: 1,
        parentCommentId: null,
        isVisible: () => true
      };

      const replyDto = {
        ...validCreateCommentDto,
        parentCommentId: 5
      };

      const replyComment = {
        ...mockComment,
        parentCommentId: 5,
        isReply: () => true,
        parentComment: {
          id: 5,
          content: 'Parent comment content...',
          authorUsername: 'parentuser'
        }
      };

      mockUserRepository.findById.mockResolvedValue(mockAuthor);
      mockPostRepository.findById.mockResolvedValue(mockPost);
      mockCommentRepository.findById.mockResolvedValue(parentComment as any);
      mockCommentRepository.create.mockResolvedValue(replyComment as any);

      // Act
      const result = await createComment.execute(replyDto);

      // Assert
      expect(result.isReply).toBe(true);
      expect(result.parentCommentId).toBe(5);
      expect(result.parentComment).toBeDefined();

      expect(mockCommentRepository.findById).toHaveBeenCalledWith(5);
      expect(mockCommentRepository.create).toHaveBeenCalledWith({
        postId: replyDto.postId,
        authorId: replyDto.authorId,
        content: replyDto.content.trim(),
        parentCommentId: 5
      });
    });

    it('should throw error if parent comment does not exist', async () => {
      // Arrange
      const replyDto = {
        ...validCreateCommentDto,
        parentCommentId: 999
      };

      mockUserRepository.findById.mockResolvedValue(mockAuthor);
      mockPostRepository.findById.mockResolvedValue(mockPost);
      mockCommentRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(createComment.execute(replyDto))
        .rejects
        .toThrow(ValidationErrors.invalidFormat('Parent comment', 'existing comment'));

      expect(mockCommentRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if parent comment belongs to different post', async () => {
      // Arrange
      const parentCommentFromDifferentPost = {
        id: 5,
        postId: 999, // Different post
        parentCommentId: null,
        isVisible: () => true
      };

      const replyDto = {
        ...validCreateCommentDto,
        parentCommentId: 5
      };

      mockUserRepository.findById.mockResolvedValue(mockAuthor);
      mockPostRepository.findById.mockResolvedValue(mockPost);
      mockCommentRepository.findById.mockResolvedValue(parentCommentFromDifferentPost as any);

      // Act & Assert
      await expect(createComment.execute(replyDto))
        .rejects
        .toThrow(ValidationErrors.invalidFormat('Parent comment', 'comment from the same post'));

      expect(mockCommentRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if parent comment is not visible', async () => {
      // Arrange
      const hiddenParentComment = {
        id: 5,
        postId: 1,
        parentCommentId: null,
        isVisible: () => false
      };

      const replyDto = {
        ...validCreateCommentDto,
        parentCommentId: 5
      };

      mockUserRepository.findById.mockResolvedValue(mockAuthor);
      mockPostRepository.findById.mockResolvedValue(mockPost);
      mockCommentRepository.findById.mockResolvedValue(hiddenParentComment as any);

      // Act & Assert
      await expect(createComment.execute(replyDto))
        .rejects
        .toThrow(ValidationErrors.invalidFormat('Parent comment', 'visible comment'));

      expect(mockCommentRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error for nested replies (max depth exceeded)', async () => {
      // Arrange
      const nestedParentComment = {
        id: 5,
        postId: 1,
        parentCommentId: 3, // This is already a reply
        isVisible: () => true
      };

      const replyDto = {
        ...validCreateCommentDto,
        parentCommentId: 5
      };

      mockUserRepository.findById.mockResolvedValue(mockAuthor);
      mockPostRepository.findById.mockResolvedValue(mockPost);
      mockCommentRepository.findById.mockResolvedValue(nestedParentComment as any);

      // Act & Assert
      await expect(createComment.execute(replyDto))
        .rejects
        .toThrow(ValidationErrors.invalidFormat('Comment', 'maximum nesting depth exceeded'));

      expect(mockCommentRepository.create).not.toHaveBeenCalled();
    });

    it('should trim content before saving', async () => {
      // Arrange
      const dtoWithSpaces = {
        ...validCreateCommentDto,
        content: '   This content has leading and trailing spaces   '
      };

      mockUserRepository.findById.mockResolvedValue(mockAuthor);
      mockPostRepository.findById.mockResolvedValue(mockPost);
      mockCommentRepository.create.mockResolvedValue(mockComment as any);

      // Act
      await createComment.execute(dtoWithSpaces);

      // Assert
      expect(mockCommentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'This content has leading and trailing spaces'
        })
      );
    });

    describe('validation', () => {
      beforeEach(() => {
        mockUserRepository.findById.mockResolvedValue(mockAuthor);
        mockPostRepository.findById.mockResolvedValue(mockPost);
      });

      it('should throw error for empty content', async () => {
        const invalidDto = { ...validCreateCommentDto, content: '' };

        await expect(createComment.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.requiredField('Content'));
      });

      it('should throw error for content shorter than 3 characters', async () => {
        const invalidDto = { ...validCreateCommentDto, content: 'Hi' };

        await expect(createComment.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.minLength('Content', 3));
      });

      it('should throw error for content longer than 2000 characters', async () => {
        const invalidDto = { 
          ...validCreateCommentDto, 
          content: 'a'.repeat(2001) 
        };

        await expect(createComment.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.maxLength('Content', 2000));
      });

      it('should throw error for invalid postId', async () => {
        const invalidDto = { ...validCreateCommentDto, postId: 0 };

        await expect(createComment.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.requiredField('Post ID'));
      });

      it('should throw error for content with excessive repeated characters', async () => {
        const invalidDto = { 
          ...validCreateCommentDto, 
          content: 'aaaaaaaaaaaaaaaaaaaaaa' // More than 10 repeated chars
        };

        await expect(createComment.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.invalidFormat('Content', 'appropriate content without spam'));
      });

      it('should allow content with URLs if pattern is modified', async () => {
        // Este test muestra que actualmente las URLs están bloqueadas
        // Podrías modificar la lógica si quieres permitirlas
        const invalidDto = { 
          ...validCreateCommentDto, 
          content: 'Check this out: https://example.com'
        };

        await expect(createComment.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.invalidFormat('Content', 'appropriate content without spam'));
      });
    });
  });
});