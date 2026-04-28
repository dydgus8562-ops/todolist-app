-- ============================================================
-- TodoList Application - Database Schema
-- ============================================================
-- PostgreSQL 12.0+
-- 참조: docs/6-erd.md
-- 작성일: 2026-04-28
--
-- 테이블 생성 순서 (FK 의존성)
--   1. users
--   2. categories  (FK → users)
--   3. tasks       (FK → users, categories)
--
-- OVERDUE 상태 설계 주의사항 (BR-06)
--   tasks.status DB 저장값은 'PENDING' | 'COMPLETED' 만 사용.
--   OVERDUE 는 조회 시 서비스 레이어에서 실시간 판별:
--     due_date IS NOT NULL AND due_date < NOW() AND status = 'PENDING'
-- ============================================================


-- ============================================================
-- 초기화 (개발 환경용 — 운영 환경에서는 주석 처리)
-- ============================================================
DROP TABLE IF EXISTS tasks      CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users      CASCADE;


-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE users (
    id         SERIAL       PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   TEXT         NOT NULL,           -- bcrypt 해시값 (BR-03)
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 로그인 시 이메일 검색 최적화
CREATE INDEX idx_users_email ON users (email);


-- ============================================================
-- 2. categories
-- ============================================================
CREATE TABLE categories (
    id         SERIAL       PRIMARY KEY,
    user_id    INTEGER      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- 동일 사용자 내 카테고리 이름 중복 방지 (BR-04)
    CONSTRAINT uk_categories_user_name UNIQUE (user_id, name)
);

-- 사용자별 카테고리 목록 조회 최적화
CREATE INDEX idx_categories_user_id ON categories (user_id);


-- ============================================================
-- 3. tasks
-- ============================================================
CREATE TABLE tasks (
    id          SERIAL       PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users (id)      ON DELETE CASCADE,
    category_id INTEGER               REFERENCES categories (id) ON DELETE SET NULL,  -- NULL 허용: 미분류 할일 (BR-05)
    title       VARCHAR(255) NOT NULL,
    description TEXT,                                                                  -- NULL 허용: 선택 입력
    due_date    TIMESTAMPTZ,                                                           -- NULL 허용: 기한 없는 할일 (BR-08)
    status      VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                             CHECK (status IN ('PENDING', 'COMPLETED')),               -- OVERDUE 는 DB 미저장 (BR-06)
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 사용자별 할일 목록 조회
CREATE INDEX idx_tasks_user_id       ON tasks (user_id);
-- 카테고리별 할일 조회
CREATE INDEX idx_tasks_category_id   ON tasks (category_id);
-- 상태 필터 조회 (사용자 + 상태 복합)
CREATE INDEX idx_tasks_user_status   ON tasks (user_id, status);
-- OVERDUE 판별: PENDING 상태의 due_date 만 인덱싱 (Partial Index)
CREATE INDEX idx_tasks_due_date      ON tasks (due_date) WHERE status = 'PENDING';


-- ============================================================
-- 스키마 검증 쿼리 (적용 후 확인용)
-- ============================================================

-- 생성된 테이블 목록
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;

-- 컬럼 상세 정보
-- SELECT table_name, column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
-- ORDER BY table_name, ordinal_position;

-- 제약 조건 목록
-- SELECT constraint_name, table_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_schema = 'public'
-- ORDER BY table_name, constraint_name;
