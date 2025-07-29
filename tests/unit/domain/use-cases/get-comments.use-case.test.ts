import { GetComments } from '@/domain/use-cases/comments/get-comments.use-case';
import { CommentRepository } from '@/domain/repositories/comment.repository';
import { PostRepository } from '@/domain/repositories/post.repository';
import { PostErrors } from '@/shared/errors';
import { TestFactory } from '../../../helpers/factories';

describe('GetComments Use Case', () => {
  let getComments: GetComments;
  let mockCommentRepository: jest.Mocked<CommentRepository>;
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

    mockPostRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      incrementViews: jest.fn(),
    };

    getComments = new GetComments(
      mockCommentRepository,
      mockPostRepository
    );

    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validRequest = {
      postId: 1,
      userId: 1,
      page: 1,
      limit: 20,
      sortBy: 'createdAt' as const,
      sortOrder: 'asc' as const,
      includeReplies: false
    };

    const mockPost = TestFactory.createPostEntity({
      id: 1,
      title: 'Test Post',
      isLocked: false
    });

    const mockComment = {
      id: 1,
      postId: 1,
      authorId: 1,
      parentCommentId: null,
      content: 'This is a test comment',
      isEdited: false,
      editedAt: null,
      isDeleted: false,
      isHidden: false,
      createdAt: new Date('2024-01-01T10:00:00Z'),
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
      voteScore: 3,
      userVote: null,
      getDisplayContent: () => 'This is a test comment',
      isReply: () => false,
      parentComment: undefined
    };

    const mockPaginatedResult = {
      data: [mockComment],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };

    const mockCommentStats = {
      voteScore: 3,
      upvotes: 4,
      downvotes: 1,
      repliesCount: 2
    };

    it('should get comments successfully', async () => {
      // Arrange
      mockPostRepository.findById.mockResolvedValue(mockPost);
      mockCommentRepository.findByPostId.mockResolvedValue(mockPaginatedResult as any);
      mockCommentRepository.getCommentStats.mockResolvedValue(mockCommentStats);
      mockCommentRepository.findMany.mockResolvedValue({ 
        ...mockPaginatedResult, 
        pagination: { ...mockPaginatedResult.pagination, total: 1 } 
      } as any);

      // Act
      const result = await getComments.execute(validRequest);

      // Assert
      expect(result).toEqual({
        comments: [{
          id: mockComment.id,
          postId: mockComment.postId,
          content: mockComment.content,
          isEdited: mockComment.isEdited,
          editedAt: mockComment.editedAt,
          createdAt: mockComment.createdAt,
          isReply: false,
          parentCommentId: mockComment.parentCommentId,
          author: {
            id: mockComment.author.id,
            username: mockComment.author.username,
            reputation: mockComment.author.reputation,
            role: mockComment.author.role
          },
          parentComment: undefined,
          stats: {
            voteScore: mockCommentStats.voteScore,
            repliesCount: mockCommentStats.repliesCount,
            upvotes: mockCommentStats.upvotes,
            downvotes: mockCommentStats.downvotes
          },
          userVote: null
        }],
        pagination: mockPaginatedResult.pagination,
        postInfo: {
          id: mockPost.id,
          title: mockPost.title,
          isLocked: mockPost.isLocked,
          totalComments: 1
        }
      });

      expect(mockPostRepository.findById).toHaveBeenCalledWith(validRequest.postId);
      expect(mockCommentRepository.findByPostId).toHaveBeenCalledWith(
        validRequest.postId,
        {
          page: validRequest.page,
          limit: validRequest.limit,
          sortBy: validRequest.sortBy,
          sortOrder: validRequest.sortOrder
        },
        validRequest.userId
      );
    });

    it('should throw error if post does not exist', async () => {
      // Arrange
      mockPostRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(getComments.execute(validRequest))
        .rejects
        .toThrow(PostErrors.postNotFound(validRequest.postId));

      expect(mockCommentRepository.findByPostId).not.toHaveBeenCalled();
    });

    it('should work without userId (anonymous user)', async () => {
      // Arrange
      const anonymousRequest = { ...validRequest, userId: undefined };
      
      mockPostRepository.findById.mockResolvedValue(mockPost);
      mockCommentRepository.findByPostId.mockResolvedValue(mockPaginatedResult as any);
      mockCommentRepository.getCommentStats.mockResolvedValue(mockCommentStats);
      mockCommentRepository.findMany.mockResolvedValue({ 
        ...mockPaginatedResult, 
        pagination: { ...mockPaginatedResult.pagination, total: 1 } 
      } as any);

      // Act
      const result = await getComments.execute(anonymousRequest);

      // Assert
      expect(result.comments[0].userVote).toBeNull();
      expect(mockCommentRepository.findByPostId).toHaveBeenCalledWith(
        anonymousRequest.postId,
        expect.any(Object),
        undefined // userId should be undefined
      );
    });

    it('should include replies when requested', async () => {
      // Arrange
      const requestWithReplies = { ...validRequest, includeReplies: true };
      
      const mockReply = {
        id: 2,
        postId: 1,
        authorId: 2,
        parentCommentId: 1,
        content: 'This is a reply',
        isEdited: false,
        editedAt: null,
        createdAt: new Date('2024-01-01T10:05:00Z'),
        author: {
          id: 2,
          username: 'replyuser',
          reputation: 50,
          role: { id: 3, name: 'user' }
        },
        _count: { votes: 2, replies: 0 },
        voteScore: 1,
        userVote: null,
        getDisplayContent: () => 'This is a reply',
        isReply: () => true,
        parentComment: undefined
      };

      const mockRepliesResult = {
        data: [mockReply],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      mockPostRepository.findById.mockResolvedValue(mockPost);
      mockCommentRepository.findByPostId.mockResolvedValue(mockPaginatedResult as any);
      mockCommentRepository.findReplies.mockResolvedValue(mockRepliesResult as any);
      mockCommentRepository.getCommentStats
        .mockResolvedValueOnce(mockCommentStats) // For main comment
        .mockResolvedValueOnce({ // For reply
          voteScore: 1,
          upvotes: 1,
          downvotes: 0,
          repliesCount: 0
        });
      mockCommentRepository.findMany.mockResolvedValue({ 
        ...mockPaginatedResult, 
        pagination: { ...mockPaginatedResult.pagination, total: 2 } 
      } as any);

      // Act
      const result = await getComments.execute(requestWithReplies);

      // Assert
      expect(result.comments[0].replies).toBeDefined();
      expect(result.comments[0].replies).toHaveLength(1);
      expect(result.comments[0].replies![0].id).toBe(2);
      expect(result.comments[0].replies![0].isReply).toBe(true);

      expect(mockCommentRepository.findReplies).toHaveBeenCalledWith(
        mockComment.id,
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'asc' },
        validRequest.userId
      );
    });

    it('should handle pagination parameters correctly', async () => {
      // Arrange
      const customPaginationRequest = {
        ...validRequest,
        page: 2,
        limit: 10,
        sortBy: 'voteScore' as const,
        sortOrder: 'desc' as const
      };

      mockPostRepository.findById.mockResolvedValue(mockPost);
      mockCommentRepository.findByPostId.mockResolvedValue(mockPaginatedResult as any);
      mockCommentRepository.getCommentStats.mockResolvedValue(mockCommentStats);
      mockCommentRepository.findMany.mockResolvedValue({ 
        ...mockPaginatedResult, 
        pagination: { ...mockPaginatedResult.pagination, total: 1 } 
      } as any);

      // Act
      await getComments.execute(customPaginationRequest);

      // Assert
      expect(mockCommentRepository.findByPostId).toHaveBeenCalledWith(
        customPaginationRequest.postId,
        {
          page: 2,
          limit: 10,
          sortBy: 'voteScore',
          sortOrder: 'desc'
        },
        customPaginationRequest.userId
      );
    });

    it('should use default pagination values', async () => {
      // Arrange
      const requestWithoutPagination = {
        postId: 1,
        userId: 1
      };

      mockPostRepository.findById.mockResolvedValue(mockPost);
      mockCommentRepository.findByPostId.mockResolvedValue(mockPaginatedResult as any);
      mockCommentRepository.getCommentStats.mockResolvedValue(mockCommentStats);
      mockCommentRepository.findMany.mockResolvedValue({ 
        ...mockPaginatedResult, 
        pagination: { ...mockPaginatedResult.pagination, total: 1 } 
      } as any);

      // Act
      await getComments.execute(requestWithoutPagination);

      // Assert
      expect(mockCommentRepository.findByPostId).toHaveBeenCalledWith(
        requestWithoutPagination.postId,
        {
          page: 1,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'asc'
        },
        requestWithoutPagination.userId
      );
    });

    it('should enforce pagination limits', async () => {
      // Arrange
      const requestWithExcessivePagination = {
        ...validRequest,
        page: -1, // Should be corrected to 1
        limit: 100 // Should be limited to 50
      };

      mockPostRepository.findById.mockResolvedValue(mockPost);
      mockCommentRepository.findByPostId.mockResolvedValue(mockPaginatedResult as any);
      mockCommentRepository.getCommentStats.mockResolvedValue(mockCommentStats);
      mockCommentRepository.findMany.mockResolvedValue({ 
        ...mockPaginatedResult, 
        pagination: { ...mockPaginatedResult.pagination, total: 1 } 
      } as any);

      // Act
      await getComments.execute(requestWithExcessivePagination);

      // Assert
      expect(mockCommentRepository.findByPostId).toHaveBeenCalledWith(
        requestWithExcessivePagination.postId,
        {
          page: 1, // Corrected from -1
          limit: 50, // Limited from 100
          sortBy: 'createdAt',
          sortOrder: 'asc'
        },
        requestWithExcessivePagination.userId
      );
    });

    it('should handle empty comments list', async () => {
      // Arrange
      const emptyResult = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };

      mockPostRepository.findById.mockResolvedValue(mockPost);
      mockCommentRepository.findByPostId.mockResolvedValue(emptyResult as any);
      mockCommentRepository.findMany.mockResolvedValue(emptyResult as any);

      // Act
      const result = await getComments.execute(validRequest);

      // Assert
      expect(result.comments).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.postInfo.totalComments).toBe(0);
    });

    it('should handle comments with no author (deleted user)', async () => {
      // Arrange
      const commentWithNoAuthor = {
        ...mockComment,
        authorId: null,
        author: null
      };

      const resultWithNoAuthor = {
        data: [commentWithNoAuthor],
        pagination: mockPaginatedResult.pagination
      };

      mockPostRepository.findById.mockResolvedValue(mockPost);
      mockCommentRepository.findByPostId.mockResolvedValue(resultWithNoAuthor as any);
      mockCommentRepository.getCommentStats.mockResolvedValue(mockCommentStats);
      mockCommentRepository.findMany.mockResolvedValue({ 
        ...resultWithNoAuthor, 
        pagination: { ...resultWithNoAuthor.pagination, total: 1 } 
      } as any);

      // Act
      const result = await getComments.execute(validRequest);

      // Assert
      expect(result.comments[0].author).toBeNull();
    });

    it('should return correct post info', async () => {
      // Arrange
      const lockedPost = TestFactory.createPostEntity({
        id: 1,
        title: 'Locked Test Post',
        isLocked: true
      });

      mockPostRepository.findById.mockResolvedValue(lockedPost);
      mockCommentRepository.findByPostId.mockResolvedValue(mockPaginatedResult as any);
      mockCommentRepository.getCommentStats.mockResolvedValue(mockCommentStats);
      mockCommentRepository.findMany.mockResolvedValue({ 
        ...mockPaginatedResult, 
        pagination: { ...mockPaginatedResult.pagination, total: 5 } 
      } as any);

      // Act
      const result = await getComments.execute(validRequest);

      // Assert
      expect(result.postInfo).toEqual({
        id: lockedPost.id,
        title: lockedPost.title,
        isLocked: true,
        totalComments: 5
      });
    });
  });
});