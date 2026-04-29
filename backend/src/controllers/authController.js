import authService from '../services/authService.js';
import { isValidEmail, isValidPassword } from '../utils/validators.js';
import { AppError } from '../utils/AppError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * 회원가입 핸들러
 */
export async function register(req, res, next) {
    try {
        const { email, password } = req.body;

        // 입력 검증
        if (!email || !isValidEmail(email)) {
            throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid email format');
        }
        if (!password || !isValidPassword(password)) {
            throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Password must be at least 8 characters long and include letters, numbers, and special characters');
        }

        const user = await authService.register({ email, password });

        res.status(201).json({
            success: true,
            data: { user },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 로그인 핸들러
 */
export async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Email and password are required');
        }

        const { user, token } = await authService.login(email, password);

        res.status(200).json({
            success: true,
            data: { user, token },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 로그아웃 핸들러
 */
export async function logout(_req, res, _next) {
    // 클라이언트 측에서 토큰을 폐기하므로 서버에서는 성공 응답만 반환
    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
    });
}

/**
 * 현재 사용자 정보 조회 핸들러
 */
export async function me(req, res, next) {
    try {
        const userId = req.user.userId;
        const user = await authService.getMe(userId);

        res.status(200).json({
            success: true,
            data: { user },
        });
    } catch (error) {
        next(error);
    }
}

export default {
    register,
    login,
    logout,
    me,
};
