import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/userRepository.js';
import { AppError } from '../utils/AppError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { config } from '../config/index.js';

const SALT_ROUNDS = 12;

/**
 * 회원가입 (BR-11)
 * @param {Object} userData 
 * @param {string} userData.email
 * @param {string} userData.password
 * @returns {Promise<Object>} 생성된 유저 정보
 */
export async function register({ email, password }) {
    // 1. 이메일 중복 체크
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
        throw new AppError(409, ERROR_CODES.DUPLICATE_EMAIL, 'Email already in use');
    }

    // 2. 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. 유저 생성
    const newUser = await userRepository.create({
        email,
        password: hashedPassword,
    });

    return newUser;
}

/**
 * 로그인 (BR-01)
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} { user, token }
 */
export async function login(email, password) {
    // 1. 유저 조회
    const user = await userRepository.findByEmail(email);
    if (!user) {
        throw new AppError(401, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // 2. 비밀번호 검증
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new AppError(401, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // 3. JWT 토큰 발급 (HS-512)
    const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.secret,
        {
            algorithm: 'HS512',
            expiresIn: config.jwt.expiresIn,
        }
    );

    return {
        user: {
            id: user.id,
            email: user.email,
            createdAt: user.created_at,
        },
        token,
    };
}

/**
 * 현재 로그인한 사용자 정보 조회
 * @param {number} userId 
 * @returns {Promise<Object>}
 */
export async function getMe(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
        throw new AppError(404, ERROR_CODES.USER_NOT_FOUND, 'User not found');
    }
    return user;
}

export default {
    register,
    login,
    getMe,
};
