export class CustomError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly name: string = 'CustomError'
  ) {
    super(message);
    this.name = name;
    
    // Mantiene el stack trace correcto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomError);
    }
  }

  // Métodos estáticos para errores comunes
  static badRequest(message: string) {
    return new CustomError(400, message, 'BadRequestError');
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new CustomError(401, message, 'UnauthorizedError');
  }

  static forbidden(message: string = 'Forbidden') {
    return new CustomError(403, message, 'ForbiddenError');
  }

  static notFound(message: string = 'Resource not found') {
    return new CustomError(404, message, 'NotFoundError');
  }

  static conflict(message: string) {
    return new CustomError(409, message, 'ConflictError');
  }

  static unprocessableEntity(message: string) {
    return new CustomError(422, message, 'UnprocessableEntityError');
  }

  static internalServer(message: string = 'Internal server error') {
    return new CustomError(500, message, 'InternalServerError');
  }

  // Método para serializar el error
  toJson() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: new Date().toISOString()
    };
  }
}