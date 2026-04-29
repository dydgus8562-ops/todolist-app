import { config } from '../config/index.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

export function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal Server Error';

  // 1. pg UNIQUE 위반 (23505) 처리
  if (err.code === '23505') {
    statusCode = 409;
    if (err.constraint === 'users_email_key') {
      code = ERROR_CODES.DUPLICATE_EMAIL;
      message = 'Email is already in use';
    } else if (err.constraint === 'uk_categories_user_name') {
      code = ERROR_CODES.DUPLICATE_CATEGORY;
      message = 'Category name already exists for this user';
    } else {
      code = ERROR_CODES.VALIDATION_ERROR;
      message = 'Duplicate resource';
    }
  }

  // 2. JWT 관련 에러 처리
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = ERROR_CODES.INVALID_TOKEN;
    message = 'Authentication token is invalid';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = ERROR_CODES.TOKEN_EXPIRED;
    message = 'Authentication token has expired';
  }

  // 3. Operational 에러가 아닌 경우 (예상치 못한 에러)
  const isOperational = err.isOperational === true || statusCode !== 500;
  if (!isOperational) {
    message = 'Internal Server Error';
  }

  if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
    if (statusCode === 500) {
      console.error('[ErrorHandler] UNEXPECTED ERROR:', err.stack || err);
    } else {
      console.log(`[ErrorHandler] ${statusCode} ${code}: ${message}`);
    }
  } else {
    if (statusCode === 500) {
      console.error('[ErrorHandler] UNEXPECTED ERROR:', code);
    }
  }

  res.status(statusCode).json({
    success: false,
    error: { code: code, message: message },
  });
}
