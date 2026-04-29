/**
 * BE-08: 할일 API — 기본 CRUD 검증 테스트
 *
 * 검증 항목:
 *  1. 정적 분석 - 관련 파일 존재 여부
 *  2. 레포지토리 - taskRepository.js (CRUD 및 필터링 메서드 정의)
 *  3. 서비스 - taskService.js (비즈니스 로직 - 소유권 검증, 상태 계산 스텁)
 *  4. 통합 - app.js에 할일 라우터 마운트 여부
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(BACKEND_ROOT, 'src');

// ─────────────────────────────────────────────
// 1. 정적 분석 테스트 (파일 존재 여부)
// ─────────────────────────────────────────────

test('BE-08 | 정적 | 관련 파일들이 존재해야 한다', () => {
  const files = [
    'repositories/taskRepository.js',
    'services/taskService.js',
    'controllers/taskController.js',
    'routes/tasks.js',
  ];

  for (const file of files) {
    const filePath = path.join(SRC_ROOT, file);
    assert.ok(fs.existsSync(filePath), `파일이 존재하지 않음: ${file}`);
  }
});

// ─────────────────────────────────────────────
// 2. 레포지토리 테스트 (taskRepository.js)
// ─────────────────────────────────────────────

test('BE-08 | 레포 | taskRepository.js - 기본 메서드가 정의되어야 한다', async () => {
  const modPath = path.join(SRC_ROOT, 'repositories', 'taskRepository.js');
  if (!fs.existsSync(modPath)) return;

  const repo = await import(`file:///${modPath.replace(/\\/g, '/')}`);

  assert.strictEqual(typeof repo.findAllByUserId, 'function');
  assert.strictEqual(typeof repo.findByIdAndUserId, 'function');
  assert.strictEqual(typeof repo.create, 'function');
  assert.strictEqual(typeof repo.update, 'function');
  assert.strictEqual(typeof repo.delete, 'function');
});

// ─────────────────────────────────────────────
// 3. 서비스 테스트 (taskService.js)
// ─────────────────────────────────────────────

test('BE-08 | 서비스 | taskService.js - 기본 메서드가 정의되어야 한다', async () => {
  const modPath = path.join(SRC_ROOT, 'services', 'taskService.js');
  if (!fs.existsSync(modPath)) return;

  const service = await import(`file:///${modPath.replace(/\\/g, '/')}`);

  assert.strictEqual(typeof service.getTasks, 'function');
  assert.strictEqual(typeof service.createTask, 'function');
  assert.strictEqual(typeof service.updateTask, 'function');
  assert.strictEqual(typeof service.deleteTask, 'function');
  // BE-09에서 완성될 상태 계산 메서드 존재 여부 확인
  assert.strictEqual(typeof service.enrichTaskStatus, 'function');
});

// ─────────────────────────────────────────────
// 5. 비즈니스 로직 테스트 (enrichTaskStatus)
// ─────────────────────────────────────────────

test('BE-08 | 서비스 | enrichTaskStatus - 실시간 상태를 정확히 계산해야 한다', async () => {
  const modPath = path.join(SRC_ROOT, 'services', 'taskService.js');
  const { enrichTaskStatus } = await import(`file:///${modPath.replace(/\\/g, '/')}`);

  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60); // 1시간 전
  const future = new Date(now.getTime() + 1000 * 60 * 60); // 1시간 후

  // 1. status가 COMPLETED면 항상 COMPLETED (BR-07)
  assert.strictEqual(enrichTaskStatus({ status: 'COMPLETED', due_date: past }), 'COMPLETED');
  assert.strictEqual(enrichTaskStatus({ status: 'COMPLETED', due_date: null }), 'COMPLETED');

  // 2. dueDate가 null이면 항상 PENDING (BR-08/09)
  assert.strictEqual(enrichTaskStatus({ status: 'PENDING', due_date: null }), 'PENDING');

  // 3. dueDate가 과거이고 PENDING이면 OVERDUE (BR-06)
  assert.strictEqual(enrichTaskStatus({ status: 'PENDING', due_date: past }), 'OVERDUE');

  // 4. dueDate가 미래이고 PENDING이면 PENDING
  assert.strictEqual(enrichTaskStatus({ status: 'PENDING', due_date: future }), 'PENDING');
});

// ─────────────────────────────────────────────
// 6. 앱 통합 테스트 - 할일 라우터 마운트 여부
// ─────────────────────────────────────────────

test('BE-08 | 통합 | app.js - /api/tasks 라우터가 마운트되어야 한다', async () => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  assert.ok(
    appContent.includes('/api/tasks') || appContent.includes('tasks.js'),
    'app.js에 tasks 라우터가 등록되지 않은 것으로 보입니다.'
  );
});


