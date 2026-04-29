import { Router } from 'express';
import categoryController from '../controllers/categoryController.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();

// 모든 카테고리 라우트는 인증 필수
router.use(authenticate);

/**
 * @route   GET /api/categories
 * @desc    카테고리 목록 조회
 * @access  Private
 */
router.get('/', categoryController.getCategories);

/**
 * @route   POST /api/categories
 * @desc    카테고리 생성
 * @access  Private
 */
router.post('/', categoryController.createCategory);

/**
 * @route   PATCH /api/categories/:id
 * @desc    카테고리 수정
 * @access  Private
 */
router.patch('/:id', categoryController.updateCategory);

/**
 * @route   DELETE /api/categories/:id
 * @desc    카테고리 삭제
 * @access  Private
 */
router.delete('/:id', categoryController.deleteCategory);

export default router;
