import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/api/categories.js', () => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}))

import { getCategories, createCategory, updateCategory, deleteCategory } from '@/api/categories.js'
import { useGetCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../useCategories.js'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useGetCategories', () => {
  beforeEach(() => vi.clearAllMocks())

  it('카테고리 목록을 반환한다', async () => {
    getCategories.mockResolvedValue({ data: [{ id: 1, name: '업무' }] })
    const { result } = renderHook(() => useGetCategories(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 1, name: '업무' }])
  })

  it('API 실패 시 isError가 true가 된다', async () => {
    getCategories.mockRejectedValue(new Error('Network Error'))
    const { result } = renderHook(() => useGetCategories(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateCategory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('createCategory를 호출하고 캐시를 무효화한다', async () => {
    createCategory.mockResolvedValue({ data: { id: 2, name: '개인' } })
    getCategories.mockResolvedValue({ data: [] })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>

    const { result } = renderHook(() => useCreateCategory(), { wrapper })
    const { act } = await import('@testing-library/react')
    await act(async () => { result.current.mutate('개인') })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(createCategory).toHaveBeenCalledWith('개인')
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('useUpdateCategory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updateCategory를 { id, name }으로 호출한다', async () => {
    updateCategory.mockResolvedValue({ data: { id: 1, name: '수정됨' } })
    const { result } = renderHook(() => useUpdateCategory(), { wrapper: createWrapper() })
    const { act } = await import('@testing-library/react')
    await act(async () => { result.current.mutate({ id: 1, name: '수정됨' }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updateCategory).toHaveBeenCalledWith(1, '수정됨')
  })
})

describe('useDeleteCategory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deleteCategory를 id로 호출한다', async () => {
    deleteCategory.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useDeleteCategory(), { wrapper: createWrapper() })
    const { act } = await import('@testing-library/react')
    await act(async () => { result.current.mutate(1) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteCategory).toHaveBeenCalledWith(1)
  })
})
