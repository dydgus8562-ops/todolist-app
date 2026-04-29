import { TASK_STATUS } from '@/constants/taskStatus.js'
import { Badge } from '@/components/common/Badge.jsx'
import { formatDate, isOverdue } from '@/utils/dateUtils.js'

export function TaskItem({
  task,
  onComplete,
  onUncomplete,
  onEdit,
  onDelete,
  categoryName,
}) {
  const { id, title, description, status, dueDate, categoryId } = task
  const isCompleted = status === TASK_STATUS.COMPLETED
  const taskOverdue = !isCompleted && dueDate && isOverdue(dueDate)

  const handleToggleComplete = () => {
    if (isCompleted) {
      onUncomplete?.(id)
    } else {
      onComplete?.(id)
    }
  }

  return (
    <div
      className={`group flex flex-col gap-2 rounded-lg border bg-white p-4 shadow-sm transition-colors ${
        taskOverdue
          ? 'border-l-4 border-l-rose-500 bg-rose-50/50'
          : 'border-slate-200'
      } ${isCompleted ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={handleToggleComplete}
          className="mt-1 h-5 w-5 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-600"
        />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3
              className={`font-medium ${
                isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
              }`}
            >
              {taskOverdue && (
                <span className="mr-2 text-rose-500" title="기한 초과">
                  🚨
                </span>
              )}
              {title}
            </h3>
            <Badge status={taskOverdue ? TASK_STATUS.OVERDUE : status} />
          </div>

          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>
              {categoryName || '미분류'}
            </span>
            {dueDate && (
              <span className={taskOverdue ? 'text-rose-500' : ''}>
                📅 {formatDate(dueDate)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onEdit?.(task)}
          className="rounded px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
        >
          수정
        </button>
        <button
          onClick={() => onDelete?.(id)}
          className="rounded px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
        >
          삭제
        </button>
      </div>
    </div>
  )
}