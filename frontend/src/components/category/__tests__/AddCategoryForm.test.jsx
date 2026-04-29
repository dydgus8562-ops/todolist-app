import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockCreateMutate = vi.fn()
vi.mock('@/hooks/useCategories.js', () => ({
  useCreateCategory: () => ({ mutate: mockCreateMutate, isPending: false }),
  useGetCategories: vi.fn(),
  useUpdateCategory: vi.fn(),
  useDeleteCategory: vi.fn(),
}))

import { AddCategoryForm } from '../AddCategoryForm.jsx'

function renderForm() {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}><AddCategoryForm /></QueryClientProvider>)
}

describe('AddCategoryForm', () => {
  beforeEach(() => mockCreateMutate.mockClear())

  it('입력창과 추가 버튼이 렌더링된다', () => {
    renderForm()
    expect(screen.getByLabelText('새 카테고리 이름')).toBeInTheDocument()
    expect(screen.getByLabelText('카테고리 추가')).toBeInTheDocument()
  })

  it('이름 없이 제출 시 에러가 표시된다', async () => {
    renderForm()
    fireEvent.click(screen.getByLabelText('카테고리 추가'))
    await waitFor(() => expect(screen.getByText('카테고리 이름을 입력해주세요.')).toBeInTheDocument())
  })

  it('이름 입력 후 제출 시 createCategory mutate가 호출된다', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('새 카테고리 이름'), { target: { value: '업무' } })
    fireEvent.click(screen.getByLabelText('카테고리 추가'))
    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalledWith('업무', expect.any(Object)))
  })

  it('엔터키로도 제출된다', async () => {
    renderForm()
    const input = screen.getByLabelText('새 카테고리 이름')
    fireEvent.change(input, { target: { value: '개인' } })
    fireEvent.submit(input.closest('form'))
    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalledWith('개인', expect.any(Object)))
  })
})
