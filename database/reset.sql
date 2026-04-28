-- ============================================================
-- TodoList Application - Reset Database
-- ============================================================
-- ⚠️ 운영 환경에서는 절대 실행 금지
-- 실행: psql -U todolist_user -d todolist_dev -f reset.sql
-- ============================================================

-- FK 순서 역순: tasks → categories → users
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;