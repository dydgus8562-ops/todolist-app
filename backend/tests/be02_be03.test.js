/**
 * BE-02: 앱 기본 구조 / BE-03: DB 연결 모듈 검증 테스트
 *
 * 검증 항목 (BE-02):
 *  1. src/app.js 파일 존재 및 Express app default export 구조
 *  2. src/server.js 가 src/app.js 를 import (app+server 분리)
 *  3. GET /health → 200 응답
 *  4. 존재하지 않는 경로 → 404 + 표준 에러 응답 형식
 *  5. 에러 핸들러 → 500 + 표준 에러 응답 형식
 *  6. 필수 디렉토리 존재 확인
 *  7. cors, express.json 미들웨어 등록 확인 (소스 분석)
 *  8. express.json body limit 1mb 확인 (소스 분석)
 *  9. constants 모듈 중앙 관리 확인
 *
 * 검증 항목 (BE-03):
 *  1. src/config/db.js 파일 존재
 *  2. query, getClient, pool 3가지 export 확인 (소스 분석)
 *  3. testConnection 함수 export 확인 (소스 분석)
 *  4. dotenv 직접 사용 금지 - config 모듈 경유 확인 (소스 분석)
 *  5. Pool 설정이 config 모듈에서 읽힘 (소스 분석)
 *  6. src/server.js 가 testConnection 호출 확인 (소스 분석)
 *  7. pool.on('error') 핸들러 등록 확인 (소스 분석)
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
 * callback(port) 안에서 HTTP 요청 로직을 실행.
 */
async function withTestServer(testPort, callback) {
  const serverPath = path.join(SRC_ROOT, 'server.js');

  const env = {
    ...process.env,
    PORT: String(testPort),
    NODE_ENV: 'test',
    DB_HOST: '127.0.0.1',
    DB_PORT: '5432',
    DB_NAME: 'test_db',
    DB_USER: 'test_user',
    DB_PASSWORD: 'test_password',
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
// BE-02: 파일 및 디렉토리 구조 검증 (정적)
// ─────────────────────────────────────────────

test('BE-02 | src/app.js - 파일이 존재해야 한다', () => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  assert.ok(
    fs.existsSync(appPath),
    `src/app.js 가 존재하지 않습니다: ${appPath}\n` +
    '(BE-02: app+server 분리를 위해 app.js 를 생성하세요)'
  );
});

test('BE-02 | src/app.js - Express app 을 default export 해야 한다 (소스 분석)', () => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  const content = readFileOrNull(appPath);
  if (content === null) {
    assert.fail('src/app.js 를 읽을 수 없습니다');
  }

  // "export default app" 패턴 확인
  assert.ok(
    /export\s+default\s+app\b/.test(content),
    'src/app.js 에 "export default app" 구문이 없습니다\n' +
    'Express app 인스턴스를 default export 해야 합니다'
  );
});

test('BE-02 | src/server.js - src/app.js 를 import 해야 한다 (app+server 분리 확인)', () => {
  const serverPath = path.join(SRC_ROOT, 'server.js');
  const content = readFileOrNull(serverPath);
  if (content === null) {
    assert.fail('src/server.js 를 읽을 수 없습니다');
  }

  // import ... from './app.js' 또는 from '../app.js' 등 app.js import 패턴
  const hasAppImport = /from\s+['"][^'"]*app\.js['"]/.test(content) ||
                       /import\s+['"][^'"]*app\.js['"]/.test(content);

  assert.ok(
    hasAppImport,
    'src/server.js 에서 app.js 를 import 하지 않습니다\n' +
    '(BE-02: app 생성과 서버 기동 로직을 분리해야 합니다)'
  );
});

test('BE-02 | 필수 디렉토리 6개가 모두 존재해야 한다', () => {
  const requiredDirs = [
    'routes',
    'controllers',
    'services',
    'repositories',
    'middlewares',
    'utils',
  ];

  const missing = requiredDirs.filter((dir) => {
    const dirPath = path.join(SRC_ROOT, dir);
    return !fs.existsSync(dirPath);
  });

  assert.deepEqual(
    missing,
    [],
    `다음 디렉토리가 src/ 에 존재하지 않습니다: ${missing.join(', ')}\n` +
    '(각 디렉토리를 생성하세요. .gitkeep 파일 포함 가능)'
  );
});

// ─────────────────────────────────────────────
// BE-02: app.js 미들웨어 구성 검증 (소스 분석)
// ─────────────────────────────────────────────

test('BE-02 | src/app.js - cors 미들웨어가 등록되어야 한다 (소스 분석)', () => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  const content = readFileOrNull(appPath);
  if (content === null) {
    assert.fail('src/app.js 를 읽을 수 없습니다');
  }

  // 직접 import 방식 또는 미들웨어 모듈 방식 모두 허용
  const hasCorsDirectImport = /import\s+cors\s+from/.test(content);
  const hasCorsModuleImport = /middlewares\/cors/.test(content) || /corsMiddleware/.test(content);
  const hasCorsImport = hasCorsDirectImport || hasCorsModuleImport;

  const hasCorsUse = /app\.use\(\s*cors\s*[(\)]/.test(content) ||
                     /app\.use\(\s*cors\b/.test(content) ||
                     /app\.use\(\s*corsMiddleware\b/.test(content);

  assert.ok(
    hasCorsImport,
    'src/app.js 에 cors import 가 없습니다 (직접 import 또는 middlewares/cors.js 모듈)'
  );
  assert.ok(
    hasCorsUse,
    'src/app.js 에 cors 미들웨어 등록이 없습니다 (app.use(cors(...)) 또는 app.use(corsMiddleware))'
  );
});

test('BE-02 | src/app.js - express.json 미들웨어가 등록되어야 한다 (소스 분석)', () => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  const content = readFileOrNull(appPath);
  if (content === null) {
    assert.fail('src/app.js 를 읽을 수 없습니다');
  }

  const hasJsonMiddleware = /app\.use\(\s*express\.json\s*\(/.test(content);

  assert.ok(
    hasJsonMiddleware,
    'src/app.js 에 express.json() 미들웨어 등록이 없습니다 (app.use(express.json(...)))'
  );
});

test('BE-02 | src/app.js - express.json body limit 이 1mb 로 설정되어야 한다 (소스 분석)', () => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  const content = readFileOrNull(appPath);
  if (content === null) {
    assert.fail('src/app.js 를 읽을 수 없습니다');
  }

  // limit: '1mb' 또는 limit: "1mb" 패턴
  const hasLimitConfig = /limit\s*:\s*['"]1mb['"]/.test(content);

  assert.ok(
    hasLimitConfig,
    'src/app.js 의 express.json() 에 limit: "1mb" 옵션이 없습니다\n' +
    '예: app.use(express.json({ limit: "1mb" }))'
  );
});

// ─────────────────────────────────────────────
// BE-02: constants 모듈 중앙 관리 검증 (정적)
// ─────────────────────────────────────────────

test('BE-02 | src/constants/httpStatus.js - HTTP_STATUS 상수가 export 되어야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'constants', 'httpStatus.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail(`src/constants/httpStatus.js 를 읽을 수 없습니다: ${filePath}`);
  }

  assert.ok(
    /export\s+const\s+HTTP_STATUS/.test(content),
    'src/constants/httpStatus.js 에 HTTP_STATUS export 가 없습니다'
  );

  // 핵심 상태코드 키 확인
  const requiredKeys = ['OK', 'NOT_FOUND', 'INTERNAL_SERVER_ERROR', 'BAD_REQUEST'];
  const missing = requiredKeys.filter((key) => !content.includes(key));
  assert.deepEqual(
    missing,
    [],
    `HTTP_STATUS 에 다음 키가 없습니다: ${missing.join(', ')}`
  );
});

test('BE-02 | src/constants/errorCodes.js - ERROR_CODES 상수가 export 되어야 한다', () => {
  const filePath = path.join(SRC_ROOT, 'constants', 'errorCodes.js');
  const content = readFileOrNull(filePath);
  if (content === null) {
    assert.fail(`src/constants/errorCodes.js 를 읽을 수 없습니다: ${filePath}`);
  }

  assert.ok(
    /export\s+const\s+ERROR_CODES/.test(content),
    'src/constants/errorCodes.js 에 ERROR_CODES export 가 없습니다'
  );

  // 핵심 에러코드 키 확인
  const requiredKeys = ['NOT_FOUND', 'INTERNAL_SERVER_ERROR', 'VALIDATION_ERROR'];
  const missing = requiredKeys.filter((key) => !content.includes(key));
  assert.deepEqual(
    missing,
    [],
    `ERROR_CODES 에 다음 키가 없습니다: ${missing.join(', ')}`
  );
});

// ─────────────────────────────────────────────
// BE-02: HTTP 통합 테스트 (서버 기동 후 실제 요청)
// ─────────────────────────────────────────────

test('BE-02 | GET /health → 200 응답과 JSON 본문 반환', async (t) => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  if (!fs.existsSync(appPath)) {
    t.skip('src/app.js 가 없어 통합 테스트를 건너뜁니다');
    return;
  }

  await withTestServer(13580, async (port) => {
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

    // status 또는 message 필드 존재 확인 (응답 형식 유연하게 허용)
    const hasStatusField = 'status' in parsed || 'message' in parsed || 'ok' in parsed;
    assert.ok(
      hasStatusField,
      `/health JSON 응답에 status/message/ok 필드가 없습니다: ${JSON.stringify(parsed)}`
    );
  });
});

test('BE-02 | 존재하지 않는 경로 → 404 + 표준 에러 응답 형식', async (t) => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  if (!fs.existsSync(appPath)) {
    t.skip('src/app.js 가 없어 통합 테스트를 건너뜁니다');
    return;
  }

  await withTestServer(13581, async (port) => {
    const res = await httpRequest('127.0.0.1', port, '/this-path-does-not-exist');

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

    // 표준 에러 형식: { success: false, error: { code, message } }
    assert.equal(
      parsed.success,
      false,
      `404 응답의 success 필드가 false 여야 합니다: ${JSON.stringify(parsed)}`
    );
    assert.ok(
      parsed.error !== undefined && parsed.error !== null,
      `404 응답에 error 객체가 없습니다: ${JSON.stringify(parsed)}`
    );
    assert.ok(
      typeof parsed.error.code === 'string' && parsed.error.code.length > 0,
      `404 응답의 error.code 가 문자열이어야 합니다: ${JSON.stringify(parsed.error)}`
    );
    assert.ok(
      typeof parsed.error.message === 'string' && parsed.error.message.length > 0,
      `404 응답의 error.message 가 문자열이어야 합니다: ${JSON.stringify(parsed.error)}`
    );
  });
});

test('BE-02 | 에러 핸들러 → 500 + 표준 에러 응답 형식 확인 (소스 분석)', () => {
  // BE-04 이후 에러 핸들러는 middlewares/errorHandler.js 로 분리될 수 있음
  const appPath = path.join(SRC_ROOT, 'app.js');
  const appContent = readFileOrNull(appPath);
  const errorHandlerPath = path.join(SRC_ROOT, 'middlewares', 'errorHandler.js');
  const errorHandlerContent = readFileOrNull(errorHandlerPath);

  if (appContent === null) {
    assert.fail('src/app.js 를 읽을 수 없습니다');
  }

  // app.js 에 인라인 4-인자 핸들러 또는 errorHandler 모듈 import 중 하나가 있어야 함
  const hasInlineErrorHandler = /\(\s*err\s*,\s*\w+\s*,\s*\w+\s*,\s*\w+\s*\)/.test(appContent);
  const hasModularErrorHandler = /middlewares\/errorHandler/.test(appContent) ||
                                  /errorHandler/.test(appContent);

  assert.ok(
    hasInlineErrorHandler || hasModularErrorHandler,
    'src/app.js 에 글로벌 에러 핸들러가 없습니다\n' +
    '인라인 핸들러 또는 middlewares/errorHandler.js 모듈 방식 중 하나를 사용해야 합니다'
  );

  // 500 / INTERNAL_SERVER_ERROR 패턴은 app.js 또는 errorHandler.js 중 하나에 있어야 함
  const combinedContent = appContent + (errorHandlerContent || '');
  const has500Response = /\.status\(\s*500\s*\)/.test(combinedContent) ||
                         /INTERNAL_SERVER_ERROR/.test(combinedContent) ||
                         /status\s*:\s*500/.test(combinedContent);
  assert.ok(
    has500Response,
    '에러 핸들러에서 500 상태코드 또는 INTERNAL_SERVER_ERROR 패턴을 찾을 수 없습니다'
  );

  // 표준 에러 형식 { success: false } 패턴은 app.js 또는 errorHandler.js 에 있어야 함
  const hasStandardErrorFormat = /success\s*:\s*false/.test(combinedContent);
  assert.ok(
    hasStandardErrorFormat,
    '에러 응답에 success: false 패턴이 없습니다 (app.js 또는 middlewares/errorHandler.js)\n' +
    '표준 에러 형식: { success: false, error: { code, message } }'
  );
});

// ─────────────────────────────────────────────
// BE-03: src/config/db.js 파일 구조 검증 (정적)
// ─────────────────────────────────────────────

test('BE-03 | src/config/db.js - 파일이 존재해야 한다', () => {
  const dbConfigPath = path.join(SRC_ROOT, 'config', 'db.js');
  assert.ok(
    fs.existsSync(dbConfigPath),
    `src/config/db.js 가 존재하지 않습니다: ${dbConfigPath}\n` +
    '(BE-03: DB 연결 모듈을 src/config/db.js 로 생성하세요)'
  );
});

test('BE-03 | src/config/db.js - query, getClient, pool 3가지를 export 해야 한다 (소스 분석)', () => {
  const dbConfigPath = path.join(SRC_ROOT, 'config', 'db.js');
  const content = readFileOrNull(dbConfigPath);
  if (content === null) {
    assert.fail('src/config/db.js 를 읽을 수 없습니다');
  }

  const requiredExports = ['query', 'getClient', 'pool'];
  const missing = requiredExports.filter((name) => {
    // named export 또는 export { ... } 패턴 확인
    const namedExport = new RegExp(`export\\s+(async\\s+)?function\\s+${name}\\b`).test(content);
    const exportConst = new RegExp(`export\\s+(const|let)\\s+${name}\\b`).test(content);
    const reExport = new RegExp(`export\\s+\\{[^}]*\\b${name}\\b`).test(content);
    const defaultExportPool = name === 'pool' && /export\s+default\s+pool\b/.test(content);
    return !(namedExport || exportConst || reExport || defaultExportPool);
  });

  assert.deepEqual(
    missing,
    [],
    `src/config/db.js 에 다음 export 가 없습니다: ${missing.join(', ')}\n` +
    '(query, getClient, pool 3가지를 export 해야 합니다)'
  );
});

test('BE-03 | src/config/db.js - testConnection 함수를 export 해야 한다 (소스 분석)', () => {
  const dbConfigPath = path.join(SRC_ROOT, 'config', 'db.js');
  const content = readFileOrNull(dbConfigPath);
  if (content === null) {
    assert.fail('src/config/db.js 를 읽을 수 없습니다');
  }

  const hasTestConnection =
    /export\s+(async\s+)?function\s+testConnection\b/.test(content) ||
    /export\s+const\s+testConnection\s*=/.test(content) ||
    /export\s+\{[^}]*\btestConnection\b/.test(content);

  assert.ok(
    hasTestConnection,
    'src/config/db.js 에 testConnection export 가 없습니다\n' +
    '(DB 연결 확인 함수를 export 해야 합니다)'
  );
});

test('BE-03 | src/config/db.js - dotenv 를 직접 import 하지 않고 config 모듈을 경유해야 한다 (소스 분석)', () => {
  const dbConfigPath = path.join(SRC_ROOT, 'config', 'db.js');
  const content = readFileOrNull(dbConfigPath);
  if (content === null) {
    assert.fail('src/config/db.js 를 읽을 수 없습니다');
  }

  // dotenv 직접 사용 금지 패턴
  const usesDotenvDirectly =
    /import\s+['"]dotenv\/config['"]/.test(content) ||
    /import\s+dotenv\s+from\s+['"]dotenv['"]/.test(content) ||
    /require\s*\(\s*['"]dotenv['"]/.test(content);

  assert.equal(
    usesDotenvDirectly,
    false,
    'src/config/db.js 에서 dotenv 를 직접 import 하고 있습니다\n' +
    'dotenv 로드는 src/config/index.js 가 담당하므로, config 모듈을 import 해서 사용하세요\n' +
    '예: import { config } from \'./index.js\''
  );

  // config 모듈 사용 확인
  const usesConfigModule =
    /import\s+.*\bconfig\b.*\s+from/.test(content) ||
    /from\s+['"][^'"]*config[/\\]?index\.js['"]/.test(content) ||
    /from\s+['"][./]+config['"]/.test(content) ||
    /from\s+['"][./]+index\.js['"]/.test(content);

  assert.ok(
    usesConfigModule,
    'src/config/db.js 가 config 모듈을 import 하지 않습니다\n' +
    '예: import { config } from \'./index.js\''
  );
});

test('BE-03 | src/config/db.js - Pool 설정(max, idleTimeoutMillis, connectionTimeoutMillis)이 config 에서 읽혀야 한다 (소스 분석)', () => {
  const dbConfigPath = path.join(SRC_ROOT, 'config', 'db.js');
  const content = readFileOrNull(dbConfigPath);
  if (content === null) {
    assert.fail('src/config/db.js 를 읽을 수 없습니다');
  }

  // config.db.poolMax 또는 config.db.pool_max 등 config 참조 패턴과 함께 Pool 설정 키 확인
  const requiredPoolKeys = [
    { label: 'max', pattern: /\bmax\s*:/ },
    { label: 'idleTimeoutMillis', pattern: /idleTimeoutMillis\s*:/ },
    { label: 'connectionTimeoutMillis', pattern: /connectionTimeoutMillis\s*:/ },
  ];

  const missing = requiredPoolKeys.filter(({ pattern }) => !pattern.test(content));

  assert.deepEqual(
    missing.map((k) => k.label),
    [],
    `src/config/db.js Pool 설정에 다음 키가 없습니다: ${missing.map((k) => k.label).join(', ')}\n` +
    '(max, idleTimeoutMillis, connectionTimeoutMillis 를 config 객체에서 읽어야 합니다)'
  );

  // config 객체의 db 속성을 통해 값을 읽는지 확인
  const usesConfigDb = /config\.db\b/.test(content);
  assert.ok(
    usesConfigDb,
    'src/config/db.js 에서 config.db 를 참조하지 않습니다\n' +
    'Pool 설정은 process.env 직접 접근 대신 config.db 를 통해 읽어야 합니다'
  );
});

test('BE-03 | src/config/db.js - pool.on("error") 핸들러가 등록되어야 한다 (소스 분석)', () => {
  const dbConfigPath = path.join(SRC_ROOT, 'config', 'db.js');
  const content = readFileOrNull(dbConfigPath);
  if (content === null) {
    assert.fail('src/config/db.js 를 읽을 수 없습니다');
  }

  const hasErrorHandler =
    /pool\.on\(\s*['"]error['"]/.test(content) ||
    /\.on\(\s*['"]error['"]/.test(content);

  assert.ok(
    hasErrorHandler,
    'src/config/db.js 에 pool.on("error", ...) 핸들러가 없습니다\n' +
    '(유휴 클라이언트 에러를 처리하는 핸들러를 등록해야 합니다)'
  );
});

test('BE-03 | src/server.js - testConnection 을 호출해야 한다 (소스 분석)', () => {
  const serverPath = path.join(SRC_ROOT, 'server.js');
  const content = readFileOrNull(serverPath);
  if (content === null) {
    assert.fail('src/server.js 를 읽을 수 없습니다');
  }

  // testConnection import 확인
  const importsTestConnection = /testConnection/.test(content);
  assert.ok(
    importsTestConnection,
    'src/server.js 에서 testConnection 을 사용하지 않습니다\n' +
    '(서버 기동 시 DB 연결 확인을 위해 testConnection 을 import 하고 호출해야 합니다)'
  );

  // testConnection() 호출 확인
  const callsTestConnection = /testConnection\s*\(\s*\)/.test(content) ||
                              /await\s+testConnection\b/.test(content);
  assert.ok(
    callsTestConnection,
    'src/server.js 에서 testConnection() 을 호출하지 않습니다\n' +
    '(서버 기동 시 await testConnection() 을 호출하여 DB 연결을 확인해야 합니다)'
  );
});

// ─────────────────────────────────────────────
// BE-03: 서버 기동 시 DB 연결 로그 확인 (통합)
// ─────────────────────────────────────────────

test('BE-03 | 서버 기동 시 DB 연결 관련 로그가 출력되어야 한다', async (t) => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  const dbConfigPath = path.join(SRC_ROOT, 'config', 'db.js');

  if (!fs.existsSync(appPath) || !fs.existsSync(dbConfigPath)) {
    t.skip('src/app.js 또는 src/config/db.js 가 없어 통합 테스트를 건너뜁니다');
    return;
  }

  const serverPath = path.join(SRC_ROOT, 'server.js');
  const env = {
    ...process.env,
    PORT: '13582',
    NODE_ENV: 'test',
    // 실제 DB 연결이 불가능한 더미 값으로 설정
    // testConnection 이 실패해도 로그 출력 여부만 확인
    DB_HOST: '127.0.0.1',
    DB_PORT: '5432',
    DB_NAME: 'test_db',
    DB_USER: 'test_user',
    DB_PASSWORD: 'test_password',
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

  // 서버 기동 대기 (실패해도 3초 후 로그 확인)
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 3000);
    proc.on('close', () => { clearTimeout(timer); resolve(); });
    waitForServer(13582, 10, 300).then(resolve).catch(resolve);
  });

  try {
    const combinedOutput = stdout + stderr;
    // DB 연결 시도 또는 에러 관련 로그가 하나라도 있으면 통과
    const hasDbRelatedLog =
      /\[DB\]|\[db\]|postgres|postgresql|connection|pool|testConnection/i.test(combinedOutput) ||
      /DB|database|연결|connect/i.test(combinedOutput);

    assert.ok(
      hasDbRelatedLog,
      'DB 연결 관련 로그가 출력되지 않았습니다\n' +
      `stdout: ${stdout}\nstderr: ${stderr}`
    );
  } finally {
    if (!proc.killed) {
      proc.kill('SIGTERM');
      await new Promise((resolve) => {
        const timer = setTimeout(() => { if (!proc.killed) proc.kill('SIGKILL'); resolve(); }, 500);
        proc.on('close', () => { clearTimeout(timer); resolve(); });
      });
    }
  }
});
