import { Request, Response } from 'express';
import { CommentController } from '@/presentation/controllers/comment.controller';
import { CreateComment } from '@/domain/use-cases/comments/create-comment.use-case';
import { GetComments } from '@/domain/use-cases/comments/get-comments.use-case';
import { CustomError, DomainError } from '@/shared/errors';

describe('CommentController', () => {
  let commentController: CommentController;
  let mockCreateComment: CreateComment;
  let mockGetComments: GetComments;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Crear mocks manuales sin jest.mock()
    mockCreateComment = {
      execute: jest.fn(),
    } as any;

    mockGetComments = {
      execute: jest.fn(),
    } as any;

    commentController = new CommentController(mockCreateComment, mockGetComments);

    mockRequest = {
      params: {},
      body: {},
      query: {},
      user: { userId: 1, email: 'test@example.com' }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create comment successfully', async () => {
      // Arrange
      mockRequest.params = { postId: '1' };
      mockRequest.body = {
        content: 'This is a test comment that meets minimum requirements.'
      };

      const mockResult = {
        id: 1,
        postId: 1,
        content: 'This is a test comment that meets minimum requirements.',
        isReply: false,
        parentCommentId: null,
        createdAt: new Date(),
        author: {
          id: 1,
          username: 'testuser',
          reputation: 100,
          role: { id: 3, name: 'user' }
        },
        stats: {
          voteScore: 0,
          repliesCount: 0
        }
      };

      (mockCreateComment.execute as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await commentController.create(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockCreateComment.execute).toHaveBeenCalledWith({
        postId: 1,
        content: 'This is a test comment that meets minimum requirements.',
        authorId: 1,
        parentCommentId: undefined
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Comment created successfully'
      });
    });

    it('should create reply comment successfully', async () => {
      // Arrange
      mockRequest.params = { postId: '1' };
      mockRequest.body = {
        content: 'This is a reply comment.',
        parentCommentId: '5'
      };

      const mockResult = {
        id: 2,
        postId: 1,
        content: 'This is a reply comment.',
        isReply: true,
        parentCommentId: 5,
        createdAt: new Date(),
        author: {
          id: 1,
          username: 'testuser',
          reputation: 100,
          role: { id: 3, name: 'user' }
        },
        parentComment: {
          id: 5,
          content: 'Original comment...',
          authorUsername: 'originaluser'
        },
        stats: {
          voteScore: 0,
          repliesCount: 0
        }
      };

      (mockCreateComment.execute as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await commentController.create(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockCreateComment.execute).toHaveBeenCalledWith({
        postId: 1,
        content: 'This is a reply comment.',
        authorId: 1,
        parentCommentId: 5
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Reply created successfully'
      });
    });

    it('should handle domain errors', async () => {
      // Arrange
      mockRequest.params = { postId: '1' };
      mockRequest.body = { content: 'Test comment' };

      const domainError = new DomainError('Post not found', 404);
      (mockCreateComment.execute as jest.Mock).mockRejectedValue(domainError);

      // Act
      await commentController.create(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Post not found',
        code: 'DomainError'
      });
    });

    it('should handle custom errors', async () => {
      // Arrange
      mockRequest.params = { postId: '1' };
      mockRequest.body = { content: 'Test comment' };

      const customError = new CustomError(400, 'Validation failed', 'ValidationError');
      (mockCreateComment.execute as jest.Mock).mockRejectedValue(customError);

      // Act
      await commentController.create(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        code: 'ValidationError'
      });
    });

    it('should handle internal server errors', async () => {
      // Arrange
      mockRequest.params = { postId: '1' };
      mockRequest.body = { content: 'Test comment' };

      (mockCreateComment.execute as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      // Act
      await commentController.create(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    });
  });

  describe('getByPostId', () => {
    it('should get comments successfully', async () => {
      // Arrange
      mockRequest.params = { postId: '1' };
      mockRequest.query = {
        page: '1',
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'asc',
        includeReplies: 'false'
      };

      const mockResult = {
        comments: [
          {
            id: 1,
            postId: 1,
            content: 'Test comment',
            isEdited: false,
            editedAt: null,
            createdAt: new Date(),
            isReply: false,
            parentCommentId: null,
            author: {
              id: 1,
              username: 'testuser',
              reputation: 100,
              role: { id: 3, name: 'user' }
            },
            parentComment: undefined,
            stats: {
              voteScore: 3,
              repliesCount: 2,
              upvotes: 4,
              downvotes: 1
            },
            userVote: null
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        },
        postInfo: {
          id: 1,
          title: 'Test Post',
          isLocked: false,
          totalComments: 1
        }
      };

      (mockGetComments.execute as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await commentController.getByPostId(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockGetComments.execute).toHaveBeenCalledWith({
        postId: 1,
        userId: 1,
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'asc',
        includeReplies: false
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.comments,
        pagination: mockResult.pagination,
        postInfo: mockResult.postInfo,
        message: 'Found 1 comments'
      });
    });

    it('should work with optional user (anonymous)', async () => {
      // Arrange
      mockRequest.user = undefined; // Anonymous user
      mockRequest.params = { postId: '1' };
      mockRequest.query = {};

      const mockResult = {
        comments: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        postInfo: {
          id: 1,
          title: 'Test Post',
          isLocked: false,
          totalComments: 0
        }
      };

      (mockGetComments.execute as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await commentController.getByPostId(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockGetComments.execute).toHaveBeenCalledWith({
        postId: 1,
        userId: undefined,
        page: undefined,
        limit: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        includeReplies: false
      });
    });

    it('should handle domain errors in getByPostId', async () => {
      // Arrange
      mockRequest.params = { postId: '999' };

      const domainError = new DomainError('Post with id 999 not found', 404);
      (mockGetComments.execute as jest.Mock).mockRejectedValue(domainError);

      // Act
      await commentController.getByPostId(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Post with id 999 not found',
        code: 'DomainError'
      });
    });

    it('should parse query parameters correctly', async () => {
      // Arrange
      mockRequest.params = { postId: '1' };
      mockRequest.query = {
        page: '2',
        limit: '10',
        sortBy: 'voteScore',
        sortOrder: 'desc'
      };

      const mockResult = {
        comments: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        postInfo: {
          id: 1,
          title: 'Test Post',
          isLocked: false,
          totalComments: 0
        }
      };

      (mockGetComments.execute as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await commentController.getByPostId(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockGetComments.execute).toHaveBeenCalledWith({
        postId: 1,
        userId: 1,
        page: 2,
        limit: 10,
        sortBy: 'voteScore',
        sortOrder: 'desc',
        includeReplies: false
      });
    });
  });

  describe('getReplies', () => {
    it('should return coming soon message', async () => {
      // Arrange
      mockRequest.params = { id: '1' };
      mockRequest.query = {
        page: '1',
        limit: '10'
      };

      // Act
      await commentController.getReplies(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        message: 'Feature coming soon - replies endpoint'
      });
    });

    it('should handle errors in getReplies', async () => {
      // Arrange
      mockRequest.params = { id: 'invalid' };

      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await commentController.getReplies(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        message: 'Feature coming soon - replies endpoint'
      });

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should log errors when handling them', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockRequest.params = { postId: '1' };
      mockRequest.body = { content: 'Test comment' };

      const error = new Error('Test error');
      (mockCreateComment.execute as jest.Mock).mockRejectedValue(error);

      // Act
      await commentController.create(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Error creating comment', error);

      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should handle missing postId parameter', async () => {
      // Arrange
      mockRequest.params = {}; // Missing postId
      mockRequest.body = { content: 'Test comment' };

      const mockResult = {
        id: 1,
        postId: NaN,
        content: 'Test comment',
        isReply: false,
        parentCommentId: null,
        createdAt: new Date(),
        author: {
          id: 1,
          username: 'testuser',
          reputation: 100,
          role: { id: 3, name: 'user' }
        },
        stats: {
          voteScore: 0,
          repliesCount: 0
        }
      };

      (mockCreateComment.execute as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await commentController.create(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockCreateComment.execute).toHaveBeenCalledWith({
        postId: NaN, // parseInt(undefined) = NaN
        content: 'Test comment',
        authorId: 1,
        parentCommentId: undefined
      });
    });

    it('should handle missing user in authenticated route', async () => {
      // Arrange
      mockRequest.user = undefined; // No authenticated user
      mockRequest.params = { postId: '1' };
      mockRequest.body = { content: 'Test comment' };

      const mockResult = {
        id: 1,
        postId: 1,
        content: 'Test comment',
        isReply: false,
        parentCommentId: null,
        createdAt: new Date(),
        author: {
          id: undefined,
          username: 'testuser',
          reputation: 100,
          role: { id: 3, name: 'user' }
        },
        stats: {
          voteScore: 0,
          repliesCount: 0
        }
      };

      (mockCreateComment.execute as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await commentController.create(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockCreateComment.execute).toHaveBeenCalledWith({
        postId: 1,
        content: 'Test comment',
        authorId: undefined, // Will cause error in use case
        parentCommentId: undefined
      });
    });
  });
});