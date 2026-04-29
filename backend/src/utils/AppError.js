import { ERROR_CODES } from '../constants/errorCodes.js';

export class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    try {
      Error.captureStackTrace(this, this.constructor);
    } catch (_e) {
      // V8 전용 메서드 — 비 V8 환경에서는 무시
    }
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, ERROR_CODES.NOT_FOUND, message);
  }

  static forbidden(message = 'Access forbidden') {
    return new AppError(403, ERROR_CODES.FORBIDDEN, message);
  }

  static conflict(message = 'Resource already exists', code = ERROR_CODES.VALIDATION_ERROR) {
    return new AppError(409, code, message);
  }

  static unauthorized(message = 'Unauthorized', code = ERROR_CODES.INVALID_CREDENTIALS) {
    return new AppError(401, code, message);
  }

  static badRequest(message = 'Bad request', code = ERROR_CODES.VALIDATION_ERROR) {
    return new AppError(400, code, message);
  }
}
