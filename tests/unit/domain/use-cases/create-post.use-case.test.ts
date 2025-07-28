import { CreatePost } from '@/domain/use-cases/posts/create-post.use-case';
import { PostRepository } from '@/domain/repositories/post.repository';
import { UserRepository } from '@/domain/repositories/user.repository';
import { PostErrors, ValidationErrors, UserErrors } from '@/shared/errors';
import { TestFactory } from '../../../helpers/factories';

describe('CreatePost Use Case', () => {
  let createPost: CreatePost;
  let mockPostRepository: jest.Mocked<PostRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockPostRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      incrementViews: jest.fn(),
    };

    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
    };

    createPost = new CreatePost(mockPostRepository, mockUserRepository);
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validCreatePostDto = {
      channelId: 1,
      title: 'Test Post Title',
      content: 'This is a test post content that is long enough to pass validation.',
      authorId: 1
    };

    const mockAuthor = TestFactory.createUserEntity({
      id: 1,
      username: 'testauthor',
      role: { id: 3, name: 'user' }
    });

    const mockPost = {
      id: 1,
      channelId: 1,
      authorId: 1,
      title: validCreatePostDto.title,
      content: validCreatePostDto.content,
      isLocked: false,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: null,
      channel: { id: 1, name: 'general', isPrivate: false }
    };

    it('should create a post successfully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockAuthor);
      mockPostRepository.create.mockResolvedValue(mockPost as any);

      // Act
      const result = await createPost.execute(validCreatePostDto);

      // Assert
      expect(result).toEqual({
        id: mockPost.id,
        channelId: mockPost.channelId,
        title: mockPost.title,
        content: mockPost.content,
        isLocked: false,
        isPinned: false,
        createdAt: mockPost.createdAt,
        author: {
          id: mockAuthor.id,
          username: mockAuthor.username,
          reputation: mockAuthor.reputation,
          role: mockAuthor.role!
        },
        channel: mockPost.channel
      });

      expect(mockUserRepository.findById).toHaveBeenCalledWith(validCreatePostDto.authorId);
      expect(mockPostRepository.create).toHaveBeenCalledWith({
        channelId: validCreatePostDto.channelId,
        authorId: validCreatePostDto.authorId,
        title: validCreatePostDto.title.trim(),
        content: validCreatePostDto.content.trim()
      });
    });

    it('should throw error if author does not exist', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(createPost.execute(validCreatePostDto))
        .rejects
        .toThrow(UserErrors.userNotFound(validCreatePostDto.authorId));

      expect(mockPostRepository.create).not.toHaveBeenCalled();
    });

    it('should trim title and content', async () => {
      // Arrange
      const dtoWithSpaces = {
        ...validCreatePostDto,
        title: '  Test Title  ',
        content: '  Test content with spaces  '
      };

      mockUserRepository.findById.mockResolvedValue(mockAuthor);
      mockPostRepository.create.mockResolvedValue(mockPost as any);

      // Act
      await createPost.execute(dtoWithSpaces);

      // Assert
      expect(mockPostRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          content: 'Test content with spaces'
        })
      );
    });

    describe('validation', () => {
      it('should throw error for empty title', async () => {
        const invalidDto = { ...validCreatePostDto, title: '' };

        await expect(createPost.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.requiredField('Title'));
      });

      it('should throw error for title shorter than 5 characters', async () => {
        const invalidDto = { ...validCreatePostDto, title: '1234' };

        await expect(createPost.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.minLength('Title', 5));
      });

      it('should throw error for title longer than 200 characters', async () => {
        const invalidDto = { 
          ...validCreatePostDto, 
          title: 'a'.repeat(201) 
        };

        await expect(createPost.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.maxLength('Title', 200));
      });

      it('should throw error for empty content', async () => {
        const invalidDto = { ...validCreatePostDto, content: '' };

        await expect(createPost.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.requiredField('Content'));
      });

      it('should throw error for content shorter than 10 characters', async () => {
        const invalidDto = { ...validCreatePostDto, content: '123456789' };

        await expect(createPost.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.minLength('Content', 10));
      });

      it('should throw error for content longer than 10000 characters', async () => {
        const invalidDto = { 
          ...validCreatePostDto, 
          content: 'a'.repeat(10001) 
        };

        await expect(createPost.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.maxLength('Content', 10000));
      });

      it('should throw error for invalid channelId', async () => {
        const invalidDto = { ...validCreatePostDto, channelId: 0 };

        await expect(createPost.execute(invalidDto))
          .rejects
          .toThrow(ValidationErrors.requiredField('Channel ID'));
      });
    });
  });
});