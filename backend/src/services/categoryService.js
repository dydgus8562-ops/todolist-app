import categoryRepository from '../repositories/categoryRepository.js';
import { AppError } from '../utils/AppError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * 카테고리 목록 조회
 * @param {number} userId
 * @returns {Promise<Array>}
 */
export async function getCategories(userId) {
  return await categoryRepository.findAllByUserId(userId);
}

/**
 * 카테고리 생성 (BR-04)
 * @param {Object} categoryData
 * @param {number} categoryData.userId
 * @param {string} categoryData.name
 * @returns {Promise<Object>}
 */
export async function createCategory({ userId, name }) {
  // 동일 사용자 내 카테고리 이름 중복 검사
  const existingCategory = await categoryRepository.findByNameAndUserId(name, userId);
  if (existingCategory) {
    throw new AppError(409, ERROR_CODES.DUPLICATE_CATEGORY, 'Category name already exists');
  }

  return await categoryRepository.create({ userId, name });
}

/**
 * 카테고리 수정
 * @param {Object} categoryData
 * @param {number} categoryData.id
 * @param {number} categoryData.userId
 * @param {string} categoryData.name
 * @returns {Promise<Object>}
 */
export async function updateCategory({ id, userId, name }) {
  // 소유권 및 존재 여부 확인
  const category = await categoryRepository.findByIdAndUserId(id, userId);
  if (!category) {
    throw new AppError(404, ERROR_CODES.CATEGORY_NOT_FOUND, 'Category not found');
  }

  // 수정하려는 이름이 이미 존재하는지 확인 (자신 제외)
  const existingCategory = await categoryRepository.findByNameAndUserId(name, userId);
  if (existingCategory && existingCategory.id !== id) {
    throw new AppError(409, ERROR_CODES.DUPLICATE_CATEGORY, 'Category name already exists');
  }

  return await categoryRepository.update({ id, userId, name });
}

/**
 * 카테고리 삭제 (BR-05)
 * @param {number} id
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function deleteCategory(id, userId) {
  const category = await categoryRepository.findByIdAndUserId(id, userId);
  if (!category) {
    throw new AppError(404, ERROR_CODES.CATEGORY_NOT_FOUND, 'Category not found');
  }

  // 삭제 실행 (SET NULL은 DB FK 설정에 의해 자동 처리됨)
  await categoryRepository.delete(id, userId);
}

export default {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
