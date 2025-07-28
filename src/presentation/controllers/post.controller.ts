// src/presentation/controllers/post.controller.ts (CORREGIDO)
import { Request, Response } from 'express';
import { CreatePost } from '../../domain/use-cases/posts/create-post.use-case';
import { GetPosts } from '../../domain/use-cases/posts/get-posts.use-case';
import { GetPostDetail } from '../../domain/use-cases/posts/get-post-detail.use-case';
import { UpdatePost } from '../../domain/use-cases/posts/update-post.use-case';
import { DeletePost } from '../../domain/use-cases/posts/delete-post.use-case';
import { CustomError, DomainError } from '../../shared/errors';

export class PostController {
  constructor(
    private readonly createPost: CreatePost,
    private readonly getPosts: GetPosts,
    private readonly getPostDetail: GetPostDetail,
    private readonly updatePost: UpdatePost,
    private readonly deletePost: DeletePost
  ) {}

  // POST /api/posts
  async create(req: Request, res: Response) {
    try {
      const { channelId, title, content } = req.body;
      const authorId = req.user?.userId!; // ✅ Usar la extensión global de Express

      const result = await this.createPost.execute({
        channelId: parseInt(channelId),
        title,
        content,
        authorId
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Post created successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error creating post');
    }
  }

  // GET /api/posts - AHORA PRIVADO
  async getMany(req: Request, res: Response) {
    try {
      const {
        channelId,
        authorId,
        search,
        page,
        limit,
        sortBy,
        sortOrder
      } = req.query;

      // ✅ Usuario autenticado requerido para ver posts
      const result = await this.getPosts.execute({
        channelId: channelId ? parseInt(channelId as string) : undefined,
        authorId: authorId ? parseInt(authorId as string) : undefined,
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      res.json({
        success: true,
        data: result.posts,
        pagination: result.pagination,
        message: `Found ${result.posts.length} posts`
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching posts');
    }
  }

  // GET /api/posts/:id - AHORA PRIVADO
  async getById(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user?.userId!; // ✅ Usar la extensión global de Express

      const result = await this.getPostDetail.execute({
        postId,
        userId
      });

      res.json({
        success: true,
        data: result,
        message: 'Post retrieved successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error fetching post');
    }
  }

  // PUT /api/posts/:id
  async update(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user?.userId!;
      const { title, content, isLocked, isPinned } = req.body;

      const result = await this.updatePost.execute({
        postId,
        userId,
        title,
        content,
        isLocked,
        isPinned
      });

      res.json({
        success: true,
        data: result,
        message: 'Post updated successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error updating post');
    }
  }

  // DELETE /api/posts/:id
  async delete(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user?.userId!;

      const result = await this.deletePost.execute({
        postId,
        userId
      });

      res.json({
        success: true,
        data: result,
        message: 'Post deleted successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Error deleting post');
    }
  }

  private handleError(error: any, res: Response, logMessage: string) {
    console.error(logMessage, error);
    
    if (error instanceof DomainError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.name
      });
    }
    
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.name
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}