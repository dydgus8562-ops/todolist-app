/**
 * BE-01: 프로젝트 초기 세팅 검증 테스트
 *
 * 검증 항목:
 *  1. package.json 필수 의존성 존재 여부
 *  2. package.json scripts(start, dev) 존재 여부
 *  3. .env.example 파일 존재 및 필수 환경변수 키 포함 여부
 *  4. .gitignore 파일의 node_modules/, .env 포함 여부
 *  5. src/server.js 파일 존재 여부
 *  6. config 모듈 export 구조 검증
 *  7. /health 엔드포인트 smoke test (DB 연결 없이 서버 기동)
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

// 프로젝트 루트 경로 (tests/ 의 상위 = backend/)
const BACKEND_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(BACKEND_ROOT, 'src');

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

/**
 * 파일을 읽어 텍스트로 반환. 존재하지 않으면 null 반환.
 */
function readFileOrNull(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * 지정된 포트로 GET 요청을 보내고 응답을 Promise로 반환.
 * @param {string} host
 * @param {number} port
 * @param {string} pathname
 * @param {number} timeoutMs
 */
function httpGet(host, port, pathname, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port, path: pathname, method: 'GET' }, (res) => {
      let body = '';
      res.setEncoding('utf-8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`HTTP request timed out after ${timeoutMs}ms`));
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * 서버 프로세스가 지정 포트에서 수신을 시작할 때까지 폴링.
 * @param {number} port
 * @param {number} maxAttempts
 * @param {number} intervalMs
 */
function waitForServer(port, maxAttempts = 20, intervalMs = 300) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryConnect = () => {
      const req = http.request({ host: '127.0.0.1', port, path: '/health', method: 'GET' }, (res) => {
        res.resume(); // 응답 소비
        resolve();
      });
      req.setTimeout(500, () => req.destroy());
      req.on('error', () => {
        attempts += 1;
        if (attempts >= maxAttempts) {
          reject(new Error(`Server did not start on port ${port} after ${maxAttempts * intervalMs}ms`));
        } else {
          setTimeout(tryConnect, intervalMs);
        }
      });
      req.end();
    };

    tryConnect();
  });
}

// ─────────────────────────────────────────────
// 1. package.json 필수 의존성 검증
// ─────────────────────────────────────────────

test('package.json - 파일이 존재해야 한다', () => {
  const pkgPath = path.join(BACKEND_ROOT, 'package.json');
  assert.ok(fs.existsSync(pkgPath), `package.json 이 존재하지 않음: ${pkgPath}`);
});

test('package.json - type 이 module 이어야 한다 (ESM)', () => {
  const pkgPath = path.join(BACKEND_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  assert.equal(pkg.type, 'module', 'package.json type 필드가 "module" 이어야 합니다');
});

test('package.json - 필수 런타임 의존성 6개가 모두 존재해야 한다', () => {
  const pkgPath = path.join(BACKEND_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const deps = pkg.dependencies ?? {};

  const required = ['express', 'pg', 'bcrypt', 'jsonwebtoken', 'cors', 'dotenv'];
  const missing = required.filter((dep) => !(dep in deps));

  assert.deepEqual(
    missing,
    [],
    `다음 의존성이 dependencies 에 없습니다: ${missing.join(', ')}`
  );
});

test('package.json - devDependency 에 nodemon 이 존재해야 한다', () => {
  const pkgPath = path.join(BACKEND_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const devDeps = pkg.devDependencies ?? {};

  assert.ok('nodemon' in devDeps, 'devDependencies 에 nodemon 이 없습니다');
});

// ─────────────────────────────────────────────
// 2. package.json scripts 검증
// ─────────────────────────────────────────────

test('package.json - scripts.start 가 존재해야 한다', () => {
  const pkgPath = path.join(BACKEND_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  assert.ok(
    typeof pkg.scripts?.start === 'string' && pkg.scripts.start.length > 0,
    'scripts.start 가 없거나 비어 있습니다'
  );
});

test('package.json - scripts.dev 가 존재해야 하며 nodemon 을 사용해야 한다', () => {
  const pkgPath = path.join(BACKEND_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  assert.ok(
    typeof pkg.scripts?.dev === 'string' && pkg.scripts.dev.length > 0,
    'scripts.dev 가 없거나 비어 있습니다'
  );
  assert.ok(
    pkg.scripts.dev.includes('nodemon'),
    `scripts.dev 가 nodemon 을 사용하지 않습니다: "${pkg.scripts.dev}"`
  );
});

// ─────────────────────────────────────────────
// 3. .env.example 검증
// ─────────────────────────────────────────────

test('.env.example - 파일이 존재해야 한다', () => {
  const envExamplePath = path.join(BACKEND_ROOT, '.env.example');
  assert.ok(
    fs.existsSync(envExamplePath),
    `.env.example 파일이 존재하지 않습니다: ${envExamplePath}`
  );
});

test('.env.example - 8개의 필수 환경변수 키가 모두 정의되어 있어야 한다', () => {
  const envExamplePath = path.join(BACKEND_ROOT, '.env.example');
  const content = readFileOrNull(envExamplePath);

  // 파일이 없으면 앞선 테스트에서 이미 실패했으므로 skip 처리
  if (content === null) {
    // 파일 없음 — 이 테스트는 의존 테스트와 함께 실패로 표시됨
    assert.fail('.env.example 파일을 읽을 수 없습니다');
  }

  const requiredKeys = [
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
  ];

  // 각 줄에서 KEY= 패턴으로 정의된 키 목록 추출
  const definedKeys = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('=')[0].trim());

  const missing = requiredKeys.filter((key) => !definedKeys.includes(key));

  assert.deepEqual(
    missing,
    [],
    `.env.example 에 다음 키가 없습니다: ${missing.join(', ')}`
  );
});

// ─────────────────────────────────────────────
// 4. .gitignore 검증
// ─────────────────────────────────────────────

test('.gitignore - 파일이 존재해야 한다', () => {
  const gitignorePath = path.join(BACKEND_ROOT, '.gitignore');
  assert.ok(
    fs.existsSync(gitignorePath),
    `.gitignore 파일이 존재하지 않습니다: ${gitignorePath}`
  );
});

test('.gitignore - node_modules/ 가 포함되어야 한다', () => {
  const gitignorePath = path.join(BACKEND_ROOT, '.gitignore');
  const content = readFileOrNull(gitignorePath);
  if (content === null) {
    assert.fail('.gitignore 파일을 읽을 수 없습니다');
  }

  const lines = content.split('\n').map((l) => l.trim());
  assert.ok(
    lines.some((l) => l === 'node_modules' || l === 'node_modules/'),
    '.gitignore 에 node_modules/ 항목이 없습니다'
  );
});

test('.gitignore - .env 가 포함되어야 한다', () => {
  const gitignorePath = path.join(BACKEND_ROOT, '.gitignore');
  const content = readFileOrNull(gitignorePath);
  if (content === null) {
    assert.fail('.gitignore 파일을 읽을 수 없습니다');
  }

  const lines = content.split('\n').map((l) => l.trim());
  // '.env' 자체가 패턴으로 있거나 '*.env' 같은 glob 이 있으면 허용
  assert.ok(
    lines.some((l) => l === '.env' || l === '*.env'),
    '.gitignore 에 .env 항목이 없습니다'
  );
});

// ─────────────────────────────────────────────
// 5. src/server.js 존재 확인
// ─────────────────────────────────────────────

test('src/server.js - 파일이 존재해야 한다', () => {
  const serverPath = path.join(SRC_ROOT, 'server.js');
  assert.ok(
    fs.existsSync(serverPath),
    `src/server.js 가 존재하지 않습니다: ${serverPath}`
  );
});

// ─────────────────────────────────────────────
// 6. config 모듈 구조 검증
// ─────────────────────────────────────────────

test('src/config/index.js - 파일이 존재해야 한다', () => {
  const configPath = path.join(SRC_ROOT, 'config', 'index.js');
  assert.ok(
    fs.existsSync(configPath),
    `src/config/index.js 가 존재하지 않습니다: ${configPath}`
  );
});

test('src/config/index.js - .env 로드 경로가 올바르게 지정되어 있어야 한다 (../../.env)', () => {
  const configPath = path.join(SRC_ROOT, 'config', 'index.js');
  const content = readFileOrNull(configPath);
  if (content === null) {
    assert.fail('src/config/index.js 파일을 읽을 수 없습니다');
  }

  // 올바른 경로: __dirname 기준으로 ../../.env (src/config/ → src/ → backend/)
  // 잘못된 경로: .env (동일 디렉터리)
  const hasCorrectRelativePath =
    content.includes('../../.env') ||
    content.includes("'../../.env'") ||
    content.includes('"../../.env"');

  assert.ok(
    hasCorrectRelativePath,
    [
      'config/index.js 의 .env 로드 경로가 잘못되었습니다.',
      '현재 경로는 src/config/index.js 이므로 .env 는 ../../.env 로 참조해야 합니다.',
      '현재 파일 내용에서 "../../.env" 패턴을 찾을 수 없습니다.',
    ].join('\n')
  );
});

test('src/config/index.js - config 객체가 port, db, jwt 키를 export 해야 한다', async () => {
  const configPath = path.join(SRC_ROOT, 'config', 'index.js');
  const content = readFileOrNull(configPath);
  if (content === null) {
    assert.fail('src/config/index.js 파일을 읽을 수 없습니다');
  }

  // 정적 분석: export const config = { ... } 에 필수 키가 포함되어 있는지 확인
  // (DB 연결 없이 안전하게 검증하기 위해 동적 import 대신 소스 분석)
  const requiredConfigKeys = ['port', 'db', 'jwt'];
  const missing = requiredConfigKeys.filter((key) => {
    // "port:" 또는 "port :" 형태로 있는지 확인
    const pattern = new RegExp(`\\b${key}\\s*:`);
    return !pattern.test(content);
  });

  assert.deepEqual(
    missing,
    [],
    `config 객체에 다음 키가 정의되어 있지 않습니다: ${missing.join(', ')}`
  );
});

test('src/config/index.js - db 객체가 host, port, name, user, password 키를 포함해야 한다', () => {
  const configPath = path.join(SRC_ROOT, 'config', 'index.js');
  const content = readFileOrNull(configPath);
  if (content === null) {
    assert.fail('src/config/index.js 파일을 읽을 수 없습니다');
  }

  const requiredDbKeys = ['host', 'port', 'name', 'user', 'password'];
  const missing = requiredDbKeys.filter((key) => {
    const pattern = new RegExp(`\\b${key}\\s*:`);
    return !pattern.test(content);
  });

  assert.deepEqual(
    missing,
    [],
    `config.db 객체에 다음 키가 없습니다: ${missing.join(', ')}`
  );
});

test('src/config/index.js - jwt 객체가 secret, expiresIn 키를 포함해야 한다', () => {
  const configPath = path.join(SRC_ROOT, 'config', 'index.js');
  const content = readFileOrNull(configPath);
  if (content === null) {
    assert.fail('src/config/index.js 파일을 읽을 수 없습니다');
  }

  const requiredJwtKeys = ['secret', 'expiresIn'];
  const missing = requiredJwtKeys.filter((key) => {
    const pattern = new RegExp(`\\b${key}\\s*:`);
    return !pattern.test(content);
  });

  assert.deepEqual(
    missing,
    [],
    `config.jwt 객체에 다음 키가 없습니다: ${missing.join(', ')}`
  );
});

// ─────────────────────────────────────────────
// 7. 서버 기동 smoke test (/health 엔드포인트)
// ─────────────────────────────────────────────

test('/health 엔드포인트 smoke test - DB 없이 서버가 기동되고 200 응답을 반환해야 한다', async (t) => {
  const serverPath = path.join(SRC_ROOT, 'server.js');

  // server.js 가 없으면 smoke test 를 건너뜀
  if (!fs.existsSync(serverPath)) {
    t.skip('src/server.js 가 존재하지 않아 smoke test 를 건너뜁니다. 파일 생성 후 재실행하세요.');
    return;
  }

  const TEST_PORT = 13579; // 충돌 방지를 위해 비표준 포트 사용

  // 환경변수: DB 연결을 시도하지 않도록 NODE_ENV=test 설정
  const env = {
    ...process.env,
    PORT: String(TEST_PORT),
    NODE_ENV: 'test',
    // DB 환경변수를 더미값으로 주입 — pool 생성은 되지만 실제 쿼리는 /health 에서 발생하지 않음
    DB_HOST: '127.0.0.1',
    DB_PORT: '5432',
    DB_NAME: 'test_db',
    DB_USER: 'test_user',
    DB_PASSWORD: 'test_password',
    JWT_SECRET: 'test-jwt-secret-for-smoke-test',
    JWT_EXPIRES_IN: '1d',
  };

  const serverProcess = spawn(
    process.execPath, // 현재 Node.js 실행 파일 경로
    [serverPath],
    {
      cwd: BACKEND_ROOT,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let serverStdout = '';
  let serverStderr = '';

  serverProcess.stdout.on('data', (data) => { serverStdout += data.toString(); });
  serverProcess.stderr.on('data', (data) => { serverStderr += data.toString(); });

  // 프로세스가 예기치 않게 종료될 경우를 대비한 에러 캡처
  let startupError = null;
  serverProcess.on('error', (err) => { startupError = err; });

  try {
    // 서버가 포트를 열 때까지 대기 (최대 6초)
    await waitForServer(TEST_PORT, 20, 300);

    if (startupError) {
      assert.fail(`서버 프로세스 시작 실패: ${startupError.message}`);
    }

    // /health 요청
    const response = await httpGet('127.0.0.1', TEST_PORT, '/health', 5000);

    assert.equal(
      response.statusCode,
      200,
      `/health 가 200 을 반환해야 하지만 ${response.statusCode} 를 반환했습니다.\nstdout: ${serverStdout}\nstderr: ${serverStderr}`
    );

    // 응답 본문이 JSON 형태인지 확인
    let parsed;
    try {
      parsed = JSON.parse(response.body);
    } catch {
      assert.fail(`/health 응답이 유효한 JSON 이 아닙니다: ${response.body}`);
    }

    // status 또는 message 필드가 있어야 함
    assert.ok(
      typeof parsed.status === 'string' || typeof parsed.message === 'string',
      `/health 응답 JSON 에 status 또는 message 필드가 없습니다: ${JSON.stringify(parsed)}`
    );
  } finally {
    // 테스트 종료 후 반드시 서버 프로세스 종료
    if (!serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      // SIGTERM 이후 100ms 안에 종료되지 않으면 강제 종료
      await new Promise((resolve) => {
        const forceKill = setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 100);
        serverProcess.on('close', () => {
          clearTimeout(forceKill);
          resolve();
        });
      });
    }
  }
});
