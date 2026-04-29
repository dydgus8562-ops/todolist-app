import express from 'express';
import taskController from '../controllers/taskController.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = express.Router();

// 모든 라우트에 인증 적용
router.use(authenticate);

/**
 * @route   GET /api/tasks
 * @desc    할일 목록 조회 (카테고리, 상태 필터링 지원)
 */
router.get('/', taskController.getTasks);

/**
 * @route   POST /api/tasks
 * @desc    할일 생성
 */
router.post('/', taskController.createTask);

/**
 * @route   PATCH /api/tasks/:id
 * @desc    할일 상세 수정 (제목, 설명, 카테고리, 기한 등)
 */
router.patch('/:id', taskController.updateTask);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    할일 삭제
 */
router.delete('/:id', taskController.deleteTask);

/**
 * @route   PATCH /api/tasks/:id/complete
 * @desc    할일 완료 처리
 */
router.patch('/:id/complete', taskController.completeTask);

/**
 * @route   PATCH /api/tasks/:id/reopen
 * @desc    할일 다시 열기 (완료 취소)
 */
router.patch('/:id/reopen', taskController.reopenTask);

export default router;
