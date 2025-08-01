// src/infrastructure/dependencies.ts - CORREGIDO RESPETANDO TU ARQUITECTURA

import { PrismaClient } from "@prisma/client";

// Datasources
import { PrismaUserDatasource } from "./datasources/prisma-user.datasource";
import { PrismaPostDatasource } from "./datasources/prisma-post.datasource";
import { PrismaInviteCodeDatasource } from "./datasources/prisma-invite-code.datasource";
import { PrismaEmailVerificationTokenDatasource } from "./datasources/prisma-email-verification-token.datasource";
import { PrismaCommentDatasource } from "./datasources/prisma-comment.datasource";
import { PrismaCategoryDatasource } from "./datasources/prisma-category.datasource";
import { PrismaChannelDatasource } from "./datasources/prisma-channel.datasource";
import { PrismaUserSettingsDatasource } from "./datasources/prisma-user-settings.datasource";
import { PrismaActivityLogDatasource } from "./datasources/prisma-activity-log.datasource";
import { PrismaPasswordResetTokenDatasource } from "./datasources/prisma-password-reset-token.datasource";
import { PrismaVoteDatasource } from "./datasources/prisma-vote.datasource";
import { PrismaCommentVoteDatasource } from "./datasources/prisma-comment-vote.datasource";

// Repositories
import { UserRepositoryImpl } from "./repositories/user.repository.impl";
import { PostRepositoryImpl } from "./repositories/post.repository.impl";
import { InviteCodeRepositoryImpl } from "./repositories/invite-code.repository.impl";
import { EmailVerificationTokenRepositoryImpl } from "./repositories/email-verification-token.repository.impl";
import { CommentRepositoryImpl } from "./repositories/comment.repository.impl";
import { CategoryRepositoryImpl } from "./repositories/category.repository.impl";
import { ChannelRepositoryImpl } from "./repositories/channel.repository.impl";
import { UserSettingsRepositoryImpl } from "./repositories/user-settings.repository.impl";
import { ActivityLogRepositoryImpl } from "./repositories/activity-log.repository.impl";
import { PasswordResetTokenRepositoryImpl } from "./repositories/password-reset-token.repository.impl";
import { VoteRepositoryImpl } from "./repositories/vote.repository.impl";
import { CommentVoteRepositoryImpl } from "./repositories/comment-vote.repository.impl";

// Use Cases - Auth
import { RegisterUser } from "../domain/use-cases/auth/register-user.use-case";
import { LoginUser } from "../domain/use-cases/auth/login-user.use-case";
import { RequestPasswordReset } from "../domain/use-cases/auth/request-password-reset.use-case";
import { ResetPassword } from "../domain/use-cases/auth/reset-password.use-case";

// Use Cases - Posts
import { CreatePost } from "../domain/use-cases/posts/create-post.use-case";
import { GetPosts } from "../domain/use-cases/posts/get-posts.use-case";
import { GetPostDetail } from "../domain/use-cases/posts/get-post-detail.use-case";
import { UpdatePost } from "../domain/use-cases/posts/update-post.use-case";
import { DeletePost } from "../domain/use-cases/posts/delete-post.use-case";

// Use Cases - Comments
import { CreateComment } from "../domain/use-cases/comments/create-comment.use-case";
import { GetComments } from "../domain/use-cases/comments/get-comments.use-case";
import { UpdateComment } from "../domain/use-cases/comments/update-comment.use-case";
import { DeleteComment } from "../domain/use-cases/comments/delete-comment.use-case";

// Use Cases - Categories & Channels
import { GetCategories } from "../domain/use-cases/categories/get-categories.use-case";
import { GetChannel } from "../domain/use-cases/channel/get-channel.use-case";

// Use Cases - Invites ✅ TODOS LOS IMPORTS CORRECTOS
import { GenerateInviteCode } from "../domain/use-cases/invites/generate-invite-code.use-case";
import { ValidateInviteCode } from "../domain/use-cases/invites/validate-invite-code.use-case";
import { GetInviteCodes } from "../domain/use-cases/invites/get-invite-codes.use-case";
import { DeleteInviteCode } from "../domain/use-cases/invites/delete-invite-code.use-case";
import { GetInviteStats } from "../domain/use-cases/invites/get-invite-stats.use-case";

// Use Cases - Email
import { SendVerificationEmail } from "../domain/use-cases/email/send-verification-email.use-case";
import { VerifyEmail } from "../domain/use-cases/email/verify-email.use-case";

// ✅ Use Cases - User Profile - CORREGIDOS SEGÚN TU ARQUITECTURA
import { GetProfile } from "../domain/use-cases/user/get-profile.use-case";
import { UpdateProfile } from "../domain/use-cases/user/update-profile.use-case";
import { ChangePassword } from "../domain/use-cases/user/change-password.use-case";
import { GetUserSettings, UpdateUserSettings } from '../domain/use-cases/user/update-user-settings.use-case';

// Use Cases - Votes
import { VotePost } from "../domain/use-cases/votes/vote-post.use-case";
import { VoteComment } from "../domain/use-cases/votes/vote-comment.use-case";

// Controllers
import { AuthController } from "../presentation/controllers/auth.controller";
import { PostController } from "../presentation/controllers/post.controller";
import { InviteController } from "../presentation/controllers/invite.controller";
import { EmailVerificationController } from "../presentation/controllers/email-verification.controller";
import { CommentController } from "../presentation/controllers/comment.controller";
import { CategoryController } from "../presentation/controllers/category.controller";
import { ChannelController } from "../presentation/controllers/channel.controller";
import { ProfileController } from "../presentation/controllers/profile.controller";
import { SettingsController } from "../presentation/controllers/settings.controller";
import { PasswordResetController } from "../presentation/controllers/password-reset.controller";
import { VoteController } from "../presentation/controllers/vote.controller";

// Email Adapter
import { createEmailAdapter } from "../config/email.adapter";

export class Dependencies {
  static async create() {
    // Database
    const prisma = new PrismaClient();

    // ===== DATASOURCES =====
    const userDatasource = new PrismaUserDatasource(prisma);
    const postDatasource = new PrismaPostDatasource(prisma);
    const inviteCodeDatasource = new PrismaInviteCodeDatasource(prisma);
    const emailVerificationTokenDatasource = new PrismaEmailVerificationTokenDatasource(prisma);
    const commentDatasource = new PrismaCommentDatasource(prisma);
    const categoryDatasource = new PrismaCategoryDatasource(prisma);
    const channelDatasource = new PrismaChannelDatasource(prisma);
    const userSettingsDatasource = new PrismaUserSettingsDatasource(prisma);
    const activityLogDatasource = new PrismaActivityLogDatasource(prisma);
    const passwordResetTokenDatasource = new PrismaPasswordResetTokenDatasource(prisma);
    const voteDatasource = new PrismaVoteDatasource(prisma);
    const commentVoteDatasource = new PrismaCommentVoteDatasource(prisma);

    // ===== REPOSITORIES =====
    const userRepository = new UserRepositoryImpl(userDatasource);
    const postRepository = new PostRepositoryImpl(postDatasource);
    const inviteCodeRepository = new InviteCodeRepositoryImpl(inviteCodeDatasource);
    const emailVerificationTokenRepository = new EmailVerificationTokenRepositoryImpl(emailVerificationTokenDatasource);
    const commentRepository = new CommentRepositoryImpl(commentDatasource);
    const categoryRepository = new CategoryRepositoryImpl(categoryDatasource);
    const channelRepository = new ChannelRepositoryImpl(channelDatasource);
    const userSettingsRepository = new UserSettingsRepositoryImpl(userSettingsDatasource);
    const activityLogRepository = new ActivityLogRepositoryImpl(activityLogDatasource);
    const passwordResetTokenRepository = new PasswordResetTokenRepositoryImpl(passwordResetTokenDatasource);
    const voteRepository = new VoteRepositoryImpl(voteDatasource);
    const commentVoteRepository = new CommentVoteRepositoryImpl(commentVoteDatasource);

    // ===== EMAIL ADAPTER =====
    const emailAdapter = createEmailAdapter();

    // ===== USE CASES - AUTH =====
    const sendVerificationEmail = new SendVerificationEmail(
      emailVerificationTokenRepository,
      userRepository,
      emailAdapter
    );

    const registerUser = new RegisterUser(
      userRepository,
      inviteCodeRepository,
      sendVerificationEmail
    );

    const loginUser = new LoginUser(userRepository);

    const verifyEmail = new VerifyEmail(
      emailVerificationTokenRepository,
      userRepository
    );

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

    // ===== USE CASES - USER PROFILE ✅ CORREGIDOS =====
    
    // GetProfile constructor: (userRepository, userSettingsRepository, postRepository, commentRepository)
    const getProfile = new GetProfile(
      userRepository,
      userSettingsRepository,
      postRepository,
      commentRepository
    );

    // UpdateProfile constructor: (userRepository, activityLogRepository)
    const updateProfile = new UpdateProfile(
      userRepository,
      activityLogRepository
    );

    // ChangePassword constructor: (userRepository, activityLogRepository)
    const changePassword = new ChangePassword(
      userRepository,
      activityLogRepository
    );

    // GetUserSettings constructor: (userSettingsRepository, userRepository)
    const getUserSettings = new GetUserSettings(
      userSettingsRepository,
      userRepository
    );

    // UpdateUserSettings constructor: (userSettingsRepository, userRepository, activityLogRepository)
    const updateUserSettings = new UpdateUserSettings(
      userSettingsRepository,
      userRepository,
      activityLogRepository
    );

    // ===== USE CASES - POSTS =====
    const createPost = new CreatePost(postRepository, userRepository);
    const getPosts = new GetPosts(postRepository);
    const getPostDetail = new GetPostDetail(postRepository);
    const updatePost = new UpdatePost(postRepository, userRepository);
    const deletePost = new DeletePost(postRepository, userRepository);

    // ===== USE CASES - COMMENTS =====
    const createComment = new CreateComment(
      commentRepository,
      userRepository,
      postRepository
    );
    const getComments = new GetComments(commentRepository, postRepository);
    const updateComment = new UpdateComment(commentRepository, userRepository);
    const deleteComment = new DeleteComment(commentRepository, userRepository);

    // ===== USE CASES - VOTES =====
    const votePost = new VotePost(voteRepository, postRepository, userRepository);
    const voteComment = new VoteComment(commentVoteRepository, commentRepository, userRepository);

    // ===== USE CASES - CATEGORIES & CHANNELS =====
    const getCategories = new GetCategories(categoryRepository, channelRepository);
    const getChannel = new GetChannel(channelRepository);

    // ===== USE CASES - INVITES ✅ TODOS IMPLEMENTADOS =====
    const generateInviteCode = new GenerateInviteCode(inviteCodeRepository, userRepository);
    const validateInviteCode = new ValidateInviteCode(inviteCodeRepository);
    const getInviteCodes = new GetInviteCodes(inviteCodeRepository, userRepository);
    const deleteInviteCode = new DeleteInviteCode(inviteCodeRepository, userRepository);
    const getInviteStats = new GetInviteStats(inviteCodeRepository, userRepository);

    // ===== CONTROLLERS =====
    const authController = new AuthController(registerUser, loginUser);

    const postController = new PostController(
      createPost,
      getPosts,
      getPostDetail,
      updatePost,
      deletePost
    );

    const commentController = new CommentController(
      createComment, 
      getComments,
      updateComment,
      deleteComment
    );

    // ✅ INVITE CONTROLLER CON TODOS LOS USE CASES
    const inviteController = new InviteController(
      generateInviteCode,
      validateInviteCode,
      getInviteCodes,      
      deleteInviteCode,    
      getInviteStats       
    );

    const emailVerificationController = new EmailVerificationController(
      verifyEmail,
      sendVerificationEmail
    );

    const categoryController = new CategoryController(getCategories);
    const channelController = new ChannelController(getChannel);

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

    const voteController = new VoteController(votePost, voteComment);

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
        userSettingsRepository,
        activityLogRepository,
        passwordResetTokenRepository,
        voteRepository,
        commentVoteRepository,
      },

      // Use Cases
      useCases: {
        // Auth
        registerUser,
        loginUser,
        requestPasswordReset,
        resetPassword,
        
        // Profile
        getProfile,
        updateProfile,
        changePassword,
        
        // Settings
        getUserSettings,
        updateUserSettings,

        // Posts
        createPost,
        getPosts,
        getPostDetail,
        updatePost,
        deletePost,

        // Comments
        createComment,
        getComments,
        updateComment,
        deleteComment,

        // Votes
        votePost,
        voteComment,

        // Categories & Channels
        getCategories,
        getChannel,

        // ✅ INVITES - TODOS LOS USE CASES
        generateInviteCode,
        validateInviteCode,
        getInviteCodes,
        deleteInviteCode,
        getInviteStats,

        // Email
        sendVerificationEmail,
        verifyEmail,
      },

      // Controllers
      controllers: {
        authController,
        postController,
        commentController,
        inviteController,
        emailVerificationController,
        categoryController,
        channelController,
        profileController,
        settingsController,
        passwordResetController,
        voteController,
      },
    };
  }
}