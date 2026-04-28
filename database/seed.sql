-- ============================================================
-- TodoList Application - Seed Data
-- ============================================================
-- 사용자 2명, 카테고리 3개, 할일 10개
-- 실행: psql -U todolist_user -d todolist_dev -f seed.sql
-- ============================================================

-- 시드 데이터 삽입 (중복 실행避免를 위해 ON CONFLICT 처리)
BEGIN;

-- 1. Users (2명)
INSERT INTO users (email, password) VALUES
    ('user1@example.com', '$2a$12$01FSMJsMiblr2gEsMH7MDuBO.Yw.Hora9f786z0nvdqkag0VSOR8S'),
    ('user2@example.com', '$2a$12$01FSMJsMiblr2gEsMH7MDuBO.Yw.Hora9f786z0nvdqkag0VSOR8S')
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;

-- 2. Categories (3개: user1-업업, user1-개인, user2-학습)
INSERT INTO categories (user_id, name) VALUES
    ((SELECT id FROM users WHERE email = 'user1@example.com'), '업무'),
    ((SELECT id FROM users WHERE email = 'user1@example.com'), '개인'),
    ((SELECT id FROM users WHERE email = 'user2@example.com'), '학습')
ON CONFLICT DO NOTHING;

-- 3. Tasks (10개 - 다양한 시나리오)
-- scenario 1: PENDING + 미래 due_date (정상 PENDING)
INSERT INTO tasks (user_id, category_id, title, description, due_date, status) VALUES
    ((SELECT id FROM users WHERE email = 'user1@example.com'),
     (SELECT id FROM categories WHERE user_id = (SELECT id FROM users WHERE email = 'user1@example.com') AND name = '업무' LIMIT 1),
     ' будущего проекта', '장기 과제planing', NOW() + INTERVAL '7 days', 'PENDING'),

-- scenario 2: PENDING + 과거 due_date (OVERDUE 판별 대상) × 2건
    ((SELECT id FROM users WHERE email = 'user1@example.com'),
     (SELECT id FROM categories WHERE user_id = (SELECT id FROM users WHERE email = 'user1@example.com') AND name = '업무' LIMIT 1),
     '기한이 지난 과제1', '이미 마감일 지남', NOW() - INTERVAL '3 days', 'PENDING'),

    ((SELECT id FROM users WHERE email = 'user1@example.com'),
     (SELECT id FROM categories WHERE user_id = (SELECT id FROM users WHERE email = 'user1@example.com') AND name = '개인' LIMIT 1),
     '기한이 지난 과제2', '벌써 오래됨', NOW() - INTERVAL '10 days', 'PENDING'),

-- scenario 3: COMPLETED + due_date 있음
    ((SELECT id FROM users WHERE email = 'user1@example.com'),
     (SELECT id FROM categories WHERE user_id = (SELECT id FROM users WHERE email = 'user1@example.com') AND name = '개인' LIMIT 1),
     '완료된 개인 과제', '이미 완료함', NOW() - INTERVAL '5 days', 'COMPLETED'),

-- scenario 4: category_id NULL + due_date NULL (미분류, 기한 없음)
    ((SELECT id FROM users WHERE email = 'user1@example.com'),
     NULL,
     '미분류 할일', '카테고리 없고 기한도 없음', NULL, 'PENDING'),

-- scenario 5: category_id NULL + 과거 due_date (OVERDUE 판별 대상)
    ((SELECT id FROM users WHERE email = 'user1@example.com'),
     NULL,
     '미분류 기한 초과', '카테고리 없이 기한 지남', NOW() - INTERVAL '2 days', 'PENDING'),

-- scenario 6: PENDING + 오늘 자정 due_date (경계값 - 한국은 UTC+9)
    ((SELECT id FROM users WHERE email = 'user1@example.com'),
     (SELECT id FROM categories WHERE user_id = (SELECT id FROM users WHERE email = 'user1@example.com') AND name = '업무' LIMIT 1),
     '오늘 마감 과제', '한국 자정 기준', CURRENT_DATE + INTERVAL '1 second', 'PENDING'),

-- scenario 7: COMPLETED + category_id NULL + 과거 due_date
    ((SELECT id FROM users WHERE email = 'user2@example.com'),
     NULL,
     '완료된 학습', '이미 끝냄', NOW() - INTERVAL '1 day', 'COMPLETED'),

-- scenario 8: PENDING + 미래 due_date 추가
    ((SELECT id FROM users WHERE email = 'user2@example.com'),
     (SELECT id FROM categories WHERE user_id = (SELECT id FROM users WHERE email = 'user2@example.com') AND name = '학습' LIMIT 1),
     '학습计划', '장래 과제', NOW() + INTERVAL '14 days', 'PENDING'),

-- scenario 9: COMPLETED + category_id NULL
    ((SELECT id FROM users WHERE email = 'user2@example.com'),
     NULL,
     '완료된 미분류', '카테고리 없이 완료', NOW() + INTERVAL '1 day', 'COMPLETED');

COMMIT;

-- ============================================================
-- 검증 쿼리 (실행 후 확인용)
-- ============================================================

-- SELECT '=== Users ===' AS info;
-- SELECT * FROM users;

-- SELECT '=== Categories ===' AS info;
-- SELECT c.*, u.email AS user_email FROM categories c JOIN users u ON c.user_id = u.id;

-- SELECT '=== Tasks ===' AS info;
-- SELECT t.*, u.email AS user_email, c.name AS category_name
-- FROM tasks t
-- JOIN users u ON t.user_id = u.id
-- LEFT JOIN categories c ON t.category_id = c.id
-- ORDER BY t.user_id, t.id;

-- SELECT '=== OVERDUE 판별 ===' AS info;
-- SELECT t.*, u.email AS user_email
-- FROM tasks t
-- JOIN users u ON t.user_id = u.id
-- WHERE t.status = 'PENDING' AND t.due_date < NOW() AND t.due_date IS NOT NULL;

-- SELECT '=== 미분류 할일 ===' AS info;
-- SELECT t.*, u.email AS user_email
-- FROM tasks t
-- JOIN users u ON t.user_id = u.id
-- WHERE t.category_id IS NULL;