import { useState } from 'react'
import { useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories.js'

export function CategoryItem({ category, isActive, onSelect }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(category.name)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editError, setEditError] = useState('')

  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory()
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteCategory()

  function handleEditSubmit(e) {
    e.preventDefault()
    const trimmed = editName.trim()
    if (!trimmed) {
      setEditError('카테고리 이름을 입력해주세요.')
      return
    }
    updateCategory(
      { id: category.id, name: trimmed },
      {
        onSuccess: () => setIsEditing(false),
        onError: (err) => {
          const msg = err?.response?.data?.error?.message || '수정에 실패했습니다.'
          setEditError(msg)
        },
      }
    )
  }

  function handleDelete() {
    deleteCategory(category.id, {
      onSuccess: () => setShowDeleteConfirm(false),
    })
  }

  if (isEditing) {
    return (
      <li>
        <form onSubmit={handleEditSubmit} className="flex items-center gap-1 px-2 py-1">
          <input
            autoFocus
            value={editName}
            onChange={(e) => { setEditName(e.target.value); setEditError('') }}
            className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
            aria-label="카테고리 이름 편집"
          />
          <button
            type="submit"
            disabled={isUpdating}
            className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-50"
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => { setIsEditing(false); setEditName(category.name); setEditError('') }}
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            취소
          </button>
        </form>
        {editError && <p className="px-2 text-xs text-rose-600">{editError}</p>}
      </li>
    )
  }

  return (
    <li>
      {showDeleteConfirm ? (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm">
          <p className="mb-2 text-slate-700">
            <span className="font-medium">'{category.name}'</span>을 삭제할까요?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-100 disabled:opacity-50"
            >
              삭제
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className={`group flex items-center gap-1 rounded-lg px-3 py-2 transition-colors ${
          isActive ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50'
        }`}>
          <button
            className="flex-1 text-left text-sm"
            onClick={() => onSelect(category.id)}
          >
            {category.name}
          </button>
          <button
            aria-label={`${category.name} 수정`}
            onClick={() => { setIsEditing(true); setEditName(category.name) }}
            className="hidden rounded p-0.5 text-slate-400 hover:text-slate-600 group-hover:block"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            aria-label={`${category.name} 삭제`}
            onClick={() => setShowDeleteConfirm(true)}
            className="hidden rounded p-0.5 text-slate-400 hover:text-rose-500 group-hover:block"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </li>
  )
}
