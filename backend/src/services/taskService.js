import taskRepository from '../repositories/taskRepository.js';
import categoryRepository from '../repositories/categoryRepository.js';
import { AppError } from '../utils/AppError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * 할일의 실시간 상태 계산 (BR-06)
 * @param {Object} task
 * @returns {string} 'PENDING' | 'COMPLETED' | 'OVERDUE'
 */
export function enrichTaskStatus(task) {
  const { status, due_date: dueDate } = task;
  
  if (status === 'COMPLETED') return 'COMPLETED';
  if (!dueDate) return 'PENDING';
  
  const now = new Date();
  const due = new Date(dueDate);
  
  if (due < now && status === 'PENDING') {
    return 'OVERDUE';
  }
  
  return 'PENDING';
}

/**
 * DB 객체를 API 응답용 DTO로 변환
 * @param {Object} task
 * @returns {Object}
 */
const mapToDto = (task) => ({
  id: task.id,
  categoryId: task.category_id,
  title: task.title,
  description: task.description,
  dueDate: task.due_date,
  status: enrichTaskStatus(task),
  createdAt: task.created_at,
  updatedAt: task.updated_at
});

/**
 * 할일 목록 조회
 * @param {Object} options
 * @param {number} options.userId
 * @param {number|null} [options.categoryId]
 * @param {string} [options.status]
 * @returns {Promise<Array>}
 */
export async function getTasks({ userId, categoryId, status }) {
  const tasks = await taskRepository.findAllByUserId({ userId, categoryId });
  
  const enrichedTasks = tasks.map(mapToDto);

  if (status) {
    return enrichedTasks.filter(task => task.status === status);
  }

  return enrichedTasks;
}

/**
 * 할일 생성
 * @param {Object} taskData
 * @returns {Promise<Object>}
 */
export async function createTask({ userId, title, description, categoryId, dueDate }) {
  if (categoryId) {
    const category = await categoryRepository.findByIdAndUserId(categoryId, userId);
    if (!category) {
      throw new AppError(400, ERROR_CODES.CATEGORY_NOT_FOUND, 'Category not found or access denied');
    }
  }

  const task = await taskRepository.create({ userId, title, description, categoryId, dueDate });
  return mapToDto(task);
}

/**
 * 할일 수정
 * @param {Object} taskData
 * @returns {Promise<Object>}
 */
export async function updateTask({ id, userId, title, description, categoryId, dueDate, status }) {
  const existingTask = await taskRepository.findByIdAndUserId(id, userId);
  if (!existingTask) {
    throw new AppError(404, ERROR_CODES.TASK_NOT_FOUND, 'Task not found');
  }

  if (categoryId) {
    const category = await categoryRepository.findByIdAndUserId(categoryId, userId);
    if (!category) {
      throw new AppError(400, ERROR_CODES.CATEGORY_NOT_FOUND, 'Category not found or access denied');
    }
  }

  const updatedTask = await taskRepository.update({
    id,
    userId,
    title: title !== undefined ? title : existingTask.title,
    description: description !== undefined ? description : existingTask.description,
    categoryId: categoryId !== undefined ? categoryId : existingTask.category_id,
    dueDate: dueDate !== undefined ? dueDate : existingTask.due_date,
    status: status !== undefined ? status : existingTask.status
  });

  return mapToDto(updatedTask);
}

/**
 * 할일 삭제
 * @param {number} id
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function deleteTask(id, userId) {
  const task = await taskRepository.findByIdAndUserId(id, userId);
  if (!task) {
    throw new AppError(404, ERROR_CODES.TASK_NOT_FOUND, 'Task not found');
  }

  await taskRepository.delete(id, userId);
}

/**
 * 할일 완료 처리
 * @param {number} id
 * @param {number} userId
 * @returns {Promise<Object>}
 */
export async function completeTask(id, userId) {
  const task = await taskRepository.findByIdAndUserId(id, userId);
  if (!task) {
    throw new AppError(404, ERROR_CODES.TASK_NOT_FOUND, 'Task not found');
  }

  // 이미 완료된 경우 멱등성 보장
  if (task.status === 'COMPLETED') {
    return mapToDto(task);
  }

  const updatedTask = await taskRepository.updateStatus({ id, userId, status: 'COMPLETED' });
  return mapToDto(updatedTask);
}

/**
 * 할일 다시 열기 (완료 취소)
 * @param {number} id
 * @param {number} userId
 * @returns {Promise<Object>}
 */
export async function reopenTask(id, userId) {
  const task = await taskRepository.findByIdAndUserId(id, userId);
  if (!task) {
    throw new AppError(404, ERROR_CODES.TASK_NOT_FOUND, 'Task not found');
  }

  // 이미 PENDING인 경우 멱등성 보장
  if (task.status === 'PENDING') {
    return mapToDto(task);
  }

  const updatedTask = await taskRepository.updateStatus({ id, userId, status: 'PENDING' });
  return mapToDto(updatedTask);
}

export default {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  enrichTaskStatus,
  completeTask,
  reopenTask,
};
