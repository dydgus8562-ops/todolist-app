/**
 * BE-04: 공통 미들웨어 검증 테스트
 *
 * 검증 항목:
 *  1. AppError 클래스 (src/utils/AppError.js)
 *  2. errorHandler 미들웨어 (src/middlewares/errorHandler.js)
 *  3. requestLogger 미들웨어 (src/middlewares/requestLogger.js)
 *  4. cors 미들웨어 (src/middlewares/cors.js)
 *  5. app.js 미들웨어 순서 및 모듈 사용
 *  6. 통합 테스트 (child_process 서버 기동)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

/**
 * 지정 포트로 HTTP 요청을 보내고 { statusCode, body, headers } 를 반환.
 */
function httpRequest(host, port, pathname, method = 'GET', timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port, path: pathname, method }, (res) => {
      let body = '';
      res.setEncoding('utf-8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body, headers: res.headers }));
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`HTTP 요청 타임아웃 (${timeoutMs}ms): ${method} ${pathname}`));
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * 서버가 지정 포트에서 응답할 때까지 폴링.
 */
function waitForServer(port, maxAttempts = 20, intervalMs = 300) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryConnect = () => {
      const req = http.request(
        { host: '127.0.0.1', port, path: '/health', method: 'GET' },
        (res) => { res.resume(); resolve(); }
      );
      req.setTimeout(500, () => req.destroy());
      req.on('error', () => {
        attempts += 1;
        if (attempts >= maxAttempts) {
          reject(new Error(`서버가 포트 ${port} 에서 ${maxAttempts * intervalMs}ms 내에 기동되지 않았습니다`));
        } else {
          setTimeout(tryConnect, intervalMs);
        }
      });
      req.end();
    };

    tryConnect();
  });
}

/**
 * child_process 로 서버를 기동하고, 테스트 완료 후 종료하는 헬퍼.
 * callback(port, { stdout, stderr }) 안에서 HTTP 요청 로직을 실행.
 */
async function withTestServer(testPort, callback) {
  const serverPath = path.join(SRC_ROOT, 'server.js');

  const env = {
    ...process.env,
    PORT: String(testPort),
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '1d',
  };

  const proc = spawn(process.execPath, [serverPath], {
    cwd: BACKEND_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  proc.stdout.on('data', (d) => { stdout += d.toString(); });
  proc.stderr.on('data', (d) => { stderr += d.toString(); });

  let startupError = null;
  proc.on('error', (err) => { startupError = err; });

  try {
    await waitForServer(testPort, 20, 300);

    if (startupError) {
      throw new Error(`서버 프로세스 시작 실패: ${startupError.message}`);
    }

    await callback(testPort, { stdout, stderr });
  } finally {
    if (!proc.killed) {
      proc.kill('SIGTERM');
      await new Promise((resolve) => {
        const timer = setTimeout(() => { if (!proc.killed) proc.kill('SIGKILL'); resolve(); }, 500);
        proc.on('close', () => { clearTimeout(timer); resolve(); });
      });
    }
  }
}

// ─────────────────────────────────────────────
// 1. AppError 클래스 검증
// ─────────────────────────────────────────────

test('BE-04 | AppError | src/utils/AppError.js - 파일이 존재해야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'utils', 'AppError.js');
  assert.ok(
    fs.existsSync(filePath),
    `src/utils/AppError.js 가 존재하지 않습니다: ${filePath}`
  );
});

test('BE-04 | AppError | AppError 클래스가 export 되어야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'utils', 'AppError.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/utils/AppError.js 를 읽을 수 없습니다');
  }

  const hasExport =
    /export\s+class\s+AppError\b/.test(content) ||
    /export\s+default\s+class\s+AppError\b/.test(content) ||
    /export\s+\{[^}]*\bAppError\b/.test(content) ||
    /export\s+default\s+AppError\b/.test(content);

  assert.ok(
    hasExport,
    'src/utils/AppError.js 에 AppError 클래스 export 가 없습니다\n' +
    '예: export class AppError extends Error { ... }'
  );
});

test('BE-04 | AppError | 팩토리 메서드 5개가 정적으로 정의되어야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'utils', 'AppError.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/utils/AppError.js 를 읽을 수 없습니다');
  }

  const requiredMethods = ['notFound', 'forbidden', 'conflict', 'unauthorized', 'badRequest'];
  const missing = requiredMethods.filter((method) => {
    // static notFound / static badRequest(...) 등 static 메서드 패턴
    const staticMethod = new RegExp(`static\\s+${method}\\b`).test(content);
    // AppError.notFound = ... 형태의 정적 할당 패턴
    const staticAssign = new RegExp(`AppError\\.${method}\\s*=`).test(content);
    return !(staticMethod || staticAssign);
  });

  assert.deepEqual(
    missing,
    [],
    `AppError 에 다음 팩토리 메서드가 없습니다: ${missing.join(', ')}\n` +
    '(static notFound, forbidden, conflict, unauthorized, badRequest 메서드가 필요합니다)'
  );
});

test('BE-04 | AppError | 생성자가 statusCode, code, message, isOperational 속성을 설정해야 한다 (동적 테스트)', async () => {
  const filePath = path.join(SRC_ROOT, 'utils', 'AppError.js');
  if (!fs.existsSync(filePath)) {
    assert.fail('src/utils/AppError.js 가 존재하지 않아 동적 테스트를 진행할 수 없습니다');
  }

  const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
  let AppError;
  try {
    const mod = await import(fileUrl);
    AppError = mod.AppError ?? mod.default;
  } catch (err) {
    assert.fail(`src/utils/AppError.js import 실패: ${err.message}`);
  }

  assert.ok(typeof AppError === 'function', 'AppError 가 클래스(함수)가 아닙니다');

  const instance = new AppError(422, 'VALIDATION_ERROR', '유효하지 않은 입력입니다');

  assert.equal(
    instance.statusCode,
    422,
    `AppError 인스턴스의 statusCode 가 422 여야 하지만 ${instance.statusCode} 입니다`
  );
  assert.equal(
    instance.code,
    'VALIDATION_ERROR',
    `AppError 인스턴스의 code 가 'VALIDATION_ERROR' 여야 하지만 '${instance.code}' 입니다`
  );
  assert.equal(
    instance.message,
    '유효하지 않은 입력입니다',
    `AppError 인스턴스의 message 가 올바르지 않습니다: ${instance.message}`
  );
  assert.equal(
    instance.isOperational,
    true,
    'AppError 인스턴스의 isOperational 이 true 여야 합니다'
  );
  assert.ok(
    instance instanceof Error,
    'AppError 인스턴스가 Error 를 상속해야 합니다'
  );
});

test('BE-04 | AppError | notFound 팩토리 메서드가 statusCode 404 의 AppError 를 반환해야 한다 (동적 테스트)', async () => {
  const filePath = path.join(SRC_ROOT, 'utils', 'AppError.js');
  if (!fs.existsSync(filePath)) {
    assert.fail('src/utils/AppError.js 가 존재하지 않아 동적 테스트를 진행할 수 없습니다');
  }

  const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
  let AppError;
  try {
    const mod = await import(fileUrl);
    AppError = mod.AppError ?? mod.default;
  } catch (err) {
    assert.fail(`src/utils/AppError.js import 실패: ${err.message}`);
  }

  const err = AppError.notFound('리소스를 찾을 수 없습니다');
  assert.ok(err instanceof AppError, 'notFound() 반환값이 AppError 인스턴스가 아닙니다');
  assert.equal(err.statusCode, 404, `notFound() statusCode 가 404 여야 하지만 ${err.statusCode} 입니다`);
});

test('BE-04 | AppError | unauthorized 팩토리 메서드가 statusCode 401 의 AppError 를 반환해야 한다 (동적 테스트)', async () => {
  const filePath = path.join(SRC_ROOT, 'utils', 'AppError.js');
  if (!fs.existsSync(filePath)) {
    assert.fail('src/utils/AppError.js 가 존재하지 않아 동적 테스트를 진행할 수 없습니다');
  }

  const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
  let AppError;
  try {
    const mod = await import(fileUrl);
    AppError = mod.AppError ?? mod.default;
  } catch (err) {
    assert.fail(`src/utils/AppError.js import 실패: ${err.message}`);
  }

  const err = AppError.unauthorized('인증이 필요합니다');
  assert.ok(err instanceof AppError, 'unauthorized() 반환값이 AppError 인스턴스가 아닙니다');
  assert.equal(err.statusCode, 401, `unauthorized() statusCode 가 401 여야 하지만 ${err.statusCode} 입니다`);
});

test('BE-04 | AppError | forbidden 팩토리 메서드가 statusCode 403 의 AppError 를 반환해야 한다 (동적 테스트)', async () => {
  const filePath = path.join(SRC_ROOT, 'utils', 'AppError.js');
  if (!fs.existsSync(filePath)) {
    assert.fail('src/utils/AppError.js 가 존재하지 않아 동적 테스트를 진행할 수 없습니다');
  }

  const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
  let AppError;
  try {
    const mod = await import(fileUrl);
    AppError = mod.AppError ?? mod.default;
  } catch (err) {
    assert.fail(`src/utils/AppError.js import 실패: ${err.message}`);
  }

  const err = AppError.forbidden('접근 권한이 없습니다');
  assert.ok(err instanceof AppError, 'forbidden() 반환값이 AppError 인스턴스가 아닙니다');
  assert.equal(err.statusCode, 403, `forbidden() statusCode 가 403 여야 하지만 ${err.statusCode} 입니다`);
});

test('BE-04 | AppError | conflict 팩토리 메서드가 statusCode 409 의 AppError 를 반환해야 한다 (동적 테스트)', async () => {
  const filePath = path.join(SRC_ROOT, 'utils', 'AppError.js');
  if (!fs.existsSync(filePath)) {
    assert.fail('src/utils/AppError.js 가 존재하지 않아 동적 테스트를 진행할 수 없습니다');
  }

  const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
  let AppError;
  try {
    const mod = await import(fileUrl);
    AppError = mod.AppError ?? mod.default;
  } catch (err) {
    assert.fail(`src/utils/AppError.js import 실패: ${err.message}`);
  }

  const err = AppError.conflict('이미 존재하는 리소스입니다');
  assert.ok(err instanceof AppError, 'conflict() 반환값이 AppError 인스턴스가 아닙니다');
  assert.equal(err.statusCode, 409, `conflict() statusCode 가 409 여야 하지만 ${err.statusCode} 입니다`);
});

test('BE-04 | AppError | badRequest 팩토리 메서드가 statusCode 400 의 AppError 를 반환해야 한다 (동적 테스트)', async () => {
  const filePath = path.join(SRC_ROOT, 'utils', 'AppError.js');
  if (!fs.existsSync(filePath)) {
    assert.fail('src/utils/AppError.js 가 존재하지 않아 동적 테스트를 진행할 수 없습니다');
  }

  const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
  let AppError;
  try {
    const mod = await import(fileUrl);
    AppError = mod.AppError ?? mod.default;
  } catch (err) {
    assert.fail(`src/utils/AppError.js import 실패: ${err.message}`);
  }

  const err = AppError.badRequest('잘못된 요청입니다');
  assert.ok(err instanceof AppError, 'badRequest() 반환값이 AppError 인스턴스가 아닙니다');
  assert.equal(err.statusCode, 400, `badRequest() statusCode 가 400 여야 하지만 ${err.statusCode} 입니다`);
});

// ─────────────────────────────────────────────
// 2. errorHandler 미들웨어 검증
// ─────────────────────────────────────────────

test('BE-04 | errorHandler | src/middlewares/errorHandler.js - 파일이 존재해야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'errorHandler.js');
  assert.ok(
    fs.existsSync(filePath),
    `src/middlewares/errorHandler.js 가 존재하지 않습니다: ${filePath}`
  );
});

test('BE-04 | errorHandler | errorHandler 함수가 export 되어야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'errorHandler.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/errorHandler.js 를 읽을 수 없습니다');
  }

  const hasExport =
    /export\s+(const|function)\s+errorHandler\b/.test(content) ||
    /export\s+\{[^}]*\berrorHandler\b/.test(content) ||
    /export\s+default\s+(function\s+errorHandler\b|errorHandler\b)/.test(content);

  assert.ok(
    hasExport,
    'src/middlewares/errorHandler.js 에 errorHandler export 가 없습니다\n' +
    '예: export function errorHandler(err, req, res, next) { ... }'
  );
});

test('BE-04 | errorHandler | 4인자 에러 핸들러 시그니처 (err, req, res, next) 를 사용해야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'errorHandler.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/errorHandler.js 를 읽을 수 없습니다');
  }

  // (err, req, res, next) 형태의 4인자 패턴
  const hasFourArgSignature = /\(\s*err\s*,\s*\w+\s*,\s*\w+\s*,\s*\w+\s*\)/.test(content);
  assert.ok(
    hasFourArgSignature,
    'errorHandler 가 4인자 시그니처 (err, req, res, next) 를 사용하지 않습니다\n' +
    'Express 에러 핸들러는 반드시 4개의 인자를 가져야 합니다'
  );
});

test('BE-04 | errorHandler | 표준 에러 응답 형식 { success: false, error: { code, message } } 을 사용해야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'errorHandler.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/errorHandler.js 를 읽을 수 없습니다');
  }

  const hasSuccessFalse = /success\s*:\s*false/.test(content);
  assert.ok(
    hasSuccessFalse,
    'errorHandler 응답에 success: false 패턴이 없습니다\n' +
    '표준 에러 형식: { success: false, error: { code, message } }'
  );

  // error: { code, message } 구조 확인
  const hasErrorObject = /error\s*:\s*\{/.test(content);
  assert.ok(
    hasErrorObject,
    'errorHandler 응답에 error: { ... } 형태의 객체가 없습니다\n' +
    '표준 에러 형식: { success: false, error: { code, message } }'
  );

  const hasCodeField = /\bcode\s*:/.test(content);
  const hasMessageField = /\bmessage\s*:/.test(content);
  assert.ok(
    hasCodeField && hasMessageField,
    `errorHandler 의 error 객체에 code 또는 message 필드가 없습니다\n` +
    `(code 있음: ${hasCodeField}, message 있음: ${hasMessageField})`
  );
});

test('BE-04 | errorHandler | AppError 인스턴스 처리 시 statusCode 와 code 를 사용해야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'errorHandler.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/errorHandler.js 를 읽을 수 없습니다');
  }

  // AppError import 또는 instanceof 확인
  const usesAppError =
    /import\s+.*AppError/.test(content) ||
    /instanceof\s+AppError/.test(content) ||
    /isOperational/.test(content);

  assert.ok(
    usesAppError,
    'errorHandler 가 AppError 를 import 하거나 instanceof/isOperational 로 처리하지 않습니다\n' +
    '(AppError 인스턴스와 일반 Error 를 구분하는 로직이 필요합니다)'
  );

  // statusCode 참조 확인
  const usesStatusCode = /err\.statusCode/.test(content) || /statusCode/.test(content);
  assert.ok(
    usesStatusCode,
    'errorHandler 에서 err.statusCode 를 참조하지 않습니다'
  );
});

test('BE-04 | errorHandler | 비-AppError 예외 발생 시 500 + INTERNAL_SERVER_ERROR 를 반환해야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'errorHandler.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/errorHandler.js 를 읽을 수 없습니다');
  }

  // 500 fallback 패턴
  const has500Fallback =
    /\.status\(\s*500\s*\)/.test(content) ||
    /statusCode\s*\|\|\s*500/.test(content) ||
    /500/.test(content);

  assert.ok(
    has500Fallback,
    'errorHandler 에 500 상태코드 fallback 이 없습니다\n' +
    '비-AppError 예외는 500 으로 처리해야 합니다'
  );

  const hasInternalServerError =
    /INTERNAL_SERVER_ERROR/.test(content);

  assert.ok(
    hasInternalServerError,
    'errorHandler 에 INTERNAL_SERVER_ERROR 코드가 없습니다\n' +
    '비-AppError 예외의 code 는 "INTERNAL_SERVER_ERROR" 여야 합니다'
  );
});

test('BE-04 | errorHandler | 개발 환경에서 스택 트레이스 로그 출력 로직이 있어야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'errorHandler.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/errorHandler.js 를 읽을 수 없습니다');
  }

  // stack 과 로그 출력 로직 모두 존재해야 함
  const hasStackLog =
    /err\.stack/.test(content) ||
    /\.stack/.test(content);

  assert.ok(
    hasStackLog,
    'errorHandler 에 err.stack 을 출력하는 로그 로직이 없습니다\n' +
    '(개발 환경에서는 console.error 등으로 스택 트레이스를 기록해야 합니다)'
  );

  // 환경 분기 로직 (NODE_ENV, development, nodeEnv 등)
  const hasEnvCheck =
    /NODE_ENV/.test(content) ||
    /nodeEnv/.test(content) ||
    /development/.test(content) ||
    /config\.nodeEnv/.test(content);

  assert.ok(
    hasEnvCheck,
    'errorHandler 에 환경(NODE_ENV/development) 분기 로직이 없습니다\n' +
    '(개발 환경에서만 상세 로그를 출력해야 합니다)'
  );
});

test('BE-04 | errorHandler | 응답 본문에 stack 필드를 포함하지 않아야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'errorHandler.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/errorHandler.js 를 읽을 수 없습니다');
  }

  // json({ ... stack ... }) 형태로 stack 을 클라이언트에 전달하는 패턴 검출
  // res.json({ ..., stack: ...}) 또는 { success, error: { ..., stack } } 패턴
  const exposesStackInResponse =
    /json\s*\(\s*\{[^}]*stack\s*:/.test(content) ||
    /error\s*:\s*\{[^}]*stack\s*:/.test(content);

  assert.equal(
    exposesStackInResponse,
    false,
    'errorHandler 가 응답 JSON 에 stack 필드를 포함하고 있습니다\n' +
    '스택 트레이스는 서버 로그에만 기록하고 클라이언트 응답에는 포함하면 안 됩니다'
  );
});

// ─────────────────────────────────────────────
// 3. requestLogger 미들웨어 검증
// ─────────────────────────────────────────────

test('BE-04 | requestLogger | src/middlewares/requestLogger.js - 파일이 존재해야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'requestLogger.js');
  assert.ok(
    fs.existsSync(filePath),
    `src/middlewares/requestLogger.js 가 존재하지 않습니다: ${filePath}`
  );
});

test('BE-04 | requestLogger | requestLogger 함수가 export 되어야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'requestLogger.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/requestLogger.js 를 읽을 수 없습니다');
  }

  const hasExport =
    /export\s+(const|function)\s+requestLogger\b/.test(content) ||
    /export\s+\{[^}]*\brequestLogger\b/.test(content) ||
    /export\s+default\s+(function\s+requestLogger\b|requestLogger\b)/.test(content);

  assert.ok(
    hasExport,
    'src/middlewares/requestLogger.js 에 requestLogger export 가 없습니다\n' +
    '예: export function requestLogger(req, res, next) { ... }'
  );
});

test('BE-04 | requestLogger | method 와 url 로깅 로직이 있어야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'requestLogger.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/requestLogger.js 를 읽을 수 없습니다');
  }

  const hasMethod = /req\.method/.test(content);
  const hasUrl =
    /req\.url\b/.test(content) ||
    /req\.originalUrl\b/.test(content) ||
    /req\.path\b/.test(content);

  assert.ok(
    hasMethod,
    'requestLogger 에 req.method 로깅 로직이 없습니다'
  );
  assert.ok(
    hasUrl,
    'requestLogger 에 req.url / req.originalUrl / req.path 로깅 로직이 없습니다'
  );
});

test('BE-04 | requestLogger | IP 로깅 로직이 있어야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'requestLogger.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/requestLogger.js 를 읽을 수 없습니다');
  }

  const hasIp =
    /req\.ip\b/.test(content) ||
    /req\.socket\.remoteAddress/.test(content) ||
    /x-forwarded-for/i.test(content) ||
    /remoteAddress/.test(content);

  assert.ok(
    hasIp,
    'requestLogger 에 IP 로깅 로직이 없습니다\n' +
    '(req.ip 또는 req.socket.remoteAddress 등을 사용해야 합니다)'
  );
});

test('BE-04 | requestLogger | 소요 시간(duration/elapsed/ms) 로깅 로직이 있어야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'requestLogger.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/requestLogger.js 를 읽을 수 없습니다');
  }

  // 소요 시간 측정: Date.now(), process.hrtime, performance.now 등
  const hasDurationMeasure =
    /Date\.now\(\)/.test(content) ||
    /process\.hrtime/.test(content) ||
    /performance\.now\(\)/.test(content);

  assert.ok(
    hasDurationMeasure,
    'requestLogger 에 소요 시간 측정 로직이 없습니다\n' +
    '(Date.now(), process.hrtime(), performance.now() 등을 사용해야 합니다)'
  );

  // 소요 시간을 응답 완료(finish/close) 이벤트 또는 on('finish') 에서 로깅
  const hasFinishEvent =
    /res\.on\s*\(\s*['"]finish['"]/.test(content) ||
    /res\.on\s*\(\s*['"]close['"]/.test(content) ||
    /on\s*\(\s*['"]finish['"]/.test(content);

  assert.ok(
    hasFinishEvent,
    'requestLogger 에 res.on("finish", ...) 이벤트 리스너가 없습니다\n' +
    '(응답 완료 후 소요 시간을 기록하려면 finish 이벤트를 사용해야 합니다)'
  );
});

test('BE-04 | requestLogger | 상태코드 로깅 로직이 있어야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'requestLogger.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/requestLogger.js 를 읽을 수 없습니다');
  }

  const hasStatusCode =
    /res\.statusCode\b/.test(content) ||
    /statusCode/.test(content);

  assert.ok(
    hasStatusCode,
    'requestLogger 에 res.statusCode 로깅 로직이 없습니다'
  );
});

// ─────────────────────────────────────────────
// 4. cors 미들웨어 검증
// ─────────────────────────────────────────────

test('BE-04 | cors | src/middlewares/cors.js - 파일이 존재해야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'cors.js');
  assert.ok(
    fs.existsSync(filePath),
    `src/middlewares/cors.js 가 존재하지 않습니다: ${filePath}`
  );
});

test('BE-04 | cors | corsMiddleware 또는 default export 가 있어야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'cors.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/cors.js 를 읽을 수 없습니다');
  }

  const hasExport =
    /export\s+(const|function)\s+corsMiddleware\b/.test(content) ||
    /export\s+\{[^}]*\bcorsMiddleware\b/.test(content) ||
    /export\s+default\s+/.test(content);

  assert.ok(
    hasExport,
    'src/middlewares/cors.js 에 corsMiddleware named export 또는 default export 가 없습니다'
  );
});

test('BE-04 | cors | cors 패키지를 import 해야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'cors.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/cors.js 를 읽을 수 없습니다');
  }

  const hasCorsImport =
    /import\s+cors\s+from\s+['"]cors['"]/.test(content) ||
    /import\s+\*\s+as\s+cors\s+from\s+['"]cors['"]/.test(content);

  assert.ok(
    hasCorsImport,
    'src/middlewares/cors.js 에 cors 패키지 import 가 없습니다\n' +
    '예: import cors from "cors"'
  );
});

test('BE-04 | cors | 허용 메서드에 GET, POST, PUT, PATCH, DELETE 가 포함되어야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'cors.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/cors.js 를 읽을 수 없습니다');
  }

  const requiredMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  const missing = requiredMethods.filter((method) => !content.includes(method));

  assert.deepEqual(
    missing,
    [],
    `src/middlewares/cors.js 의 허용 메서드에 다음이 없습니다: ${missing.join(', ')}\n` +
    '(methods 옵션에 GET, POST, PUT, PATCH, DELETE 를 모두 포함해야 합니다)'
  );
});

test('BE-04 | cors | Authorization 헤더를 allowedHeaders 에 포함해야 한다 (정적 분석)', () => {
  const filePath = path.join(SRC_ROOT, 'middlewares', 'cors.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail('src/middlewares/cors.js 를 읽을 수 없습니다');
  }

  const hasAuthorization = /Authorization/.test(content);
  assert.ok(
    hasAuthorization,
    'src/middlewares/cors.js 의 allowedHeaders 에 Authorization 헤더가 없습니다\n' +
    '(JWT Bearer 토큰 전달을 위해 Authorization 헤더를 허용해야 합니다)'
  );
});

// ─────────────────────────────────────────────
// 5. app.js 미들웨어 순서 및 모듈 사용 검증
// ─────────────────────────────────────────────

test('BE-04 | app.js | middlewares/cors.js 를 import 해야 한다 (정적 분석)', () => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  const content = readFileOrNull(appPath);
  if (content === null) {
    assert.fail('src/app.js 를 읽을 수 없습니다');
  }

  const importsCorsMiddleware =
    /from\s+['"][^'"]*middlewares[/\\]cors/.test(content) ||
    /from\s+['"][./]+middlewares\/cors/.test(content) ||
    /from\s+['"][./]+middlewares\\cors/.test(content);

  assert.ok(
    importsCorsMiddleware,
    'src/app.js 가 middlewares/cors.js 를 import 하지 않습니다\n' +
    '(인라인 cors() 대신 분리된 cors 미들웨어 모듈을 사용해야 합니다)\n' +
    '예: import { corsMiddleware } from "./middlewares/cors.js"'
  );
});

test('BE-04 | app.js | middlewares/requestLogger.js 를 import 해야 한다 (정적 분석)', () => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  const content = readFileOrNull(appPath);
  if (content === null) {
    assert.fail('src/app.js 를 읽을 수 없습니다');
  }

  const importsRequestLogger =
    /from\s+['"][^'"]*middlewares[/\\]requestLogger/.test(content) ||
    /from\s+['"][./]+middlewares\/requestLogger/.test(content);

  assert.ok(
    importsRequestLogger,
    'src/app.js 가 middlewares/requestLogger.js 를 import 하지 않습니다\n' +
    '예: import { requestLogger } from "./middlewares/requestLogger.js"'
  );
});

test('BE-04 | app.js | middlewares/errorHandler.js 를 import 해야 한다 (정적 분석)', () => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  const content = readFileOrNull(appPath);
  if (content === null) {
    assert.fail('src/app.js 를 읽을 수 없습니다');
  }

  const importsErrorHandler =
    /from\s+['"][^'"]*middlewares[/\\]errorHandler/.test(content) ||
    /from\s+['"][./]+middlewares\/errorHandler/.test(content);

  assert.ok(
    importsErrorHandler,
    'src/app.js 가 middlewares/errorHandler.js 를 import 하지 않습니다\n' +
    '예: import { errorHandler } from "./middlewares/errorHandler.js"'
  );
});

test('BE-04 | app.js | 미들웨어 등록 순서가 cors → json → requestLogger → errorHandler 여야 한다 (정적 분석)', () => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  const content = readFileOrNull(appPath);
  if (content === null) {
    assert.fail('src/app.js 를 읽을 수 없습니다');
  }

  // 각 미들웨어 app.use() 위치 인덱스 추출
  const corsIndex = content.search(/app\.use\(\s*cors/);
  const jsonIndex = content.search(/app\.use\(\s*express\.json/);
  const loggerIndex = content.search(/app\.use\(\s*requestLogger/);
  const errorHandlerIndex = content.search(/app\.use\(\s*errorHandler/);

  // cors 등록 확인
  assert.ok(
    corsIndex !== -1,
    'app.js 에 app.use(cors...) 등록이 없습니다'
  );

  // json 등록 확인
  assert.ok(
    jsonIndex !== -1,
    'app.js 에 app.use(express.json(...)) 등록이 없습니다'
  );

  // requestLogger 등록 확인
  assert.ok(
    loggerIndex !== -1,
    'app.js 에 app.use(requestLogger...) 등록이 없습니다'
  );

  // errorHandler 등록 확인
  assert.ok(
    errorHandlerIndex !== -1,
    'app.js 에 app.use(errorHandler...) 등록이 없습니다'
  );

  // 순서 검증: cors < json < requestLogger < errorHandler
  assert.ok(
    corsIndex < jsonIndex,
    `미들웨어 순서 오류: cors(${corsIndex}) 가 json(${jsonIndex}) 보다 먼저 등록되어야 합니다`
  );
  assert.ok(
    jsonIndex < loggerIndex,
    `미들웨어 순서 오류: json(${jsonIndex}) 이 requestLogger(${loggerIndex}) 보다 먼저 등록되어야 합니다`
  );
  assert.ok(
    loggerIndex < errorHandlerIndex,
    `미들웨어 순서 오류: requestLogger(${loggerIndex}) 가 errorHandler(${errorHandlerIndex}) 보다 먼저 등록되어야 합니다`
  );
});

// ─────────────────────────────────────────────
// 6. 통합 테스트 (child_process 서버 기동)
// ─────────────────────────────────────────────

test('BE-04 | 통합 | GET /health → 200 응답', async (t) => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  if (!fs.existsSync(appPath)) {
    t.skip('src/app.js 가 없어 통합 테스트를 건너뜁니다');
    return;
  }

  await withTestServer(13590, async (port) => {
    const res = await httpRequest('127.0.0.1', port, '/health');

    assert.equal(
      res.statusCode,
      200,
      `/health 가 200 을 반환해야 하지만 ${res.statusCode} 를 반환했습니다\n응답: ${res.body}`
    );

    let parsed;
    try {
      parsed = JSON.parse(res.body);
    } catch {
      assert.fail(`/health 응답이 유효한 JSON 이 아닙니다: ${res.body}`);
    }

    assert.ok(
      parsed.success === true || typeof parsed.status === 'string',
      `/health 응답이 올바른 형식이 아닙니다: ${JSON.stringify(parsed)}`
    );
  });
});

test('BE-04 | 통합 | GET /nonexistent → 404 + 표준 에러 응답 형식', async (t) => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  if (!fs.existsSync(appPath)) {
    t.skip('src/app.js 가 없어 통합 테스트를 건너뜁니다');
    return;
  }

  await withTestServer(13591, async (port) => {
    const res = await httpRequest('127.0.0.1', port, '/nonexistent-path-be04-test');

    assert.equal(
      res.statusCode,
      404,
      `존재하지 않는 경로가 404 를 반환해야 하지만 ${res.statusCode} 를 반환했습니다\n응답: ${res.body}`
    );

    let parsed;
    try {
      parsed = JSON.parse(res.body);
    } catch {
      assert.fail(`404 응답이 유효한 JSON 이 아닙니다: ${res.body}`);
    }

    // { success: false, error: { code, message } } 형식 검증
    assert.equal(
      parsed.success,
      false,
      `404 응답의 success 가 false 여야 합니다: ${JSON.stringify(parsed)}`
    );
    assert.ok(
      parsed.error != null && typeof parsed.error === 'object',
      `404 응답에 error 객체가 없습니다: ${JSON.stringify(parsed)}`
    );
    assert.equal(
      typeof parsed.error.code,
      'string',
      `404 응답의 error.code 가 문자열이어야 합니다: ${JSON.stringify(parsed.error)}`
    );
    assert.ok(
      parsed.error.code.length > 0,
      `404 응답의 error.code 가 비어 있습니다: ${JSON.stringify(parsed.error)}`
    );
    assert.equal(
      typeof parsed.error.message,
      'string',
      `404 응답의 error.message 가 문자열이어야 합니다: ${JSON.stringify(parsed.error)}`
    );

    // NOT_FOUND 코드 확인
    assert.equal(
      parsed.error.code,
      'NOT_FOUND',
      `404 응답의 error.code 가 'NOT_FOUND' 여야 합니다: ${parsed.error.code}`
    );
  });
});

test('BE-04 | 통합 | CORS 응답 헤더에 Access-Control-Allow-Origin 이 포함되어야 한다', async (t) => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  if (!fs.existsSync(appPath)) {
    t.skip('src/app.js 가 없어 통합 테스트를 건너뜁니다');
    return;
  }

  await withTestServer(13592, async (port) => {
    const res = await httpRequest('127.0.0.1', port, '/health');

    const corsHeader = res.headers['access-control-allow-origin'];
    assert.ok(
      typeof corsHeader === 'string' && corsHeader.length > 0,
      `응답 헤더에 Access-Control-Allow-Origin 이 없습니다\n헤더: ${JSON.stringify(res.headers)}`
    );
  });
});

test('BE-04 | 통합 | 에러 핸들러가 { success: false, error: { code, message } } 형식으로 응답하고 stack 필드를 포함하지 않아야 한다', async (t) => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  if (!fs.existsSync(appPath)) {
    t.skip('src/app.js 가 없어 통합 테스트를 건너뜁니다');
    return;
  }

  // 존재하지 않는 경로로 404 에러 핸들러 경로를 통해 표준 에러 형식 검증
  await withTestServer(13593, async (port) => {
    const res = await httpRequest('127.0.0.1', port, '/trigger-error-handler-be04');

    let parsed;
    try {
      parsed = JSON.parse(res.body);
    } catch {
      assert.fail(`에러 응답이 유효한 JSON 이 아닙니다: ${res.body}`);
    }

    // 표준 에러 형식 검증
    assert.equal(
      parsed.success,
      false,
      `에러 응답의 success 가 false 여야 합니다: ${JSON.stringify(parsed)}`
    );
    assert.ok(
      parsed.error != null && typeof parsed.error === 'object',
      `에러 응답에 error 객체가 없습니다: ${JSON.stringify(parsed)}`
    );
    assert.equal(
      typeof parsed.error.code,
      'string',
      `에러 응답의 error.code 가 문자열이어야 합니다: ${JSON.stringify(parsed.error)}`
    );
    assert.equal(
      typeof parsed.error.message,
      'string',
      `에러 응답의 error.message 가 문자열이어야 합니다: ${JSON.stringify(parsed.error)}`
    );

    // 응답에 stack 필드가 없어야 함 (보안)
    assert.equal(
      'stack' in parsed,
      false,
      `에러 응답 최상위에 stack 필드가 노출되어 있습니다 (보안 위반): ${JSON.stringify(parsed)}`
    );
    assert.equal(
      parsed.error && 'stack' in parsed.error,
      false,
      `에러 응답의 error 객체에 stack 필드가 노출되어 있습니다 (보안 위반): ${JSON.stringify(parsed.error)}`
    );
  });
});
