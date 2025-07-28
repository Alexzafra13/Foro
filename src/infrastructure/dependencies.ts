import { PrismaClient } from '@prisma/client';

// Datasources
import { PrismaUserDatasource } from './datasources/prisma-user.datasource';
import { PrismaPostDatasource } from './datasources/prisma-post.datasource';
import { PrismaInviteCodeDatasource } from './datasources/prisma-invite-code.datasource';
import { PrismaEmailVerificationTokenDatasource } from './datasources/prisma-email-verification-token.datasource';

// Repositories
import { UserRepositoryImpl } from './repositories/user.repository.impl';
import { PostRepositoryImpl } from './repositories/post.repository.impl';
import { InviteCodeRepositoryImpl } from './repositories/invite-code.repository.impl';
import { EmailVerificationTokenRepositoryImpl } from './repositories/email-verification-token.repository.impl';

// Use Cases - Auth
import { RegisterUser } from '../domain/use-cases/auth/register-user.use-case';
import { LoginUser } from '../domain/use-cases/auth/login-user.use-case';

// Use Cases - Posts
import { CreatePost } from '../domain/use-cases/posts/create-post.use-case';
import { GetPosts } from '../domain/use-cases/posts/get-posts.use-case';
import { GetPostDetail } from '../domain/use-cases/posts/get-post-detail.use-case';
import { UpdatePost } from '../domain/use-cases/posts/update-post.use-case';
import { DeletePost } from '../domain/use-cases/posts/delete-post.use-case';

// Use Cases - Invites
import { GenerateInviteCode } from '../domain/use-cases/invites/generate-invite-code.use-case';
import { ValidateInviteCode } from '../domain/use-cases/invites/validate-invite-code.use-case';

// Use Cases - Email
import { SendVerificationEmail } from '../domain/use-cases/email/send-verification-email.use-case';
import { VerifyEmail } from '../domain/use-cases/email/verify-email.use-case';

// Controllers
import { AuthController } from '../presentation/controllers/auth.controller';
import { PostController } from '../presentation/controllers/post.controller';
import { InviteController } from '../presentation/controllers/invite.controller';
import { EmailVerificationController } from '../presentation/controllers/email-verification.controller';

// Email Adapter
import { createEmailAdapter } from '../config/email.adapter';

export class Dependencies {
  static async create() {
    // Database
    const prisma = new PrismaClient();
    
    // Datasources
    const userDatasource = new PrismaUserDatasource(prisma);
    const postDatasource = new PrismaPostDatasource(prisma);
    const inviteCodeDatasource = new PrismaInviteCodeDatasource(prisma);
    const emailVerificationTokenDatasource = new PrismaEmailVerificationTokenDatasource(prisma);
    
    // Repositories
    const userRepository = new UserRepositoryImpl(userDatasource);
    const postRepository = new PostRepositoryImpl(postDatasource);
    const inviteCodeRepository = new InviteCodeRepositoryImpl(inviteCodeDatasource);
    const emailVerificationTokenRepository = new EmailVerificationTokenRepositoryImpl(emailVerificationTokenDatasource);
    
    // Email Adapter
    const emailAdapter = createEmailAdapter();
    
    // Use Cases - Email
    const sendVerificationEmail = new SendVerificationEmail(
      emailVerificationTokenRepository, 
      userRepository, 
      emailAdapter
    );
    const verifyEmail = new VerifyEmail(emailVerificationTokenRepository, userRepository);
    
    // Use Cases - Auth (ACTUALIZADO con email verification)
    const registerUser = new RegisterUser(userRepository, inviteCodeRepository, sendVerificationEmail);
    const loginUser = new LoginUser(userRepository);
    
    // Use Cases - Posts
    const createPost = new CreatePost(postRepository, userRepository);
    const getPosts = new GetPosts(postRepository);
    const getPostDetail = new GetPostDetail(postRepository);
    const updatePost = new UpdatePost(postRepository, userRepository);
    const deletePost = new DeletePost(postRepository, userRepository);
    
    // Use Cases - Invites
    const generateInviteCode = new GenerateInviteCode(inviteCodeRepository, userRepository);
    const validateInviteCode = new ValidateInviteCode(inviteCodeRepository);
    
    // Controllers
    const authController = new AuthController(registerUser, loginUser);
    const postController = new PostController(
      createPost, 
      getPosts, 
      getPostDetail, 
      updatePost, 
      deletePost
    );
    const inviteController = new InviteController(generateInviteCode, validateInviteCode);
    const emailVerificationController = new EmailVerificationController(verifyEmail, sendVerificationEmail);
    
    return {
      prisma,
      controllers: {
        authController,
        postController,
        inviteController,
        emailVerificationController,
      },
    };
  }
}