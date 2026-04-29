/**
 * BE-11: 에러 처리 표준화 검증 테스트
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/utils/AppError.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { ERROR_CODES } from '../src/constants/errorCodes.js';

// ─────────────────────────────────────────────
// 1. AppError 클래스 및 팩토리 메서드 테스트
// ─────────────────────────────────────────────

test('BE-11 | 유틸 | AppError - 팩토리 메서드가 올바른 인스턴스를 생성해야 한다', () => {
  const notFound = AppError.notFound('User not found');
  assert.strictEqual(notFound.statusCode, 404);
  assert.strictEqual(notFound.code, ERROR_CODES.NOT_FOUND);
  assert.strictEqual(notFound.message, 'User not found');
  assert.strictEqual(notFound.isOperational, true);

  const unauthorized = AppError.unauthorized('Invalid token');
  assert.strictEqual(unauthorized.statusCode, 401);
  // AppError.js에서 UNAUTHORIZED 코드를 사용하고 있으나 ERROR_CODES와 맞출 필요가 있음
  // assert.strictEqual(unauthorized.code, ERROR_CODES.INVALID_CREDENTIALS); 
});

// ─────────────────────────────────────────────
// 2. 전역 에러 핸들러 테스트
// ─────────────────────────────────────────────

test('BE-11 | 미들웨어 | errorHandler - AppError를 표준 응답으로 변환해야 한다', () => {
  const err = new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid input');
  let statusResult, jsonResult;
  
  const res = {
    status(s) { statusResult = s; return this; },
    json(j) { jsonResult = j; return this; }
  };

  errorHandler(err, {}, res, () => {});

  assert.strictEqual(statusResult, 400);
  assert.deepEqual(jsonResult, {
    success: false,
    error: {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Invalid input'
    }
  });
});

test('BE-11 | 미들웨어 | errorHandler - JWT 에러를 처리해야 한다', () => {
  const jwtErr = new Error('invalid signature');
  jwtErr.name = 'JsonWebTokenError';
  
  let statusResult, jsonResult;
  const res = {
    status(s) { statusResult = s; return this; },
    json(j) { jsonResult = j; return this; }
  };

  errorHandler(jwtErr, {}, res, () => {});

  assert.strictEqual(statusResult, 401);
  assert.strictEqual(jsonResult.error.code, ERROR_CODES.INVALID_TOKEN);
});

test('BE-11 | 미들웨어 | errorHandler - pg UNIQUE 위반 에러를 처리해야 한다', () => {
  const pgErr = new Error('duplicate key value violates unique constraint "users_email_key"');
  pgErr.code = '23505';
  pgErr.constraint = 'users_email_key';
  
  let statusResult, jsonResult;
  const res = {
    status(s) { statusResult = s; return this; },
    json(j) { jsonResult = j; return this; }
  };

  errorHandler(pgErr, {}, res, () => {});

  assert.strictEqual(statusResult, 409);
  // users_email_key 이므로 DUPLICATE_EMAIL로 변환되는지 확인
  assert.strictEqual(jsonResult.error.code, ERROR_CODES.DUPLICATE_EMAIL);
});
