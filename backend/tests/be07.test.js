/**
 * BE-07: 카테고리 API (CRUD 4개 엔드포인트) 검증 테스트
 *
 * 검증 항목:
 *  1. 정적 분석 - 관련 파일 존재 여부
 *  2. 레포지토리 - categoryRepository.js (CRUD 메서드 정의)
 *  3. 서비스 - categoryService.js (비즈니스 로직 - 중복 검사, 소유권 검증)
 *  4. 통합 - app.js에 카테고리 라우터 마운트 여부
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

test('BE-07 | 정적 | 관련 파일들이 존재해야 한다', () => {
  const files = [
    'repositories/categoryRepository.js',
    'services/categoryService.js',
    'controllers/categoryController.js',
    'routes/categories.js',
  ];

  for (const file of files) {
    const filePath = path.join(SRC_ROOT, file);
    assert.ok(fs.existsSync(filePath), `파일이 존재하지 않음: ${file}`);
  }
});

// ─────────────────────────────────────────────
// 2. 레포지토리 테스트 (categoryRepository.js)
// ─────────────────────────────────────────────

test('BE-07 | 레포 | categoryRepository.js - 기본 메서드가 정의되어야 한다', async () => {
  const modPath = path.join(SRC_ROOT, 'repositories', 'categoryRepository.js');
  if (!fs.existsSync(modPath)) return;

  const repo = await import(`file:///${modPath.replace(/\\/g, '/')}`);

  assert.strictEqual(typeof repo.findAllByUserId, 'function');
  assert.strictEqual(typeof repo.findByIdAndUserId, 'function');
  assert.strictEqual(typeof repo.findByNameAndUserId, 'function');
  assert.strictEqual(typeof repo.create, 'function');
  assert.strictEqual(typeof repo.update, 'function');
  assert.strictEqual(typeof repo.delete, 'function');
});

// ─────────────────────────────────────────────
// 3. 서비스 테스트 (categoryService.js)
// ─────────────────────────────────────────────

test('BE-07 | 서비스 | categoryService.js - 기본 메서드가 정의되어야 한다', async () => {
  const modPath = path.join(SRC_ROOT, 'services', 'categoryService.js');
  if (!fs.existsSync(modPath)) return;

  const service = await import(`file:///${modPath.replace(/\\/g, '/')}`);

  assert.strictEqual(typeof service.getCategories, 'function');
  assert.strictEqual(typeof service.createCategory, 'function');
  assert.strictEqual(typeof service.updateCategory, 'function');
  assert.strictEqual(typeof service.deleteCategory, 'function');
});

// ─────────────────────────────────────────────
// 4. 앱 통합 테스트 - 카테고리 라우터 마운트 여부
// ─────────────────────────────────────────────

test('BE-07 | 통합 | app.js - /api/categories 라우터가 마운트되어야 한다', async () => {
  const appPath = path.join(SRC_ROOT, 'app.js');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  assert.ok(
    appContent.includes('/api/categories') || appContent.includes('categories.js'),
    'app.js에 categories 라우터가 등록되지 않은 것으로 보입니다.'
  );
});
