import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/hooks/useCategories.js', () => ({
  useGetCategories: vi.fn(),
  useCreateCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteCategory: () => ({ mutate: vi.fn(), isPending: false }),
}))

import { useGetCategories } from '@/hooks/useCategories.js'
import { CategoryList } from '../CategoryList.jsx'

function renderList(props = {}) {
  const qc = new QueryClient()
  const defaults = { activeCategoryId: null, onCategorySelect: vi.fn() }
  return render(
    <QueryClientProvider client={qc}>
      <CategoryList {...defaults} {...props} />
    </QueryClientProvider>
  )
}

describe('CategoryList', () => {
  it('로딩 중일 때 로딩 메시지를 표시한다', () => {
    useGetCategories.mockReturnValue({ isLoading: true, isError: false, data: undefined })
    renderList()
    expect(screen.getByText('불러오는 중...')).toBeInTheDocument()
  })

  it('에러 시 에러 메시지를 표시한다', () => {
    useGetCategories.mockReturnValue({ isLoading: false, isError: true, data: undefined })
    renderList()
    expect(screen.getByText('불러오기 실패')).toBeInTheDocument()
  })

  it('카테고리 목록을 렌더링한다', () => {
    useGetCategories.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [{ id: 1, name: '업무' }, { id: 2, name: '개인' }],
    })
    renderList()
    expect(screen.getByText('업무')).toBeInTheDocument()
    expect(screen.getByText('개인')).toBeInTheDocument()
  })

  it('카테고리가 없으면 빈 메시지를 표시한다', () => {
    useGetCategories.mockReturnValue({ isLoading: false, isError: false, data: [] })
    renderList()
    expect(screen.getByText('카테고리가 없습니다.')).toBeInTheDocument()
  })

  it('AddCategoryForm이 렌더링된다', () => {
    useGetCategories.mockReturnValue({ isLoading: false, isError: false, data: [] })
    renderList()
    expect(screen.getByLabelText('새 카테고리 이름')).toBeInTheDocument()
  })
})
