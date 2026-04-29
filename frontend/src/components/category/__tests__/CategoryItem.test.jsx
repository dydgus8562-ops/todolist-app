import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockUpdate = vi.fn()
const mockDelete = vi.fn()
vi.mock('@/hooks/useCategories.js', () => ({
  useUpdateCategory: () => ({ mutate: mockUpdate, isPending: false }),
  useDeleteCategory: () => ({ mutate: mockDelete, isPending: false }),
  useCreateCategory: vi.fn(),
  useGetCategories: vi.fn(),
}))

import { CategoryItem } from '../CategoryItem.jsx'

const mockCategory = { id: 1, name: '업무' }

function renderItem(props = {}) {
  const qc = new QueryClient()
  const defaults = { category: mockCategory, isActive: false, onSelect: vi.fn() }
  return render(
    <QueryClientProvider client={qc}>
      <ul><CategoryItem {...defaults} {...props} /></ul>
    </QueryClientProvider>
  )
}

describe('CategoryItem', () => {
  beforeEach(() => { mockUpdate.mockClear(); mockDelete.mockClear() })

  it('카테고리 이름이 렌더링된다', () => {
    renderItem()
    expect(screen.getByText('업무')).toBeInTheDocument()
  })

  it('isActive=true이면 활성 스타일이 적용된다', () => {
    renderItem({ isActive: true })
    const btn = screen.getByRole('button', { name: '업무' })
    expect(btn.closest('div').className).toContain('bg-slate-100')
  })

  it('이름 버튼 클릭 시 onSelect(id)가 호출된다', () => {
    const onSelect = vi.fn()
    renderItem({ onSelect })
    fireEvent.click(screen.getByRole('button', { name: '업무' }))
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('수정 버튼 클릭 시 인라인 편집 모드로 전환된다', () => {
    renderItem()
    fireEvent.click(screen.getByRole('button', { name: '업무 수정' }))
    expect(screen.getByLabelText('카테고리 이름 편집')).toBeInTheDocument()
  })

  it('인라인 편집에서 저장 시 updateCategory mutate가 호출된다', async () => {
    renderItem()
    fireEvent.click(screen.getByRole('button', { name: '업무 수정' }))
    const input = screen.getByLabelText('카테고리 이름 편집')
    fireEvent.change(input, { target: { value: '업무2' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ id: 1, name: '업무2' }, expect.any(Object)))
  })

  it('삭제 버튼 클릭 시 확인 다이얼로그가 표시된다', () => {
    renderItem()
    fireEvent.click(screen.getByRole('button', { name: '업무 삭제' }))
    expect(screen.getByText(/삭제할까요/)).toBeInTheDocument()
  })

  it('삭제 확인 시 deleteCategory mutate가 호출된다', async () => {
    renderItem()
    fireEvent.click(screen.getByRole('button', { name: '업무 삭제' }))
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(1, expect.any(Object)))
  })
})
