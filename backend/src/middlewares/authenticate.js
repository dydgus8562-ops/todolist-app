import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * JWT 토큰을 검증하고 req.user에 사용자 정보를 주입하는 미들웨어 (BR-01)
 */
export function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, ERROR_CODES.MISSING_TOKEN, 'Authentication token is missing'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: ['HS512'],
    });

    // decoded = { userId, email, iat, exp }
    req.user = {
      userId: parseInt(decoded.userId, 10),
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError(401, ERROR_CODES.TOKEN_EXPIRED, 'Authentication token has expired'));
    }
    return next(new AppError(401, ERROR_CODES.INVALID_TOKEN, 'Authentication token is invalid'));
  }
}
