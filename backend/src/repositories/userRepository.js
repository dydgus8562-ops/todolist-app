import { query } from '../db/pool.js';

/**
 * 이메일로 사용자 조회
 * @param {string} email 
 * @returns {Promise<Object|null>}
 */
export async function findByEmail(email) {
    const text = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await query(text, [email]);
    return rows[0] || null;
}

/**
 * ID로 사용자 조회
 * @param {number} id 
 * @returns {Promise<Object|null>}
 */
export async function findById(id) {
    const text = 'SELECT id, email, created_at FROM users WHERE id = $1';
    const { rows } = await query(text, [id]);
    return rows[0] || null;
}

/**
 * 신규 사용자 생성
 * @param {Object} userData 
 * @param {string} userData.email
 * @param {string} userData.password
 * @returns {Promise<Object>}
 */
export async function create({ email, password }) {
    const text = `
        INSERT INTO users (email, password)
        VALUES ($1, $2)
        RETURNING id, email, created_at
    `;
    const { rows } = await query(text, [email, password]);
    return rows[0];
}

export default {
    findByEmail,
    findById,
    create,
};
