import { useState } from 'react'
import { useCreateCategory } from '@/hooks/useCategories.js'

export function AddCategoryForm() {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const { mutate: createCategory, isPending } = useCreateCategory()

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('카테고리 이름을 입력해주세요.')
      return
    }
    createCategory(trimmed, {
      onSuccess: () => {
        setName('')
        setError('')
      },
      onError: (err) => {
        const msg = err?.response?.data?.error?.message || '생성에 실패했습니다.'
        setError(msg)
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="px-2">
      <div className="flex items-center gap-1">
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          placeholder="새 카테고리..."
          className="flex-1 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          aria-label="새 카테고리 이름"
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-blue-600 px-2 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
          aria-label="카테고리 추가"
        >
          +
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </form>
  )
}
