// src/shared/errors/domain.errors.ts (COMPLETO)
import { CustomError } from "./custom.error";

export class DomainError extends CustomError {
  constructor(message: string, statusCode: number = 400) {
    super(statusCode, message, 'DomainError');
  }
}

// Errores específicos del dominio del foro
export class UserErrors {
  static emailAlreadyExists(email: string) {
    return new DomainError(`User with email ${email} already exists`, 409);
  }

  static usernameAlreadyExists(username: string) {
    return new DomainError(`Username ${username} is already taken`, 409);
  }

  static userNotFound(identifier: string | number) {
    return new DomainError(`User ${identifier} not found`, 404);
  }

  static invalidCredentials() {
    return new DomainError('Invalid email or password', 401);
  }

  static insufficientPermissions() {
    return new DomainError('Insufficient permissions for this action', 403);
  }
}

export class PostErrors {
  static postNotFound(id: number) {
    return new DomainError(`Post with id ${id} not found`, 404);
  }

  static cannotVoteOwnPost() {
    return new DomainError('Cannot vote on your own post', 400);
  }

  static postIsLocked() {
    return new DomainError('Cannot perform action on locked post', 400);
  }

  static channelNotFound(id: number) {
    return new DomainError(`Channel with id ${id} not found`, 404);
  }

  static notChannelMember() {
    return new DomainError('User is not a member of this private channel', 403);
  }

  static cannotEditPost() {
    return new DomainError('You can only edit your own posts', 403);
  }

  static cannotDeletePost() {
    return new DomainError('You can only delete your own posts', 403);
  }
}

export class AuthErrors {
  static invalidToken() {
    return new DomainError('Invalid or expired token', 401);
  }

  static tokenRequired() {
    return new DomainError('Authorization token is required', 401);
  }

  static sessionExpired() {
    return new DomainError('Session has expired, please login again', 401);
  }
}

export class ValidationErrors {
  static requiredField(field: string) {
    return new DomainError(`${field} is required`, 400);
  }

  static invalidFormat(field: string, format: string) {
    return new DomainError(`${field} must be a valid ${format}`, 400);
  }

  static minLength(field: string, minLength: number) {
    return new DomainError(`${field} must be at least ${minLength} characters long`, 400);
  }

  static maxLength(field: string, maxLength: number) {
    return new DomainError(`${field} must not exceed ${maxLength} characters`, 400);
  }
}

// 🔥 NUEVOS ERRORES PARA CÓDIGOS DE INVITACIÓN
export class InviteCodeErrors {
  static codeNotFound(code: string) {
    return new DomainError(`Invite code '${code}' not found`, 404);
  }

  static codeAlreadyUsed(code: string, usedBy: string, usedAt: Date) {
    return new DomainError(
      `Invite code '${code}' was already used by ${usedBy} on ${usedAt.toLocaleDateString()}`, 
      409
    );
  }

  static codeExpired(code: string, expiresAt: Date) {
    return new DomainError(
      `Invite code '${code}' expired on ${expiresAt.toLocaleDateString()}`, 
      410
    );
  }

  static codeAlreadyExists(code: string) {
    return new DomainError(`Invite code '${code}' already exists`, 409);
  }

  static invalidCodeFormat(code: string) {
    return new DomainError(`Invalid invite code format: '${code}'`, 400);
  }

  static cannotGenerateCode() {
    return new DomainError('Only administrators and moderators can generate invite codes', 403);
  }

  static codeGenerationFailed() {
    return new DomainError('Failed to generate invite code', 500);
  }
}

// 🔥 ERRORES ESPECÍFICOS PARA CHANNELS (para futuro uso)
export class ChannelErrors {
  static channelNotFound(id: number) {
    return new DomainError(`Channel with id ${id} not found`, 404);
  }

  static channelNameExists(name: string) {
    return new DomainError(`Channel name '${name}' already exists`, 409);
  }

  static privateChannelAccess(channelName: string) {
    return new DomainError(`Access denied to private channel '${channelName}'`, 403);
  }

  static notChannelMember(channelName: string) {
    return new DomainError(`You are not a member of channel '${channelName}'`, 403);
  }

  static cannotLeaveChannel(channelName: string) {
    return new DomainError(`Cannot leave channel '${channelName}'`, 400);
  }
}

// 🔥 ERRORES PARA COMENTARIOS (para futuro uso)
export class CommentErrors {
  static commentNotFound(id: number) {
    return new DomainError(`Comment with id ${id} not found`, 404);
  }

  static cannotEditComment() {
    return new DomainError('You can only edit your own comments', 403);
  }

  static cannotDeleteComment() {
    return new DomainError('You can only delete your own comments', 403);
  }

  static commentTooDeep() {
    return new DomainError('Comment nesting too deep', 400);
  }

  static postIsLocked() {
    return new DomainError('Cannot comment on locked post', 400);
  }
}

// 🔥 ERRORES PARA SISTEMA DE VOTOS (para futuro uso)
export class VoteErrors {
  static cannotVoteOwnContent() {
    return new DomainError('Cannot vote on your own content', 400);
  }

  static alreadyVoted() {
    return new DomainError('You have already voted on this content', 409);
  }

  static voteNotFound() {
    return new DomainError('Vote not found', 404);
  }

  static cannotVoteLockedContent() {
    return new DomainError('Cannot vote on locked content', 400);
  }
}

// 🔥 ERRORES PARA NOTIFICACIONES (para futuro uso)
export class NotificationErrors {
  static notificationNotFound(id: number) {
    return new DomainError(`Notification with id ${id} not found`, 404);
  }

  static cannotAccessNotification() {
    return new DomainError('Cannot access notification that does not belong to you', 403);
  }

  static notificationAlreadyRead() {
    return new DomainError('Notification is already marked as read', 400);
  }
}

// 🔥 ERRORES PARA MODERACIÓN (para futuro uso)
export class ModerationErrors {
  static reportNotFound(id: number) {
    return new DomainError(`Report with id ${id} not found`, 404);
  }

  static alreadyReported() {
    return new DomainError('You have already reported this content', 409);
  }

  static cannotReportOwnContent() {
    return new DomainError('Cannot report your own content', 400);
  }

  static userAlreadyBanned() {
    return new DomainError('User is already banned', 409);
  }

  static cannotBanAdmin() {
    return new DomainError('Cannot ban administrators', 403);
  }

  static contentAlreadyModerated() {
    return new DomainError('Content has already been moderated', 409);
  }
}