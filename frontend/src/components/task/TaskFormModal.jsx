import { useState, useEffect } from 'react'
import { Modal } from '@/components/common/Modal.jsx'
import { Input } from '@/components/common/Input.jsx'
import { Button } from '@/components/common/Button.jsx'

export function TaskFormModal({
  isOpen,
  onClose,
  task = null,
  categories = [],
  onSubmit,
  isLoading,
  error,
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState(null)
  const [dueDate, setDueDate] = useState('')
  const [titleError, setTitleError] = useState('')

  const isEditMode = !!task

  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setCategoryId(task.categoryId || null)
      setDueDate(task.dueDate ? task.dueDate.slice(0, 16) : '')
    } else {
      setTitle('')
      setDescription('')
      setCategoryId(null)
      setDueDate('')
    }
    setTitleError('')
  }, [task, isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!title.trim()) {
      setTitleError('제목을 입력해주세요')
      return
    }

    const taskData = {
      title: title.trim(),
      description: description.trim() || null,
      categoryId: categoryId || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    }

    onSubmit?.(taskData)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? '할일 수정' : '새 할일 추가'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="제목"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setTitleError('')
          }}
          placeholder="할일 제목을 입력하세요"
          error={titleError}
          required
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">상세 설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="상세 설명을 입력하세요 (선택)"
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">카테고리</label>
          <select
            value={categoryId || ''}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">미분류</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="종료일"
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        {error && (
          <p className="text-sm text-rose-600">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isEditMode ? '수정하기' : '생성하기'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}