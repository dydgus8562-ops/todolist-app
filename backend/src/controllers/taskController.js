import taskService from '../services/taskService.js';
import { isNonEmptyString, isPositiveInteger, isValidDate } from '../utils/validators.js';
import { AppError } from '../utils/AppError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * 할일 목록 조회 핸들러
 */
export async function getTasks(req, res, next) {
  try {
    const userId = req.user.userId;
    const { categoryId, status } = req.query;
    
    let parsedCategoryId = undefined;
    if (categoryId !== undefined && categoryId !== 'null') {
      parsedCategoryId = parseInt(categoryId, 10);
      if (isNaN(parsedCategoryId)) {
        throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid categoryId');
      }
    } else if (categoryId === 'null') {
      parsedCategoryId = null;
    }

    if (status && !['PENDING', 'COMPLETED', 'OVERDUE'].includes(status)) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid status filter');
    }

    const tasks = await taskService.getTasks({
      userId,
      categoryId: parsedCategoryId,
      status
    });

    res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 할일 생성 핸들러
 */
export async function createTask(req, res, next) {
  try {
    const userId = req.user.userId;
    const { title, description, categoryId, dueDate } = req.body;

    if (!isNonEmptyString(title) || title.length > 255) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Title is required and must be under 255 characters');
    }

    if (dueDate && !isValidDate(dueDate)) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid dueDate format');
    }

    if (categoryId && !isPositiveInteger(parseInt(categoryId, 10))) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid categoryId');
    }

    const task = await taskService.createTask({
      userId,
      title,
      description,
      categoryId: categoryId ? parseInt(categoryId, 10) : null,
      dueDate
    });

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 할일 수정 핸들러
 */
export async function updateTask(req, res, next) {
  try {
    const userId = req.user.userId;
    const id = parseInt(req.params.id, 10);
    const { title, description, categoryId, dueDate, status } = req.body;

    if (!isPositiveInteger(id)) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid task ID');
    }

    if (title !== undefined && (!isNonEmptyString(title) || title.length > 255)) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Title must be non-empty and under 255 characters');
    }

    if (dueDate !== undefined && dueDate !== null && !isValidDate(dueDate)) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid dueDate format');
    }

    if (categoryId !== undefined && categoryId !== null && !isPositiveInteger(parseInt(categoryId, 10))) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid categoryId');
    }

    const task = await taskService.updateTask({
      id,
      userId,
      title,
      description,
      categoryId: categoryId !== undefined ? (categoryId ? parseInt(categoryId, 10) : null) : undefined,
      dueDate,
      status
    });

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 할일 삭제 핸들러
 */
export async function deleteTask(req, res, next) {
  try {
    const userId = req.user.userId;
    const id = parseInt(req.params.id, 10);

    if (!isPositiveInteger(id)) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid task ID');
    }

    await taskService.deleteTask(id, userId);

    res.status(200).json({
      success: true,
      data: null
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 할일 완료 처리 핸들러
 */
export async function completeTask(req, res, next) {
  try {
    const userId = req.user.userId;
    const id = parseInt(req.params.id, 10);

    if (!isPositiveInteger(id)) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid task ID');
    }

    const task = await taskService.completeTask(id, userId);

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 할일 다시 열기 핸들러
 */
export async function reopenTask(req, res, next) {
  try {
    const userId = req.user.userId;
    const id = parseInt(req.params.id, 10);

    if (!isPositiveInteger(id)) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid task ID');
    }

    const task = await taskService.reopenTask(id, userId);

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  reopenTask,
};
