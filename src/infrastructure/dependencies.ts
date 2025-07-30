// src/infrastructure/dependencies.ts - CORRIGIDO
import { PrismaClient } from "@prisma/client";

// Datasources existentes
import { PrismaUserDatasource } from "./datasources/prisma-user.datasource";
import { PrismaPostDatasource } from "./datasources/prisma-post.datasource";
import { PrismaInviteCodeDatasource } from "./datasources/prisma-invite-code.datasource";
import { PrismaEmailVerificationTokenDatasource } from "./datasources/prisma-email-verification-token.datasource";
import { PrismaCommentDatasource } from "./datasources/prisma-comment.datasource";
import { PrismaCategoryDatasource } from "./datasources/prisma-category.datasource";
import { PrismaChannelDatasource } from "./datasources/prisma-channel.datasource";

// ✅ NUEVOS DATASOURCES PARA PERFIL
import { PrismaUserSettingsDatasource } from "./datasources/prisma-user-settings.datasource";
import { PrismaActivityLogDatasource } from "./datasources/prisma-activity-log.datasource";
import { PrismaPasswordResetTokenDatasource } from "./datasources/prisma-password-reset-token.datasource";

// Repositories existentes
import { UserRepositoryImpl } from "./repositories/user.repository.impl";
import { PostRepositoryImpl } from "./repositories/post.repository.impl";
import { InviteCodeRepositoryImpl } from "./repositories/invite-code.repository.impl";
import { EmailVerificationTokenRepositoryImpl } from "./repositories/email-verification-token.repository.impl";
import { CommentRepositoryImpl } from "./repositories/comment.repository.impl";
import { CategoryRepositoryImpl } from "./repositories/category.repository.impl";
import { ChannelRepositoryImpl } from "./repositories/channel.repository.impl";

// ✅ NUEVOS REPOSITORIES PARA PERFIL
import { UserSettingsRepositoryImpl } from "./repositories/user-settings.repository.impl"; 
import { ActivityLogRepositoryImpl } from "./repositories/activity-log.repository.impl";
import { PasswordResetTokenRepositoryImpl } from "./repositories/password-reset-token.repository.impl";

// Use Cases existentes
import { RegisterUser } from "../domain/use-cases/auth/register-user.use-case";
import { LoginUser } from "../domain/use-cases/auth/login-user.use-case";
import { CreatePost } from "../domain/use-cases/posts/create-post.use-case";
import { GetPosts } from "../domain/use-cases/posts/get-posts.use-case";
import { GetPostDetail } from "../domain/use-cases/posts/get-post-detail.use-case";
import { UpdatePost } from "../domain/use-cases/posts/update-post.use-case";
import { DeletePost } from "../domain/use-cases/posts/delete-post.use-case";
import { CreateComment } from "../domain/use-cases/comments/create-comment.use-case";
import { GetComments } from "../domain/use-cases/comments/get-comments.use-case";
import { UpdateComment } from "../domain/use-cases/comments/update-comment.use-case"; // ✅ AGREGADO
import { DeleteComment } from "../domain/use-cases/comments/delete-comment.use-case"; // ✅ AGREGADO
import { GetCategories } from "../domain/use-cases/categories/get-categories.use-case";
import { GetChannel } from "@/domain/use-cases/channel/get-channel.use-case";
import { GenerateInviteCode } from "../domain/use-cases/invites/generate-invite-code.use-case";
import { ValidateInviteCode } from "../domain/use-cases/invites/validate-invite-code.use-case";
import { SendVerificationEmail } from "../domain/use-cases/email/send-verification-email.use-case";
import { VerifyEmail } from "../domain/use-cases/email/verify-email.use-case";

// ✅ IMPORTS CORREGIDOS PARA PERFIL
import { GetProfile } from "../domain/use-cases/user/get-profile.use-case";
import { UpdateProfile } from "../domain/use-cases/user/update-profile.use-case";
import { ChangePassword } from "../domain/use-cases/user/change-password.use-case";
import { GetUserSettings, UpdateUserSettings } from '../domain/use-cases/user/update-user-settings.use-case'
import { RequestPasswordReset } from "../domain/use-cases/auth/request-password-reset.use-case";
import { ResetPassword } from "../domain/use-cases/auth/reset-password.use-case"; 

// Controllers existentes
import { AuthController } from "../presentation/controllers/auth.controller";
import { PostController } from "../presentation/controllers/post.controller";
import { InviteController } from "../presentation/controllers/invite.controller";
import { EmailVerificationController } from "../presentation/controllers/email-verification.controller";
import { CommentController } from "../presentation/controllers/comment.controller";
import { CategoryController } from "../presentation/controllers/category.controller";
import { ChannelController } from "../presentation/controllers/channel.controller";

// ✅ NUEVOS CONTROLLERS PARA PERFIL
import { ProfileController } from "../presentation/controllers/profile.controller";
import { SettingsController } from "../presentation/controllers/settings.controller";
import { PasswordResetController } from "../presentation/controllers/password-reset.controller";

// Email Adapter
import { createEmailAdapter } from "../config/email.adapter";

export class Dependencies {
  static async create() {
    // Database
    const prisma = new PrismaClient();

    // Datasources existentes
    const userDatasource = new PrismaUserDatasource(prisma);
    const postDatasource = new PrismaPostDatasource(prisma);
    const inviteCodeDatasource = new PrismaInviteCodeDatasource(prisma);
    const emailVerificationTokenDatasource = new PrismaEmailVerificationTokenDatasource(prisma);
    const commentDatasource = new PrismaCommentDatasource(prisma);
    const categoryDatasource = new PrismaCategoryDatasource(prisma);
    const channelDatasource = new PrismaChannelDatasource(prisma);

    // ✅ NUEVOS DATASOURCES
    const userSettingsDatasource = new PrismaUserSettingsDatasource(prisma);
    const activityLogDatasource = new PrismaActivityLogDatasource(prisma);
    const passwordResetTokenDatasource = new PrismaPasswordResetTokenDatasource(prisma);

    // Repositories existentes
    const userRepository = new UserRepositoryImpl(userDatasource);
    const postRepository = new PostRepositoryImpl(postDatasource);
    const inviteCodeRepository = new InviteCodeRepositoryImpl(inviteCodeDatasource);
    const emailVerificationTokenRepository = new EmailVerificationTokenRepositoryImpl(emailVerificationTokenDatasource);
    const commentRepository = new CommentRepositoryImpl(commentDatasource);
    const categoryRepository = new CategoryRepositoryImpl(categoryDatasource);
    const channelRepository = new ChannelRepositoryImpl(channelDatasource);

    // ✅ NUEVOS REPOSITORIES
    const userSettingsRepository = new UserSettingsRepositoryImpl(userSettingsDatasource);
    const activityLogRepository = new ActivityLogRepositoryImpl(activityLogDatasource);
    const passwordResetTokenRepository = new PasswordResetTokenRepositoryImpl(passwordResetTokenDatasource);

    // Email Adapter
    const emailAdapter = createEmailAdapter();

    // Use Cases - Email
    const sendVerificationEmail = new SendVerificationEmail(
      emailVerificationTokenRepository,
      userRepository,
      emailAdapter
    );

    const verifyEmail = new VerifyEmail(
      emailVerificationTokenRepository,
      userRepository
    );

    // Use Cases - Auth existentes
    const registerUser = new RegisterUser(
      userRepository,
      inviteCodeRepository,
      sendVerificationEmail
    );

    const loginUser = new LoginUser(userRepository);

    // ✅ NUEVOS USE CASES - PASSWORD RESET
    const requestPasswordReset = new RequestPasswordReset(
      userRepository,
      passwordResetTokenRepository,
      emailAdapter,
      activityLogRepository
    );

    const resetPassword = new ResetPassword(
      passwordResetTokenRepository,
      userRepository,
      activityLogRepository
    );

    // ✅ NUEVOS USE CASES - PERFIL
    const getProfile = new GetProfile(
      userRepository,
      userSettingsRepository
    );

    const updateProfile = new UpdateProfile(
      userRepository,
      activityLogRepository
    );

    const changePassword = new ChangePassword(
      userRepository,
      activityLogRepository
    );

    // ✅ NUEVOS USE CASES - CONFIGURACIONES
    const getUserSettings = new GetUserSettings(
      userSettingsRepository,
      userRepository
    );

    const updateUserSettings = new UpdateUserSettings(
      userSettingsRepository,
      userRepository,
      activityLogRepository
    );

    // Use Cases - Posts existentes
    const createPost = new CreatePost(postRepository, userRepository);
    const getPosts = new GetPosts(postRepository);
    const getPostDetail = new GetPostDetail(postRepository);
    const updatePost = new UpdatePost(postRepository, userRepository);
    const deletePost = new DeletePost(postRepository, userRepository);

    // ✅ Use Cases - Comments CORREGIDOS
    const createComment = new CreateComment(
      commentRepository,
      userRepository,
      postRepository
    );
    const getComments = new GetComments(commentRepository, postRepository);
    
    // ✅ NUEVOS USE CASES - COMMENTS
    const updateComment = new UpdateComment(
      commentRepository,
      userRepository
    );
    
    const deleteComment = new DeleteComment(
      commentRepository,
      userRepository
    );

    // Use Cases - Categories & Channels existentes
    const getCategories = new GetCategories(
      categoryRepository,
      channelRepository
    );
    const getChannel = new GetChannel(channelRepository);

    // Use Cases - Invites existentes
    const generateInviteCode = new GenerateInviteCode(
      inviteCodeRepository,
      userRepository
    );
    const validateInviteCode = new ValidateInviteCode(inviteCodeRepository);

    // Controllers existentes
    const authController = new AuthController(registerUser, loginUser);
    const postController = new PostController(
      createPost,
      getPosts,
      getPostDetail,
      updatePost,
      deletePost
    );
    
    // ✅ COMMENT CONTROLLER CORREGIDO
    const commentController = new CommentController(
      createComment, 
      getComments,
      updateComment, // ✅ YA NO ES NULL
      deleteComment  // ✅ YA NO ES NULL
    );
    
    const inviteController = new InviteController(
      generateInviteCode,
      validateInviteCode
    );
    const emailVerificationController = new EmailVerificationController(
      verifyEmail,
      sendVerificationEmail
    );
    const categoryController = new CategoryController(getCategories);
    const channelController = new ChannelController(getChannel);

    // ✅ NUEVOS CONTROLLERS
    const profileController = new ProfileController(
      getProfile,
      updateProfile,
      changePassword
    );

    const settingsController = new SettingsController(
      getUserSettings,
      updateUserSettings
    );

    const passwordResetController = new PasswordResetController(
      requestPasswordReset,
      resetPassword
    );

    return {
      // Repositories
      repositories: {
        userRepository,
        postRepository,
        commentRepository,
        inviteCodeRepository,
        emailVerificationTokenRepository,
        categoryRepository,
        channelRepository,
        // ✅ NUEVOS
        userSettingsRepository,
        activityLogRepository,
        passwordResetTokenRepository,
      },

      // Use Cases
      useCases: {
        // Auth existentes
        registerUser,
        loginUser,

        // ✅ NUEVOS - Auth
        requestPasswordReset,
        resetPassword,

        // ✅ NUEVOS - Profile
        getProfile,
        updateProfile,
        changePassword,

        // ✅ NUEVOS - Settings
        getUserSettings,
        updateUserSettings,

        // Posts existentes
        createPost,
        getPosts,
        getPostDetail,
        updatePost,
        deletePost,

        // ✅ Comments CORREGIDOS
        createComment,
        getComments,
        updateComment, // ✅ AGREGADO
        deleteComment, // ✅ AGREGADO

        // Categories & Channels existentes
        getCategories,
        getChannel,

        // Invites existentes
        generateInviteCode,
        validateInviteCode,

        // Email existentes
        sendVerificationEmail,
        verifyEmail,
      },

      // Controllers
      controllers: {
        authController,
        postController,
        commentController, // ✅ YA FUNCIONA COMPLETAMENTE
        inviteController,
        emailVerificationController,
        categoryController,
        channelController,
        // ✅ NUEVOS
        profileController,
        settingsController,
        passwordResetController,
      },
    };
  }
}