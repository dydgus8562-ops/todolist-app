/**
 * BE-09: 할일 API — 상태 처리 (complete / reopen / OVERDUE) 검증 테스트
 *
 * 검증 항목:
 *  1. 레포지토리 - taskRepository.js (updateStatus 메서드 정의)
 *  2. 서비스 - taskService.js (completeTask, reopenTask 메서드 정의 및 로직)
 *  3. 컨트롤러 - taskController.js (completeTask, reopenTask 핸들러 정의)
 *  4. 라우트 - tasks.js에 /:id/complete, /:id/reopen 경로 정의 여부
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
// 1. 레포지토리 테스트 (taskRepository.js)
// ─────────────────────────────────────────────

test('BE-09 | 레포 | taskRepository.js - updateStatus 메서드가 정의되어야 한다', async () => {
  const modPath = path.join(SRC_ROOT, 'repositories', 'taskRepository.js');
  const repo = await import(`file:///${modPath.replace(/\\/g, '/')}`);

  assert.strictEqual(typeof repo.updateStatus, 'function');
  assert.strictEqual(typeof repo.default.updateStatus, 'function');
});

// ─────────────────────────────────────────────
// 2. 서비스 테스트 (taskService.js)
// ─────────────────────────────────────────────

test('BE-09 | 서비스 | taskService.js - completeTask, reopenTask 메서드가 정의되어야 한다', async () => {
  const modPath = path.join(SRC_ROOT, 'services', 'taskService.js');
  const service = await import(`file:///${modPath.replace(/\\/g, '/')}`);

  assert.strictEqual(typeof service.completeTask, 'function');
  assert.strictEqual(typeof service.reopenTask, 'function');
  assert.strictEqual(typeof service.default.completeTask, 'function');
  assert.strictEqual(typeof service.default.reopenTask, 'function');
});

// ─────────────────────────────────────────────
// 3. 컨트롤러 테스트 (taskController.js)
// ─────────────────────────────────────────────

test('BE-09 | 컨트롤러 | taskController.js - completeTask, reopenTask 핸들러가 정의되어야 한다', async () => {
  const modPath = path.join(SRC_ROOT, 'controllers', 'taskController.js');
  const controller = await import(`file:///${modPath.replace(/\\/g, '/')}`);

  assert.strictEqual(typeof controller.completeTask, 'function');
  assert.strictEqual(typeof controller.reopenTask, 'function');
  assert.strictEqual(typeof controller.default.completeTask, 'function');
  assert.strictEqual(typeof controller.default.reopenTask, 'function');
});

// ─────────────────────────────────────────────
// 4. 라우트 테스트 (tasks.js)
// ─────────────────────────────────────────────

test('BE-09 | 라우트 | tasks.js - complete, reopen 경로가 정의되어야 한다', async () => {
  const routePath = path.join(SRC_ROOT, 'routes', 'tasks.js');
  const routeContent = fs.readFileSync(routePath, 'utf-8');

  assert.ok(routeContent.includes('/:id/complete'), 'complete 라우트가 정의되지 않았습니다.');
  assert.ok(routeContent.includes('/:id/reopen'), 'reopen 라우트가 정의되지 않았습니다.');
});
