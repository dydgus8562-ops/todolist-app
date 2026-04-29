import { query } from '../db/pool.js';

/**
 * 사용자의 모든 카테고리 조회
 * @param {number} userId
 * @returns {Promise<Array>}
 */
export async function findAllByUserId(userId) {
  const text = 'SELECT * FROM categories WHERE user_id = $1 ORDER BY name ASC';
  const { rows } = await query(text, [userId]);
  return rows;
}

/**
 * ID와 사용자 ID로 카테고리 단건 조회 (소유권 검증 포함)
 * @param {number} id
 * @param {number} userId
 * @returns {Promise<Object|null>}
 */
export async function findByIdAndUserId(id, userId) {
  const text = 'SELECT * FROM categories WHERE id = $1 AND user_id = $2';
  const { rows } = await query(text, [id, userId]);
  return rows[0] || null;
}

/**
 * 이름과 사용자 ID로 카테고리 조회 (중복 검사용)
 * @param {string} name
 * @param {number} userId
 * @returns {Promise<Object|null>}
 */
export async function findByNameAndUserId(name, userId) {
  const text = 'SELECT * FROM categories WHERE name = $1 AND user_id = $2';
  const { rows } = await query(text, [name, userId]);
  return rows[0] || null;
}

/**
 * 카테고리 생성
 * @param {Object} categoryData
 * @param {number} categoryData.userId
 * @param {string} categoryData.name
 * @returns {Promise<Object>}
 */
export async function create({ userId, name }) {
  const text = 'INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING *';
  const { rows } = await query(text, [userId, name]);
  return rows[0];
}

/**
 * 카테고리 수정
 * @param {Object} categoryData
 * @param {number} categoryData.id
 * @param {number} categoryData.userId
 * @param {string} categoryData.name
 * @returns {Promise<Object>}
 */
export async function update({ id, userId, name }) {
  const text = 'UPDATE categories SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *';
  const { rows } = await query(text, [name, id, userId]);
  return rows[0];
}

/**
 * 카테고리 삭제
 * @param {number} id
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function remove(id, userId) {
  const text = 'DELETE FROM categories WHERE id = $1 AND user_id = $2';
  const { rowCount } = await query(text, [id, userId]);
  return rowCount > 0;
}

export { remove as delete };

export default {
  findAllByUserId,
  findByIdAndUserId,
  findByNameAndUserId,
  create,
  update,
  delete: remove,
};
