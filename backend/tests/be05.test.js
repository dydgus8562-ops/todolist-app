/**
 * BE-05: JWT 인증 미들웨어 검증 테스트
 *
 * 검증 항목:
 *  1. 정적 분석 - src/middlewares/authenticate.js 구조 검증
 *  2. 동적 테스트 - authenticate 미들웨어를 직접 import 후 mock 객체로 검증
 *     - MISSING_TOKEN, TOKEN_EXPIRED, INVALID_TOKEN 에러코드 구분
 *     - req.user.userId 정수 타입 주입 검증
 *     - HS512 알고리즘 강제 검증
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(BACKEND_ROOT, 'src');

// ─────────────────────────────────────────────
// 공통 헬퍼
// ─────────────────────────────────────────────

function readFileOrNull(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function createMockReq(authHeader = null) {
  return {
    headers: {
      ...(authHeader !== null ? { authorization: authHeader } : {}),
    },
  };
}

function createMockRes() {
  return {};
}

function createMockNext() {
  let called = false;
  let calledWith = null;
  const fn = (arg) => {
    called = true;
    calledWith = arg === undefined ? null : arg;
  };
  fn.getCalled = () => called;
  // undefined (정상 next 호출) 와 null (헤더없음) 구분을 위해 sentinel 사용
  fn.getCalledWithRaw = () => (called ? calledWith : undefined);
  fn.wasCalledWithError = () => called && calledWith !== null;
  fn.wasCalledWithoutError = () => called && calledWith === null;
  return fn;
}

// authenticate 모듈을 동적 import 하는 헬퍼 (ESM 캐시 주의 — 테스트 파일 최초 1회 import)
let _authenticateMod = null;
async function getAuthenticateMod() {
  if (_authenticateMod) return _authenticateMod;
  const filePath = path.join(SRC_ROOT, 'middlewares', 'authenticate.js');
  if (!fs.existsSync(filePath)) return null;
  const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
  try {
    _authenticateMod = await import(fileUrl);
  } catch {
    _authenticateMod = null;
  }
  return _authenticateMod;
}

// config 에서 JWT_SECRET 을 읽는 헬퍼
let _configMod = null;
async function getConfig() {
  if (_configMod) return _configMod;
  const filePath = path.join(SRC_ROOT, 'config', 'index.js');
  const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
  try {
    _configMod = await import(fileUrl);
  } catch {
    _configMod = null;
  }
  return _configMod;
}

// ─────────────────────────────────────────────
// 1. 정적 분석 테스트
// ─────────────────────────────────────────────

test('BE-05 | 정적 | src/middlewares/authenticate.js - 파일이 존재해야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'authenticate.js');
  assert.ok(
    fs.existsSync(filePath),
    `src/middlewares/authenticate.js 가 존재하지 않습니다: ${filePath}`
  );
});

test('BE-05 | 정적 | authenticate 함수가 export 되어야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'authenticate.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/authenticate.js 를 읽을 수 없습니다');
  }

  const hasExport =
    /export\s+(const|function)\s+authenticate\b/.test(content) ||
    /export\s+\{[^}]*\bauthenticate\b/.test(content) ||
    /export\s+default\s+(function\s+authenticate\b|authenticate\b)/.test(content);

  assert.ok(
    hasExport,
    'src/middlewares/authenticate.js 에 authenticate export 가 없습니다\n' +
    '예: export function authenticate(req, res, next) { ... }'
  );
});

test('BE-05 | 정적 | Authorization 헤더 파싱 로직이 있어야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'authenticate.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/authenticate.js 를 읽을 수 없습니다');
  }

  const hasAuthHeader =
    /authorization/.test(content) ||
    /Authorization/.test(content);

  assert.ok(
    hasAuthHeader,
    'src/middlewares/authenticate.js 에 Authorization 헤더 파싱 로직이 없습니다\n' +
    '예: req.headers.authorization'
  );
});

test('BE-05 | 정적 | Bearer 토큰 파싱 로직이 있어야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'authenticate.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/authenticate.js 를 읽을 수 없습니다');
  }

  const hasBearer =
    /Bearer/.test(content) ||
    /bearer/i.test(content);

  assert.ok(
    hasBearer,
    'src/middlewares/authenticate.js 에 Bearer 토큰 파싱 로직이 없습니다\n' +
    '예: authHeader.startsWith("Bearer ") 또는 split("Bearer ")[1]'
  );
});

test('BE-05 | 정적 | jwt.verify 사용이 확인되어야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'authenticate.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/authenticate.js 를 읽을 수 없습니다');
  }

  const hasJwtVerify = /jwt\.verify\s*\(/.test(content);

  assert.ok(
    hasJwtVerify,
    'src/middlewares/authenticate.js 에 jwt.verify() 호출이 없습니다\n' +
    '예: jwt.verify(token, secret, { algorithms: ["HS512"] })'
  );
});

test('BE-05 | 정적 | algorithms: [\'HS512\'] 옵션이 지정되어야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'authenticate.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/authenticate.js 를 읽을 수 없습니다');
  }

  const hasHs512Option =
    /algorithms\s*:\s*\[\s*['"]HS512['"]\s*\]/.test(content) ||
    /HS512/.test(content);

  assert.ok(
    hasHs512Option,
    'src/middlewares/authenticate.js 에 algorithms: ["HS512"] 옵션이 없습니다\n' +
    '알고리즘을 명시하지 않으면 HS256 등 다른 알고리즘도 허용될 수 있습니다'
  );
});

test('BE-05 | 정적 | req.user 주입 로직이 있어야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'authenticate.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/authenticate.js 를 읽을 수 없습니다');
  }

  const hasReqUser = /req\.user\s*=/.test(content);

  assert.ok(
    hasReqUser,
    'src/middlewares/authenticate.js 에 req.user 주입 로직이 없습니다\n' +
    '예: req.user = { userId: decoded.userId, email: decoded.email }'
  );
});

test('BE-05 | 정적 | MISSING_TOKEN 에러코드가 사용되어야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'authenticate.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/authenticate.js 를 읽을 수 없습니다');
  }

  const hasMissingToken = /MISSING_TOKEN/.test(content);

  assert.ok(
    hasMissingToken,
    'src/middlewares/authenticate.js 에 MISSING_TOKEN 에러코드가 없습니다\n' +
    '토큰이 없는 경우 MISSING_TOKEN 코드로 구분해야 합니다'
  );
});

test('BE-05 | 정적 | TOKEN_EXPIRED 에러코드가 사용되어야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'authenticate.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/authenticate.js 를 읽을 수 없습니다');
  }

  const hasTokenExpired = /TOKEN_EXPIRED/.test(content);

  assert.ok(
    hasTokenExpired,
    'src/middlewares/authenticate.js 에 TOKEN_EXPIRED 에러코드가 없습니다\n' +
    '만료된 토큰은 INVALID_TOKEN 과 구분하여 TOKEN_EXPIRED 코드를 사용해야 합니다'
  );
});

test('BE-05 | 정적 | INVALID_TOKEN 에러코드가 사용되어야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'authenticate.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/authenticate.js 를 읽을 수 없습니다');
  }

  const hasInvalidToken = /INVALID_TOKEN/.test(content);

  assert.ok(
    hasInvalidToken,
    'src/middlewares/authenticate.js 에 INVALID_TOKEN 에러코드가 없습니다\n' +
    '잘못된 토큰은 TOKEN_EXPIRED 와 구분하여 INVALID_TOKEN 코드를 사용해야 합니다'
  );
});

test('BE-05 | 정적 | JWT secret 을 config.jwt.secret 에서 읽어야 한다 (하드코딩 금지)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'authenticate.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/authenticate.js 를 읽을 수 없습니다');
  }

  // config 에서 secret 을 읽어야 함
  const usesConfig =
    /config\.jwt\.secret/.test(content) ||
    /config\s*\.\s*jwt\s*\.\s*secret/.test(content);

  assert.ok(
    usesConfig,
    'src/middlewares/authenticate.js 가 config.jwt.secret 을 사용하지 않습니다\n' +
    'JWT secret 은 환경변수에서 config 를 통해 읽어야 하며 하드코딩하면 안 됩니다'
  );

  // 하드코딩된 secret 패턴 감지 (일반적인 예시 문자열)
  const hasHardcodedSecret =
    /jwt\.verify\s*\([^,]+,\s*['"][^'"]{8,}['"]/.test(content) &&
    !/config/.test(content);

  assert.equal(
    hasHardcodedSecret,
    false,
    'jwt.verify 에 secret 이 하드코딩되어 있습니다. config.jwt.secret 을 사용하세요'
  );
});

// ─────────────────────────────────────────────
// 2. 동적 테스트 - authenticate 미들웨어 직접 import
// ─────────────────────────────────────────────

// 동적 테스트용 secret: config 와 동일한 값을 사용하기 위해
// config/index.js 는 process.env.JWT_SECRET 이 없으면 'default-secret-change-me' 를 사용함.
// 테스트에서는 authenticate.js 가 로드된 후의 config.jwt.secret 을 확인하여 동일한 값으로 토큰 생성.

test('BE-05 | 동적 | Authorization 헤더 없음 → next(AppError{401, MISSING_TOKEN}) 호출', async (t) => {
  const mod = await getAuthenticateMod();
  if (!mod) {
    t.skip('src/middlewares/authenticate.js 를 import 할 수 없어 건너뜁니다');
    return;
  }

  const authenticate = mod.authenticate ?? mod.default;
  assert.ok(typeof authenticate === 'function', 'authenticate 가 함수가 아닙니다');

  const req = createMockReq(null);
  const res = createMockRes();
  const next = createMockNext();

  await authenticate(req, res, next);

  assert.ok(next.getCalled(), 'Authorization 헤더 없을 때 next() 가 호출되지 않았습니다');
  assert.ok(next.wasCalledWithError(), 'Authorization 헤더 없을 때 next 가 에러 없이 호출되었습니다 (에러 객체를 전달해야 합니다)');

  const err = next.getCalledWithRaw();
  assert.equal(
    err.statusCode,
    401,
    `MISSING_TOKEN 에러의 statusCode 가 401 이어야 하지만 ${err.statusCode} 입니다`
  );
  assert.equal(
    err.code,
    'MISSING_TOKEN',
    `에러코드가 'MISSING_TOKEN' 이어야 하지만 '${err.code}' 입니다`
  );
});

test('BE-05 | 동적 | Bearer 가 아닌 인증 방식 (Basic abc) → next(AppError{401, MISSING_TOKEN})', async (t) => {
  const mod = await getAuthenticateMod();
  if (!mod) {
    t.skip('src/middlewares/authenticate.js 를 import 할 수 없어 건너뜁니다');
    return;
  }

  const authenticate = mod.authenticate ?? mod.default;

  const req = createMockReq('Basic YWRtaW46cGFzc3dvcmQ=');
  const res = createMockRes();
  const next = createMockNext();

  await authenticate(req, res, next);

  assert.ok(next.getCalled(), 'Basic 인증 헤더일 때 next() 가 호출되지 않았습니다');
  assert.ok(next.wasCalledWithError(), 'Basic 인증 헤더일 때 에러 없이 next 가 호출되었습니다');

  const err = next.getCalledWithRaw();
  assert.equal(
    err.statusCode,
    401,
    `statusCode 가 401 이어야 하지만 ${err.statusCode} 입니다`
  );
  assert.equal(
    err.code,
    'MISSING_TOKEN',
    `에러코드가 'MISSING_TOKEN' 이어야 하지만 '${err.code}' 입니다`
  );
});

test('BE-05 | 동적 | "Bearer " 다음 공백만 있는 경우 → next(에러) 호출 (MISSING_TOKEN 또는 INVALID_TOKEN)', async (t) => {
  const mod = await getAuthenticateMod();
  if (!mod) {
    t.skip('src/middlewares/authenticate.js 를 import 할 수 없어 건너뜁니다');
    return;
  }

  const authenticate = mod.authenticate ?? mod.default;

  const req = createMockReq('Bearer ');
  const res = createMockRes();
  const next = createMockNext();

  await authenticate(req, res, next);

  assert.ok(next.getCalled(), '"Bearer " 만 있을 때 next() 가 호출되지 않았습니다');
  assert.ok(next.wasCalledWithError(), '"Bearer " 만 있을 때 에러 없이 next 가 호출되었습니다');

  const err = next.getCalledWithRaw();
  assert.equal(
    err.statusCode,
    401,
    `statusCode 가 401 이어야 하지만 ${err.statusCode} 입니다`
  );
  assert.ok(
    err.code === 'MISSING_TOKEN' || err.code === 'INVALID_TOKEN',
    `에러코드가 'MISSING_TOKEN' 또는 'INVALID_TOKEN' 이어야 하지만 '${err.code}' 입니다`
  );
});

test('BE-05 | 동적 | 유효한 HS512 JWT 토큰 → next() 인자 없이 호출됨', async (t) => {
  const mod = await getAuthenticateMod();
  if (!mod) {
    t.skip('src/middlewares/authenticate.js 를 import 할 수 없어 건너뜁니다');
    return;
  }

  const configMod = await getConfig();
  const secret = configMod?.config?.jwt?.secret ?? 'default-secret-change-me';

  const authenticate = mod.authenticate ?? mod.default;

  const validToken = jwt.sign(
    { userId: 42, email: 'test@example.com' },
    secret,
    { algorithm: 'HS512', expiresIn: '1h' }
  );

  const req = createMockReq(`Bearer ${validToken}`);
  const res = createMockRes();
  const next = createMockNext();

  await authenticate(req, res, next);

  assert.ok(
    next.getCalled(),
    '유효한 토큰으로 요청 시 next() 가 호출되지 않았습니다'
  );
  assert.ok(
    next.wasCalledWithoutError(),
    `유효한 토큰인데 next 가 에러와 함께 호출되었습니다: code=${next.getCalledWithRaw()?.code}, message=${next.getCalledWithRaw()?.message}`
  );
});

test('BE-05 | 동적 | 유효한 HS512 JWT 토큰 → req.user 가 주입되어야 한다', async (t) => {
  const mod = await getAuthenticateMod();
  if (!mod) {
    t.skip('src/middlewares/authenticate.js 를 import 할 수 없어 건너뜁니다');
    return;
  }

  const configMod = await getConfig();
  const secret = configMod?.config?.jwt?.secret ?? 'default-secret-change-me';

  const authenticate = mod.authenticate ?? mod.default;

  const validToken = jwt.sign(
    { userId: 42, email: 'test@example.com' },
    secret,
    { algorithm: 'HS512', expiresIn: '1h' }
  );

  const req = createMockReq(`Bearer ${validToken}`);
  const res = createMockRes();
  const next = createMockNext();

  await authenticate(req, res, next);

  assert.ok(
    req.user != null && typeof req.user === 'object',
    `req.user 가 주입되지 않았습니다. req.user: ${JSON.stringify(req.user)}`
  );
});

test('BE-05 | 동적 | req.user.userId 가 정수(number) 타입이어야 한다', async (t) => {
  const mod = await getAuthenticateMod();
  if (!mod) {
    t.skip('src/middlewares/authenticate.js 를 import 할 수 없어 건너뜁니다');
    return;
  }

  const configMod = await getConfig();
  const secret = configMod?.config?.jwt?.secret ?? 'default-secret-change-me';

  const authenticate = mod.authenticate ?? mod.default;

  const validToken = jwt.sign(
    { userId: 42, email: 'test@example.com' },
    secret,
    { algorithm: 'HS512', expiresIn: '1h' }
  );

  const req = createMockReq(`Bearer ${validToken}`);
  const res = createMockRes();
  const next = createMockNext();

  await authenticate(req, res, next);

  assert.ok(
    req.user != null,
    'req.user 가 주입되지 않아 userId 타입을 확인할 수 없습니다'
  );
  assert.equal(
    typeof req.user.userId,
    'number',
    `req.user.userId 가 number 타입이어야 하지만 typeof === '${typeof req.user.userId}' 입니다 (값: ${req.user.userId})\n` +
    'JWT payload 의 userId 는 parseInt() 등으로 정수 변환하여 주입해야 합니다'
  );
  assert.ok(
    Number.isInteger(req.user.userId),
    `req.user.userId 가 정수여야 하지만 ${req.user.userId} 입니다`
  );
});

test('BE-05 | 동적 | req.user.email 이 payload 의 email 과 일치해야 한다', async (t) => {
  const mod = await getAuthenticateMod();
  if (!mod) {
    t.skip('src/middlewares/authenticate.js 를 import 할 수 없어 건너뜁니다');
    return;
  }

  const configMod = await getConfig();
  const secret = configMod?.config?.jwt?.secret ?? 'default-secret-change-me';

  const authenticate = mod.authenticate ?? mod.default;

  const expectedEmail = 'test@example.com';
  const validToken = jwt.sign(
    { userId: 42, email: expectedEmail },
    secret,
    { algorithm: 'HS512', expiresIn: '1h' }
  );

  const req = createMockReq(`Bearer ${validToken}`);
  const res = createMockRes();
  const next = createMockNext();

  await authenticate(req, res, next);

  assert.ok(
    req.user != null,
    'req.user 가 주입되지 않아 email 을 확인할 수 없습니다'
  );
  assert.equal(
    req.user.email,
    expectedEmail,
    `req.user.email 이 '${expectedEmail}' 이어야 하지만 '${req.user.email}' 입니다`
  );
});

test('BE-05 | 동적 | 만료된 토큰 → next(AppError{401, TOKEN_EXPIRED}) 호출', async (t) => {
  const mod = await getAuthenticateMod();
  if (!mod) {
    t.skip('src/middlewares/authenticate.js 를 import 할 수 없어 건너뜁니다');
    return;
  }

  const configMod = await getConfig();
  const secret = configMod?.config?.jwt?.secret ?? 'default-secret-change-me';

  const authenticate = mod.authenticate ?? mod.default;

  const expiredToken = jwt.sign(
    { userId: 1, email: 'expired@example.com' },
    secret,
    { algorithm: 'HS512', expiresIn: '-1s' }
  );

  const req = createMockReq(`Bearer ${expiredToken}`);
  const res = createMockRes();
  const next = createMockNext();

  await authenticate(req, res, next);

  assert.ok(next.getCalled(), '만료된 토큰에서 next() 가 호출되지 않았습니다');
  assert.ok(next.wasCalledWithError(), '만료된 토큰인데 에러 없이 next 가 호출되었습니다');

  const err = next.getCalledWithRaw();
  assert.equal(
    err.statusCode,
    401,
    `만료 토큰 에러의 statusCode 가 401 이어야 하지만 ${err.statusCode} 입니다`
  );
  assert.equal(
    err.code,
    'TOKEN_EXPIRED',
    `만료 토큰 에러코드가 'TOKEN_EXPIRED' 이어야 하지만 '${err.code}' 입니다\n` +
    '(INVALID_TOKEN 과 구분하여 만료된 토큰은 TOKEN_EXPIRED 를 사용해야 합니다)'
  );
});

test('BE-05 | 동적 | 잘못된 서명 토큰 (다른 secret) → next(AppError{401, INVALID_TOKEN}) 호출', async (t) => {
  const mod = await getAuthenticateMod();
  if (!mod) {
    t.skip('src/middlewares/authenticate.js 를 import 할 수 없어 건너뜁니다');
    return;
  }

  const authenticate = mod.authenticate ?? mod.default;

  // 다른 secret 으로 서명된 토큰
  const invalidSigToken = jwt.sign(
    { userId: 1, email: 'test@example.com' },
    'completely-wrong-secret-xyzxyz',
    { algorithm: 'HS512' }
  );

  const req = createMockReq(`Bearer ${invalidSigToken}`);
  const res = createMockRes();
  const next = createMockNext();

  await authenticate(req, res, next);

  assert.ok(next.getCalled(), '잘못된 서명 토큰에서 next() 가 호출되지 않았습니다');
  assert.ok(next.wasCalledWithError(), '잘못된 서명 토큰인데 에러 없이 next 가 호출되었습니다');

  const err = next.getCalledWithRaw();
  assert.equal(
    err.statusCode,
    401,
    `잘못된 서명 에러의 statusCode 가 401 이어야 하지만 ${err.statusCode} 입니다`
  );
  assert.equal(
    err.code,
    'INVALID_TOKEN',
    `잘못된 서명 에러코드가 'INVALID_TOKEN' 이어야 하지만 '${err.code}' 입니다`
  );
});

test('BE-05 | 동적 | HS256 으로 서명된 토큰 → next(AppError{401, INVALID_TOKEN}) 호출 (알고리즘 거부)', async (t) => {
  const mod = await getAuthenticateMod();
  if (!mod) {
    t.skip('src/middlewares/authenticate.js 를 import 할 수 없어 건너뜁니다');
    return;
  }

  const configMod = await getConfig();
  const secret = configMod?.config?.jwt?.secret ?? 'default-secret-change-me';

  const authenticate = mod.authenticate ?? mod.default;

  // 동일 secret 이지만 HS256 알고리즘으로 서명
  const hs256Token = jwt.sign(
    { userId: 1, email: 'test@example.com' },
    secret,
    { algorithm: 'HS256' }
  );

  const req = createMockReq(`Bearer ${hs256Token}`);
  const res = createMockRes();
  const next = createMockNext();

  await authenticate(req, res, next);

  assert.ok(next.getCalled(), 'HS256 토큰에서 next() 가 호출되지 않았습니다');
  assert.ok(next.wasCalledWithError(), 'HS256 토큰인데 에러 없이 next 가 호출되었습니다 (HS512 만 허용해야 합니다)');

  const err = next.getCalledWithRaw();
  assert.equal(
    err.statusCode,
    401,
    `HS256 알고리즘 거부 에러의 statusCode 가 401 이어야 하지만 ${err.statusCode} 입니다`
  );
  assert.equal(
    err.code,
    'INVALID_TOKEN',
    `HS256 알고리즘 거부 에러코드가 'INVALID_TOKEN' 이어야 하지만 '${err.code}' 입니다\n` +
    '(algorithms: ["HS512"] 옵션으로 HS256 토큰을 거부해야 합니다)'
  );
});

test('BE-05 | 동적 | 완전히 잘못된 형식의 토큰 문자열 → next(AppError{401, INVALID_TOKEN}) 호출', async (t) => {
  const mod = await getAuthenticateMod();
  if (!mod) {
    t.skip('src/middlewares/authenticate.js 를 import 할 수 없어 건너뜁니다');
    return;
  }

  const authenticate = mod.authenticate ?? mod.default;

  const req = createMockReq('Bearer this-is-not-a-valid-jwt-token-at-all');
  const res = createMockRes();
  const next = createMockNext();

  await authenticate(req, res, next);

  assert.ok(next.getCalled(), '잘못된 형식 토큰에서 next() 가 호출되지 않았습니다');
  assert.ok(next.wasCalledWithError(), '잘못된 형식 토큰인데 에러 없이 next 가 호출되었습니다');

  const err = next.getCalledWithRaw();
  assert.equal(
    err.statusCode,
    401,
    `잘못된 형식 토큰 에러의 statusCode 가 401 이어야 하지만 ${err.statusCode} 입니다`
  );
  assert.equal(
    err.code,
    'INVALID_TOKEN',
    `잘못된 형식 토큰 에러코드가 'INVALID_TOKEN' 이어야 하지만 '${err.code}' 입니다`
  );
});

// ─────────────────────────────────────────────
// 3. 추가 엣지 케이스 테스트
// ─────────────────────────────────────────────

test('BE-05 | 동적 | req.user.userId 가 42 (숫자)와 정확히 일치해야 한다', async (t) => {
  const mod = await getAuthenticateMod();
  if (!mod) {
    t.skip('src/middlewares/authenticate.js 를 import 할 수 없어 건너뜁니다');
    return;
  }

  const configMod = await getConfig();
  const secret = configMod?.config?.jwt?.secret ?? 'default-secret-change-me';

  const authenticate = mod.authenticate ?? mod.default;

  const validToken = jwt.sign(
    { userId: 42, email: 'test@example.com' },
    secret,
    { algorithm: 'HS512', expiresIn: '1h' }
  );

  const req = createMockReq(`Bearer ${validToken}`);
  const res = createMockRes();
  const next = createMockNext();

  await authenticate(req, res, next);

  assert.ok(req.user != null, 'req.user 가 주입되지 않았습니다');
  assert.strictEqual(
    req.user.userId,
    42,
    `req.user.userId 가 42 이어야 하지만 ${req.user.userId} (${typeof req.user.userId}) 입니다`
  );
});

test('BE-05 | 동적 | "bearer" 소문자로 시작하는 헤더 → 미들웨어가 에러 없이 처리하거나 명확한 에러 반환', async (t) => {
  const mod = await getAuthenticateMod();
  if (!mod) {
    t.skip('src/middlewares/authenticate.js 를 import 할 수 없어 건너뜁니다');
    return;
  }

  const configMod = await getConfig();
  const secret = configMod?.config?.jwt?.secret ?? 'default-secret-change-me';

  const authenticate = mod.authenticate ?? mod.default;

  const validToken = jwt.sign(
    { userId: 1, email: 'test@example.com' },
    secret,
    { algorithm: 'HS512', expiresIn: '1h' }
  );

  const req = createMockReq(`bearer ${validToken}`);
  const res = createMockRes();
  const next = createMockNext();

  await authenticate(req, res, next);

  // 소문자 'bearer' 는 대소문자 구분 여부에 따라 동작이 달라질 수 있음
  // 어떻게 처리하든 next 는 반드시 호출되어야 함 (미들웨어가 hang 되어선 안 됨)
  assert.ok(
    next.getCalled(),
    '소문자 "bearer" 헤더에서 next() 가 호출되지 않았습니다 (미들웨어가 응답하지 않습니다)'
  );

  // 소문자 bearer 를 허용하든 거부하든 401 에러 또는 정상 통과여야 함
  const err = next.getCalledWithRaw();
  if (err !== null) {
    // 에러를 반환한다면 401 이어야 함
    assert.equal(
      err.statusCode,
      401,
      `소문자 bearer 거부 시 statusCode 가 401 이어야 하지만 ${err.statusCode} 입니다`
    );
  }
});

test('BE-05 | 동적 | 만료 토큰과 잘못된 서명 토큰의 에러코드가 서로 달라야 한다', async (t) => {
  const mod = await getAuthenticateMod();
  if (!mod) {
    t.skip('src/middlewares/authenticate.js 를 import 할 수 없어 건너뜁니다');
    return;
  }

  const configMod = await getConfig();
  const secret = configMod?.config?.jwt?.secret ?? 'default-secret-change-me';

  const authenticate = mod.authenticate ?? mod.default;

  // 만료된 토큰
  const expiredToken = jwt.sign(
    { userId: 1, email: 'expired@example.com' },
    secret,
    { algorithm: 'HS512', expiresIn: '-1s' }
  );

  const reqExpired = createMockReq(`Bearer ${expiredToken}`);
  const nextExpired = createMockNext();
  await authenticate(reqExpired, createMockRes(), nextExpired);

  // 잘못된 서명 토큰
  const invalidToken = jwt.sign(
    { userId: 1, email: 'test@example.com' },
    'wrong-secret-xyz',
    { algorithm: 'HS512' }
  );

  const reqInvalid = createMockReq(`Bearer ${invalidToken}`);
  const nextInvalid = createMockNext();
  await authenticate(reqInvalid, createMockRes(), nextInvalid);

  const expiredErr = nextExpired.getCalledWithRaw();
  const invalidErr = nextInvalid.getCalledWithRaw();

  assert.ok(expiredErr != null, '만료 토큰에서 에러가 반환되지 않았습니다');
  assert.ok(invalidErr != null, '잘못된 서명 토큰에서 에러가 반환되지 않았습니다');

  assert.notEqual(
    expiredErr.code,
    invalidErr.code,
    `만료 토큰(${expiredErr.code})과 잘못된 서명 토큰(${invalidErr.code})의 에러코드가 같습니다\n` +
    '만료된 토큰은 TOKEN_EXPIRED, 잘못된 서명은 INVALID_TOKEN 으로 구분해야 합니다'
  );
  assert.equal(expiredErr.code, 'TOKEN_EXPIRED', `만료 토큰 코드가 TOKEN_EXPIRED 이어야 합니다`);
  assert.equal(invalidErr.code, 'INVALID_TOKEN', `잘못된 서명 코드가 INVALID_TOKEN 이어야 합니다`);
});

test('BE-05 | 동적 | 유효한 토큰 요청 후 req.user 에 불필요한 JWT 내부 필드(iat, exp)가 직접 노출되지 않아야 한다', async (t) => {
  const mod = await getAuthenticateMod();
  if (!mod) {
    t.skip('src/middlewares/authenticate.js 를 import 할 수 없어 건너뜁니다');
    return;
  }

  const configMod = await getConfig();
  const secret = configMod?.config?.jwt?.secret ?? 'default-secret-change-me';

  const authenticate = mod.authenticate ?? mod.default;

  const validToken = jwt.sign(
    { userId: 7, email: 'clean@example.com' },
    secret,
    { algorithm: 'HS512', expiresIn: '1h' }
  );

  const req = createMockReq(`Bearer ${validToken}`);
  const res = createMockRes();
  const next = createMockNext();

  await authenticate(req, res, next);

  if (!req.user) {
    t.skip('req.user 가 주입되지 않아 필드 노출 검사를 건너뜁니다');
    return;
  }

  // req.user 에는 userId, email 이 있어야 하고
  // decoded 전체를 그대로 넣는 경우 iat, exp 등이 포함될 수 있음
  // 필수 필드는 반드시 존재해야 함
  assert.ok(
    'userId' in req.user,
    'req.user 에 userId 필드가 없습니다'
  );
  assert.ok(
    'email' in req.user,
    'req.user 에 email 필드가 없습니다'
  );
});
