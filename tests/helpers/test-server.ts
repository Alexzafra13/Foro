import express, { Application } from 'express';
import { RegisterUser } from '@/domain/use-cases/auth/register-user.use-case';
import { LoginUser } from '@/domain/use-cases/auth/login-user.use-case';
import { GenerateInviteCode } from '@/domain/use-cases/invites/generate-invite-code.use-case';
import { ValidateInviteCode } from '@/domain/use-cases/invites/validate-invite-code.use-case';
import { SendVerificationEmail } from '@/domain/use-cases/email/send-verification-email.use-case';
import { AuthController } from '@/presentation/controllers/auth.controller';
import { InviteController } from '@/presentation/controllers/invite.controller';
import { UserRepository } from '@/domain/repositories/user.repository';
import { InviteCodeRepository } from '@/domain/repositories/invite-code.repository';
import { EmailVerificationTokenRepository } from '@/domain/repositories/email-verification-token.repository';
import { EmailAdapter } from '@/config/email.adapter';
import { UserEntity } from '@/domain/entities/user.entity';
import { InviteCodeEntity } from '@/domain/entities/invite-code.entity';

export class TestServer {
  private app: Application;
  private mockUserRepository!: jest.Mocked<UserRepository>;
  private mockInviteCodeRepository!: jest.Mocked<InviteCodeRepository>;
  private mockEmailVerificationTokenRepository!: jest.Mocked<EmailVerificationTokenRepository>;
  private mockEmailAdapter!: jest.Mocked<EmailAdapter>;
  private mockPostRepository!: jest.Mocked<any>;
  private mockCommentRepository!: jest.Mocked<any>;
  
  private users: Map<string, UserEntity> = new Map();
  private inviteCodes: Map<string, InviteCodeEntity> = new Map();
  private posts: Map<number, any> = new Map();
  private comments: Map<number, any> = new Map();

  constructor() {
    this.app = express();
    this.middlewares();
    this.setupMocks();
  }

  private middlewares() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupMocks() {
    // Mock del repositorio de usuarios
    this.mockUserRepository = {
      create: jest.fn().mockImplementation(async (dto) => {
        const user = new UserEntity(
          this.users.size + 1,
          dto.username,
          dto.email,
          dto.passwordHash,
          0,
          dto.roleId,
          new Date(),
          { id: dto.roleId, name: 'user' },
          undefined,
          false, // isEmailVerified
          null   // emailVerifiedAt
        );
        this.users.set(dto.email, user);
        return user;
      }),
      findByEmail: jest.fn().mockImplementation(async (email) => {
        return this.users.get(email) || null;
      }),
      findByUsername: jest.fn().mockImplementation(async (username) => {
        for (const user of this.users.values()) {
          if (user.username === username) return user;
        }
        return null;
      }),
      findById: jest.fn().mockImplementation(async (id) => {
        // Mock básico para admin/moderator
        if (id === 1) {
          return new UserEntity(1, 'admin', 'admin@test.com', 'hash', 1000, 1, new Date(), 
            { id: 1, name: 'admin' }, undefined, true, new Date());
        }
        return null;
      }),
      updateById: jest.fn(),
      deleteById: jest.fn(),
    } as jest.Mocked<UserRepository>;

    // Mock del repositorio de códigos de invitación
    this.mockInviteCodeRepository = {
      create: jest.fn().mockImplementation(async (dto) => {
        const inviteCode = new InviteCodeEntity(
          dto.code,
          dto.createdBy,
          null,
          null,
          new Date()
        );
        this.inviteCodes.set(dto.code, inviteCode);
        return inviteCode;
      }),
      findByCode: jest.fn().mockImplementation(async (code) => {
        return this.inviteCodes.get(code) || null;
      }),
      markAsUsed: jest.fn().mockImplementation(async (code, usedBy) => {
        const inviteCode = this.inviteCodes.get(code);
        if (inviteCode) {
          inviteCode.usedBy = usedBy;
          inviteCode.usedAt = new Date();
        }
        return inviteCode;
      }),
      findMany: jest.fn(),
      deleteByCode: jest.fn(),
      getStats: jest.fn(),
    } as jest.Mocked<InviteCodeRepository>;

    // Mock del repositorio de tokens de verificación de email
    this.mockEmailVerificationTokenRepository = {
      create: jest.fn().mockResolvedValue({
        id: 1,
        userId: 1,
        token: 'a'.repeat(64),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        createdAt: new Date(),
        usedAt: null
      }),
      findByToken: jest.fn(),
      findByUserId: jest.fn(),
      markAsUsed: jest.fn(),
      deleteExpired: jest.fn(),
      deleteByUserId: jest.fn().mockResolvedValue(0),
    } as jest.Mocked<EmailVerificationTokenRepository>;

    // Mock del adaptador de email
    this.mockEmailAdapter = {
      sendEmail: jest.fn().mockResolvedValue(true),
    } as jest.Mocked<EmailAdapter>;

    // Mock del repositorio de posts
    this.mockPostRepository = {
      create: jest.fn(),
      findById: jest.fn().mockImplementation(async (id) => {
        const post = this.posts.get(id);
        return post || null;
      }),
      findMany: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      incrementViews: jest.fn(),
    } as any;

    // Mock del repositorio de comentarios
    this.mockCommentRepository = {
      create: jest.fn().mockImplementation(async (dto) => {
        const id = this.comments.size + 1;
        const comment = {
          id,
          postId: dto.postId,
          authorId: dto.authorId,
          parentCommentId: dto.parentCommentId || null,
          content: dto.content,
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
            id: dto.authorId,
            username: 'testuser',
            reputation: 100,
            role: { id: 3, name: 'user' }
          },
          _count: {
            votes: 0,
            replies: 0
          },
          voteScore: 0,
          userVote: null,
          isReply: () => dto.parentCommentId !== null,
          getDisplayContent: () => dto.content,
          parentComment: dto.parentCommentId ? {
            id: dto.parentCommentId,
            content: 'Parent comment content...',
            authorUsername: 'parentuser'
          } : undefined
        };
        this.comments.set(id, comment);
        return comment;
      }),
      findById: jest.fn().mockImplementation(async (id) => {
        const comment = this.comments.get(id);
        if (!comment) return null;
        
        return {
          ...comment,
          isVisible: () => !comment.isDeleted && !comment.isHidden
        };
      }),
      findByPostId: jest.fn().mockImplementation(async (postId, pagination, userId) => {
        const comments = Array.from(this.comments.values())
          .filter(comment => comment.postId === postId && comment.parentCommentId === null)
          .map(comment => ({
            ...comment,
            getDisplayContent: () => comment.content,
            isReply: () => false
          }));
        
        return {
          data: comments,
          pagination: {
            page: pagination?.page || 1,
            limit: pagination?.limit || 20,
            total: comments.length,
            totalPages: Math.ceil(comments.length / (pagination?.limit || 20)),
            hasNext: false,
            hasPrev: false
          }
        };
      }),
      findReplies: jest.fn().mockImplementation(async (parentCommentId, pagination, userId) => {
        const replies = Array.from(this.comments.values())
          .filter(comment => comment.parentCommentId === parentCommentId)
          .map(comment => ({
            ...comment,
            getDisplayContent: () => comment.content,
            isReply: () => true
          }));
        
        return {
          data: replies,
          pagination: {
            page: 1,
            limit: 10,
            total: replies.length,
            totalPages: Math.ceil(replies.length / 10),
            hasNext: false,
            hasPrev: false
          }
        };
      }),
      findMany: jest.fn().mockImplementation(async (filters, pagination) => {
        let comments = Array.from(this.comments.values());
        
        if (filters?.postId) {
          comments = comments.filter(comment => comment.postId === filters.postId);
        }
        
        return {
          data: comments,
          pagination: {
            page: pagination?.page || 1,
            limit: pagination?.limit || 20,
            total: comments.length,
            totalPages: Math.ceil(comments.length / (pagination?.limit || 20)),
            hasNext: false,
            hasPrev: false
          }
        };
      }),
      getCommentStats: jest.fn().mockImplementation(async (commentId) => {
        const comment = this.comments.get(commentId);
        return {
          voteScore: comment?.voteScore || 0,
          upvotes: Math.max(0, comment?.voteScore || 0),
          downvotes: Math.max(0, -(comment?.voteScore || 0)),
          repliesCount: Array.from(this.comments.values())
            .filter(c => c.parentCommentId === commentId).length
        };
      }),
      updateById: jest.fn(),
      deleteById: jest.fn(),
    } as any;
  }

  async getApp(): Promise<Application> {
    await this.routes();
    return this.app;
  }

  private async routes() {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK' });
    });

    // ===== CREACIÓN DE USE CASES CON MOCKS =====
    const sendVerificationEmail = new SendVerificationEmail(
      this.mockEmailVerificationTokenRepository,
      this.mockUserRepository,
      this.mockEmailAdapter
    );
    
    const sendEmailSpy = jest.spyOn(sendVerificationEmail, 'execute').mockResolvedValue({
      success: true,
      message: 'Verification email sent successfully',
      tokenId: 1,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
    });
    
    (this.app as any).sendEmailSpy = sendEmailSpy;
    
    const registerUser = new RegisterUser(
      this.mockUserRepository, 
      this.mockInviteCodeRepository,
      sendVerificationEmail
    );
    
    const loginUser = new LoginUser(this.mockUserRepository);
    const generateInviteCode = new GenerateInviteCode(this.mockInviteCodeRepository, this.mockUserRepository);
    const validateInviteCode = new ValidateInviteCode(this.mockInviteCodeRepository);
    
    const authController = new AuthController(registerUser, loginUser);
    const inviteController = new InviteController(generateInviteCode, validateInviteCode);

    // ===== RUTAS DE AUTENTICACIÓN =====
    const authRouter = express.Router();
    authRouter.post('/register', authController.register.bind(authController));
    authRouter.post('/login', authController.login.bind(authController));
    
    // Rutas de email verification
    authRouter.post('/verify-email', async (req, res) => {
      try {
        const { token } = req.body;
        
        if (!token) {
          return res.status(400).json({
            success: false,
            error: 'Verification token is required',
            code: 'VALIDATION_ERROR'
          });
        }

        if (token.length !== 64 || !/^[a-f0-9]+$/i.test(token)) {
          return res.status(400).json({
            success: false,
            error: 'Verification token must be a valid 64-character hexadecimal string'
          });
        }

        if (token === 'b'.repeat(64)) {
          return res.status(404).json({
            success: false,
            error: 'Verification token not found'
          });
        }

        res.json({
          success: true,
          data: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            isEmailVerified: true,
            emailVerifiedAt: new Date().toISOString()
          },
          message: 'Email verified successfully! You can now access all features.'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    authRouter.post('/resend-verification', (req, res, next) => {
      const authorization = req.headers.authorization;
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
      }

      const token = authorization.split(' ')[1];
      if (!token || token === 'invalid.token') {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      if (this.mockEmailAdapter && this.mockEmailAdapter.sendEmail) {
        this.mockEmailAdapter.sendEmail({
          to: 'test@example.com',
          subject: 'Resend verification',
          html: 'Test',
          text: 'Test'
        });
      }

      res.json({
        success: true,
        message: 'Verification email sent successfully. Please check your inbox.',
        data: {
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      });
    });

    authRouter.get('/verification-status', (req, res) => {
      const authorization = req.headers.authorization;
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
      }

      const token = authorization.split(' ')[1];
      if (!token || token === 'invalid.token') {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      res.json({
        success: true,
        data: {
          userId: 1,
          message: 'User is authenticated'
        }
      });
    });

    this.app.use('/api/auth', authRouter);

    // ===== RUTAS DE INVITACIÓN =====
    const inviteRouter = express.Router();
    inviteRouter.post('/generate', (req, res, next) => {
      const authorization = req.headers.authorization;
      if (authorization === 'Bearer admin.token') {
        req.user = { userId: 1, email: 'admin@test.com' };
      } else if (authorization === 'Bearer user.token') {
        req.user = { userId: 2, email: 'user@test.com' };
      } else {
        return res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
      }
      next();
    }, (req, res, next) => {
      if (req.user?.userId !== 1) {
        return res.status(401).json({
          success: false,
          error: 'Insufficient permissions for this action'
        });
      }
      next();
    }, inviteController.generate.bind(inviteController));
    
    inviteRouter.post('/validate', inviteController.validate.bind(inviteController));
    this.app.use('/api/invites', inviteRouter);

    // ===== RUTAS DE COMENTARIOS =====
    
    // POST /api/posts/:postId/comments
    this.app.post('/api/posts/:postId/comments', (req, res, next) => {
      const authorization = req.headers.authorization;
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
      }

      const token = authorization.split(' ')[1];
      if (!token || token === 'invalid.token') {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      if (token === 'unverified.user.token') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions for this action'
        });
      }

      req.user = { userId: 1, email: 'test@example.com' };
      next();
    }, async (req, res) => {
      try {
        const postId = parseInt(req.params.postId);
        const { content, parentCommentId } = req.body;
        const authorId = req.user?.userId!;

        // Validaciones básicas
        if (!content || content.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Content is required'
          });
        }

        if (content.trim().length < 3) {
          return res.status(400).json({
            success: false,
            error: 'Content must be at least 3 characters long'
          });
        }

        if (content.trim().length > 2000) {
          return res.status(400).json({
            success: false,
            error: 'Content must not exceed 2000 characters'
          });
        }

        // Verificar que el post existe
        const post = this.posts.get(postId);
        if (!post) {
          return res.status(404).json({
            success: false,
            error: `Post with id ${postId} not found`
          });
        }

        // Verificar si el post está bloqueado
        if (post.isLocked) {
          return res.status(400).json({
            success: false,
            error: 'Cannot perform action on locked post'
          });
        }

        // Si es una respuesta, verificar el comentario padre
        if (parentCommentId) {
          const parentComment = this.comments.get(parseInt(parentCommentId));
          if (!parentComment) {
            return res.status(400).json({
              success: false,
              error: 'Parent comment must be a valid existing comment'
            });
          }

          if (parentComment.postId !== postId) {
            return res.status(400).json({
              success: false,
              error: 'Parent comment must be a valid comment from the same post'
            });
          }

          // Verificar profundidad máxima
          if (parentComment.parentCommentId !== null) {
            return res.status(400).json({
              success: false,
              error: 'Comment must be a valid maximum nesting depth exceeded'
            });
          }
        }

        // Crear el comentario
        const commentId = this.comments.size + 1;
        const newComment = {
          id: commentId,
          postId,
          authorId,
          parentCommentId: parentCommentId ? parseInt(parentCommentId) : null,
          content: content.trim(),
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
            id: authorId,
            username: 'testuser',
            reputation: 100,
            role: { id: 3, name: 'user' }
          },
          parentComment: parentCommentId ? {
            id: parseInt(parentCommentId),
            content: 'Parent comment content...',
            authorUsername: 'parentuser'
          } : undefined,
          stats: {
            voteScore: 0,
            repliesCount: 0
          }
        };

        this.comments.set(commentId, newComment);

        res.status(201).json({
          success: true,
          data: {
            id: newComment.id,
            postId: newComment.postId,
            content: newComment.content,
            isReply: newComment.parentCommentId !== null,
            parentCommentId: newComment.parentCommentId,
            createdAt: newComment.createdAt.toISOString(),
            author: newComment.author,
            parentComment: newComment.parentComment,
            stats: newComment.stats
          },
          message: newComment.parentCommentId ? 'Reply created successfully' : 'Comment created successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // GET /api/posts/:postId/comments
    this.app.get('/api/posts/:postId/comments', (req, res, next) => {
      // Auth opcional
      const authorization = req.headers.authorization;
      if (authorization && authorization.startsWith('Bearer ')) {
        const token = authorization.split(' ')[1];
        if (token && token !== 'invalid.token') {
          req.user = { userId: 1, email: 'test@example.com' };
        }
      }
      next();
    }, async (req, res) => {
      try {
        const postId = parseInt(req.params.postId);
        const {
          page = '1',
          limit = '20',
          sortBy = 'createdAt',
          sortOrder = 'asc',
          includeReplies = 'false'
        } = req.query;

        // Verificar que el post existe
        const post = this.posts.get(postId);
        if (!post) {
          return res.status(404).json({
            success: false,
            error: `Post with id ${postId} not found`
          });
        }

        // Obtener comentarios del post (solo comentarios raíz)
        let comments = Array.from(this.comments.values())
          .filter(comment => comment.postId === postId && comment.parentCommentId === null);

        // Aplicar ordenamiento
        if (sortBy === 'voteScore') {
          comments.sort((a, b) => {
            const order = sortOrder === 'desc' ? -1 : 1;
            return (b.voteScore - a.voteScore) * order;
          });
        } else {
          comments.sort((a, b) => {
            const order = sortOrder === 'desc' ? -1 : 1;
            return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order;
          });
        }

        // Aplicar paginación
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;
        const paginatedComments = comments.slice(skip, skip + limitNum);

        // Formatear comentarios
        const formattedComments = await Promise.all(
          paginatedComments.map(async (comment) => {
            let replies: any[] = [];
            
            // Si se solicitan respuestas, cargarlas
            if (includeReplies === 'true') {
              replies = Array.from(this.comments.values())
                .filter(c => c.parentCommentId === comment.id)
                .map(reply => ({
                  id: reply.id,
                  postId: reply.postId,
                  content: reply.content,
                  isEdited: reply.isEdited,
                  editedAt: reply.editedAt,
                  createdAt: reply.createdAt.toISOString(),
                  isReply: true,
                  parentCommentId: reply.parentCommentId,
                  author: reply.author || null,
                  stats: {
                    voteScore: reply.voteScore || 0,
                    repliesCount: 0,
                    upvotes: Math.max(0, reply.voteScore || 0),
                    downvotes: Math.max(0, -(reply.voteScore || 0))
                  },
                  userVote: null
                }));
            }

            const repliesCount = Array.from(this.comments.values())
              .filter(c => c.parentCommentId === comment.id).length;

            const formattedComment: any = {
              id: comment.id,
              postId: comment.postId,
              content: comment.content,
              isEdited: comment.isEdited,
              editedAt: comment.editedAt,
              createdAt: comment.createdAt.toISOString(),
              isReply: false,
              parentCommentId: comment.parentCommentId,
              author: comment.author || null,
              stats: {
                voteScore: comment.voteScore || 0,
                repliesCount,
                upvotes: Math.max(0, comment.voteScore || 0),
                downvotes: Math.max(0, -(comment.voteScore || 0))
              },
              userVote: null
            };

            if (includeReplies === 'true' && replies.length > 0) {
              formattedComment.replies = replies;
            }

            return formattedComment;
          })
        );

        // Obtener total de comentarios del post
        const totalComments = Array.from(this.comments.values())
          .filter(comment => comment.postId === postId).length;

        res.json({
          success: true,
          data: formattedComments,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: comments.length,
            totalPages: Math.ceil(comments.length / limitNum),
            hasNext: pageNum * limitNum < comments.length,
            hasPrev: pageNum > 1
          },
          postInfo: {
            id: post.id,
            title: post.title,
            isLocked: post.isLocked,
            totalComments
          },
          message: `Found ${formattedComments.length} comments`
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // GET /api/comments/:id/replies
    this.app.get('/api/comments/:id/replies', async (req, res) => {
      res.json({
        success: true,
        data: [],
        message: 'Feature coming soon - replies endpoint'
      });
    });

    // Ruta protegida de prueba
    this.app.get('/api/users/profile', (req, res) => {
      const authorization = req.headers.authorization;
      
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Authorization token is required'
        });
      }

      const token = authorization.split(' ')[1];
      
      if (!token || token === 'invalid.token.here') {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      res.json({
        success: true,
        data: {
          userId: 1,
          email: 'profile@test.com',
          message: 'This is a protected route!'
        }
      });
    });
  }

  // ===== MÉTODOS PARA MANIPULAR DATOS EN TESTS =====
  
  clearUsers() {
    this.users.clear();
  }

  clearInviteCodes() {
    this.inviteCodes.clear();
  }

  clearPosts() {
    this.posts.clear();
  }

  clearComments() {
    this.comments.clear();
  }

  // Métodos para invite codes
  addInviteCode(code: string, createdBy: number, createdAt?: Date) {
    const inviteCode = new InviteCodeEntity(
      code,
      createdBy,
      null,
      null,
      createdAt || new Date()
    );
    this.inviteCodes.set(code, inviteCode);
  }

  markInviteCodeAsUsed(code: string, usedBy: number, username: string) {
    const inviteCode = this.inviteCodes.get(code);
    if (inviteCode) {
      inviteCode.usedBy = usedBy;
      inviteCode.usedAt = new Date();
      inviteCode.user = { id: usedBy, username };
    }
  }

  isInviteCodeUsed(code: string): boolean {
    const inviteCode = this.inviteCodes.get(code);
    return inviteCode ? inviteCode.isUsed() : false;
  }

  getInviteCode(code: string): InviteCodeEntity | undefined {
    return this.inviteCodes.get(code);
  }

  // Métodos para posts
  addPost(postData: {
    id: number;
    title: string;
    content: string;
    isLocked: boolean;
    authorId?: number;
  }): number {
    const post = {
      id: postData.id,
      title: postData.title,
      content: postData.content,
      isLocked: postData.isLocked,
      authorId: postData.authorId || 1,
      createdAt: new Date(),
      updatedAt: null
    };
    this.posts.set(postData.id, post);
    return postData.id;
  }

  getPost(id: number): any {
    return this.posts.get(id);
  }

  // Métodos para comentarios
  addComment(commentData: {
    id: number;
    postId: number;
    content: string;
    authorId: number;
    parentCommentId?: number;
    voteScore?: number;
  }): number {
    const comment = {
      id: commentData.id,
      postId: commentData.postId,
      authorId: commentData.authorId,
      parentCommentId: commentData.parentCommentId || null,
      content: commentData.content,
      isEdited: false,
      editedAt: null,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
      isHidden: false,
      createdAt: new Date(),
      updatedAt: null,
      voteScore: commentData.voteScore || 0,
      author: {
        id: commentData.authorId,
        username: 'testuser',
        reputation: 100,
        role: { id: 3, name: 'user' }
      },
      _count: {
        votes: 0,
        replies: 0
      }
    };
    this.comments.set(commentData.id, comment);
    return commentData.id;
  }

  getComment(id: number): any {
    return this.comments.get(id);
  }

  getCommentsByPostId(postId: number): any[] {
    return Array.from(this.comments.values()).filter(comment => comment.postId === postId);
  }

  // Métodos para controlar el mock de email desde tests
  makeEmailSendingFail() {
    const sendEmailSpy = (this.app as any).sendEmailSpy;
    if (sendEmailSpy) {
      sendEmailSpy.mockRejectedValueOnce(new Error('Email service failed'));
    }
  }

  makeEmailSendingSucceed() {
    const sendEmailSpy = (this.app as any).sendEmailSpy;
    if (sendEmailSpy) {
      sendEmailSpy.mockResolvedValue({
        success: true,
        message: 'Verification email sent successfully',
        tokenId: 1,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
      });
    }
  }
}