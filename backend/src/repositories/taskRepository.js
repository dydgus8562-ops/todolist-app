import { query } from '../db/pool.js';

/**
 * 사용자의 할일 목록 조회 (카테고리 필터링 포함)
 * @param {Object} filter
 * @param {number} filter.userId
 * @param {number|null} [filter.categoryId]
 * @returns {Promise<Array>}
 */
export async function findAllByUserId({ userId, categoryId }) {
  let text = 'SELECT * FROM tasks WHERE user_id = $1';
  const params = [userId];

  // categoryId가 null이면 미분류 필터링이 아니라 필터링 없음으로 일단 처리 (요구사항)
  if (categoryId !== undefined && categoryId !== null) {
    text += ' AND category_id = $2';
    params.push(categoryId);
  }

  text += ' ORDER BY created_at DESC';
  const { rows } = await query(text, params);
  return rows;
}

/**
 * ID와 사용자 ID로 할일 단건 조회 (소유권 검증 포함)
 * @param {number} id
 * @param {number} userId
 * @returns {Promise<Object|null>}
 */
export async function findByIdAndUserId(id, userId) {
  const text = 'SELECT * FROM tasks WHERE id = $1 AND user_id = $2';
  const { rows } = await query(text, [id, userId]);
  return rows[0] || null;
}

/**
 * 할일 생성
 * @param {Object} taskData
 * @returns {Promise<Object>}
 */
export async function create({ userId, title, description, categoryId, dueDate }) {
  const text = `
    INSERT INTO tasks (user_id, title, description, category_id, due_date)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const { rows } = await query(text, [userId, title, description, categoryId, dueDate]);
  return rows[0];
}

/**
 * 할일 수정
 * @param {Object} taskData
 * @returns {Promise<Object>}
 */
export async function update({ id, userId, title, description, categoryId, dueDate, status }) {
  const text = `
    UPDATE tasks
    SET title = $1,
        description = $2,
        category_id = $3,
        due_date = $4,
        status = $5,
        updated_at = NOW()
    WHERE id = $6 AND user_id = $7
    RETURNING *
  `;
  const { rows } = await query(text, [title, description, categoryId, dueDate, status, id, userId]);
  return rows[0];
}

/**
 * 할일 삭제
 * @param {number} id
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function remove(id, userId) {
  const text = 'DELETE FROM tasks WHERE id = $1 AND user_id = $2';
  const { rowCount } = await query(text, [id, userId]);
  return rowCount > 0;
}

/**
 * 할일 상태 업데이트
 * @param {Object} data
 * @param {number} data.id
 * @param {number} data.userId
 * @param {string} data.status
 * @returns {Promise<Object>}
 */
export async function updateStatus({ id, userId, status }) {
  const text = `
    UPDATE tasks
    SET status = $1,
        updated_at = NOW()
    WHERE id = $2 AND user_id = $3
    RETURNING *
  `;
  const { rows } = await query(text, [status, id, userId]);
  return rows[0];
}

export { remove as delete };

export default {
  findAllByUserId,
  findByIdAndUserId,
  create,
  update,
  delete: remove,
  updateStatus,
};
