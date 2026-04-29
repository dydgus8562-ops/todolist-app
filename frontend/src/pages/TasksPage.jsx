import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { CategoryList } from '@/components/category/CategoryList.jsx'
import { TaskList } from '@/components/task/TaskList.jsx'
import { TaskFormModal } from '@/components/task/TaskFormModal.jsx'
import { DeleteConfirmModal } from '@/components/task/DeleteConfirmModal.jsx'
import { useGetTasks } from '@/hooks/useTasks.js'
import { useGetCategories } from '@/hooks/useCategories.js'
import {
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
  useUncompleteTask,
} from '@/hooks/useTasks.js'
import { LoadingSpinner } from '@/components/common/LoadingSpinner.jsx'

export function TasksPage() {
  const [categoryFilter, setCategoryFilter] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)

  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState(null)

  const { data: categories = [], isLoading: categoriesLoading } = useGetCategories()
  const { data: tasks = [], isLoading: tasksLoading, error } = useGetTasks({
    categoryId: categoryFilter,
    status: statusFilter,
  })

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTaskHook = useDeleteTask()
  const completeTask = useCompleteTask()
  const uncompleteTask = useUncompleteTask()

  const isLoading = categoriesLoading || tasksLoading

  const handleCategoryChange = (categoryId) => {
    setCategoryFilter(categoryId)
  }

  const handleStatusChange = (status) => {
    setStatusFilter(status)
  }

  const handleAddTask = () => {
    setEditingTask(null)
    setIsFormModalOpen(true)
  }

  const handleEdit = (task) => {
    setEditingTask(task)
    setIsFormModalOpen(true)
  }

  const handleFormSubmit = (taskData) => {
    if (editingTask) {
      updateTask.mutate(
        { id: editingTask.id, taskData },
        {
          onSuccess: () => {
            setIsFormModalOpen(false)
            setEditingTask(null)
          },
        }
      )
    } else {
      createTask.mutate(taskData, {
        onSuccess: () => {
          setIsFormModalOpen(false)
          setEditingTask(null)
        },
      })
    }
  }

  const handleDeleteClick = (id) => {
    setDeletingTaskId(id)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = () => {
    deleteTaskHook.mutate(deletingTaskId, {
      onSuccess: () => {
        setIsDeleteModalOpen(false)
        setDeletingTaskId(null)
      },
    })
  }

  const handleComplete = (id) => {
    completeTask.mutate(id)
  }

  const handleUncomplete = (id) => {
    uncompleteTask.mutate(id)
  }

  const categorySlot = (
    <CategoryList
      categories={categories}
      activeCategoryId={categoryFilter}
      onCategoryChange={handleCategoryChange}
    />
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-rose-600">
        할일을 불러오는 중 오류가 발생했습니다.
      </div>
    )
  }

  return (
    <AppLayout
      activeStatus={statusFilter}
      onStatusChange={handleStatusChange}
      categorySlot={categorySlot}
    >
      <div className="flex items-center justify-between p-4 lg:p-6">
        <h1 className="text-xl font-bold text-slate-900">
          할일 목록
          {statusFilter && (
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({statusFilter === 'PENDING' ? '대기중' : statusFilter === 'COMPLETED' ? '완료' : '기한 초과'})
            </span>
          )}
        </h1>
        <button
          onClick={handleAddTask}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 새로운 할일 추가
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 lg:px-6">
        <TaskList
          tasks={tasks}
          categories={categories}
          onComplete={handleComplete}
          onUncomplete={handleUncomplete}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onAddTask={handleAddTask}
        />
      </div>

      <TaskFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false)
          setEditingTask(null)
        }}
        task={editingTask}
        categories={categories}
        onSubmit={handleFormSubmit}
        isLoading={createTask.isPending || updateTask.isPending}
        error={
          createTask.error?.message ||
          updateTask.error?.message
        }
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setDeletingTaskId(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="할일 삭제"
        message="이 할일을 삭제하시겠습니까? 삭제된 할일은 복구할 수 없습니다."
        isLoading={deleteTaskHook.isPending}
      />
    </AppLayout>
  )
}