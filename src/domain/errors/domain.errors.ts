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