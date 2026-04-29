import categoryService from '../services/categoryService.js';
import { isNonEmptyString, isPositiveInteger } from '../utils/validators.js';
import { AppError } from '../utils/AppError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * 카테고리 목록 조회 핸들러
 */
export async function getCategories(req, res, next) {
  try {
    const userId = req.user.userId;
    const categories = await categoryService.getCategories(userId);

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 카테고리 생성 핸들러
 */
export async function createCategory(req, res, next) {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    if (!isNonEmptyString(name) || name.length > 100) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Name is required and must be under 100 characters');
    }

    const category = await categoryService.createCategory({ userId, name });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 카테고리 수정 핸들러
 */
export async function updateCategory(req, res, next) {
  try {
    const userId = req.user.userId;
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;

    if (!isPositiveInteger(id)) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid category ID');
    }

    if (!isNonEmptyString(name) || name.length > 100) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Name is required and must be under 100 characters');
    }

    const category = await categoryService.updateCategory({ id, userId, name });

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 카테고리 삭제 핸들러
 */
export async function deleteCategory(req, res, next) {
  try {
    const userId = req.user.userId;
    const id = parseInt(req.params.id, 10);

    if (!isPositiveInteger(id)) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid category ID');
    }

    await categoryService.deleteCategory(id, userId);

    res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
