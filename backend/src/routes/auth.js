import { Router } from 'express';
import authController from '../controllers/authController.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    회원가입
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    로그인
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    로그아웃
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    현재 로그인한 사용자 정보 조회
 * @access  Private
 */
router.get('/me', authenticate, authController.me);

export default router;
