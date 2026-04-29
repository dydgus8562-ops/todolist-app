import { TaskItem } from './TaskItem.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'

export function TaskList({
  tasks,
  categories = [],
  onComplete,
  onUncomplete,
  onEdit,
  onDelete,
  onAddTask,
}) {
  const getCategoryName = (categoryId) => {
    if (!categoryId) return null
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || null
  }

  if (!tasks || tasks.length === 0) {
    return (
      <EmptyState
        message="할 일이 없습니다"
        actionLabel="새 할일 추가"
        onAction={onAddTask}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          categoryName={getCategoryName(task.categoryId)}
          onComplete={onComplete}
          onUncomplete={onUncomplete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}