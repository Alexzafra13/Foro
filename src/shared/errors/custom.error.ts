// src/shared/errors/custom.error.ts - ACTUALIZADO CON CODE
export class CustomError extends Error {
  public readonly code?: string; // ✅ AGREGAR ESTA LÍNEA

  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly name: string = 'CustomError',
    code?: string // ✅ AGREGAR PARÁMETRO OPCIONAL
  ) {
    super(message);
    this.name = name;
    this.code = code; // ✅ ASIGNAR CODE
    
    // Mantiene el stack trace correcto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomError);
    }
  }

  // Métodos estáticos para errores comunes
  static badRequest(message: string, code?: string) {
    return new CustomError(400, message, 'BadRequestError', code);
  }

  static unauthorized(message: string = 'Unauthorized', code?: string) {
    return new CustomError(401, message, 'UnauthorizedError', code);
  }

  static forbidden(message: string = 'Forbidden', code?: string) {
    return new CustomError(403, message, 'ForbiddenError', code);
  }

  static notFound(message: string = 'Resource not found', code?: string) {
    return new CustomError(404, message, 'NotFoundError', code);
  }

  static conflict(message: string, code?: string) {
    return new CustomError(409, message, 'ConflictError', code);
  }

  static unprocessableEntity(message: string, code?: string) {
    return new CustomError(422, message, 'UnprocessableEntityError', code);
  }

  static internalServer(message: string = 'Internal server error', code?: string) {
    return new CustomError(500, message, 'InternalServerError', code);
  }

  // Método para serializar el error
  toJson() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      timestamp: new Date().toISOString()
    };
  }
}