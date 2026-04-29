import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/api/tasks.js', () => ({
  getTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  completeTask: vi.fn(),
  uncompleteTask: vi.fn(),
}))

import { getTasks, createTask, updateTask, deleteTask, completeTask, uncompleteTask } from '@/api/tasks.js'
import { useGetTasks, useCreateTask, useUpdateTask, useDeleteTask, useCompleteTask, useUncompleteTask } from '../useTasks.js'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useGetTasks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('필터와 함께 할일 목록을 반환한다', async () => {
    getTasks.mockResolvedValue({ data: [{ id: 1, title: '할일 1', status: 'PENDING' }] })
    const { result } = renderHook(() => useGetTasks({ status: 'PENDING' }), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 1, title: '할일 1', status: 'PENDING' }])
  })

  it('API 실패 시 isError가 true가 된다', async () => {
    getTasks.mockRejectedValue(new Error('Network Error'))
    const { result } = renderHook(() => useGetTasks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateTask', () => {
  beforeEach(() => vi.clearAllMocks())

  it('createTask를 호출하고 캐시를 무효화한다', async () => {
    createTask.mockResolvedValue({ data: { id: 2, title: '새 할일' } })
    getTasks.mockResolvedValue({ data: [] })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>

    const { result } = renderHook(() => useCreateTask(), { wrapper })
    const { act } = await import('@testing-library/react')
    await act(async () => { result.current.mutate({ title: '새 할일' }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(createTask).toHaveBeenCalledWith({ title: '새 할일' })
  })
})

describe('useUpdateTask', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updateTask를 { id, taskData }로 호출한다', async () => {
    updateTask.mockResolvedValue({ data: { id: 1, title: '수정됨' } })
    const { result } = renderHook(() => useUpdateTask(), { wrapper: createWrapper() })
    const { act } = await import('@testing-library/react')
    await act(async () => { result.current.mutate({ id: 1, taskData: { title: '수정됨' } }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updateTask).toHaveBeenCalledWith(1, { title: '수정됨' })
  })
})

describe('useDeleteTask', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deleteTask를 id로 호출한다', async () => {
    deleteTask.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useDeleteTask(), { wrapper: createWrapper() })
    const { act } = await import('@testing-library/react')
    await act(async () => { result.current.mutate(1) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteTask).toHaveBeenCalledWith(1)
  })
})

describe('useCompleteTask', () => {
  beforeEach(() => vi.clearAllMocks())

  it('completeTask를 id로 호출하고 캐시를 무효화한다', async () => {
    completeTask.mockResolvedValue({ data: { id: 1, status: 'COMPLETED' } })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>

    const { result } = renderHook(() => useCompleteTask(), { wrapper })
    const { act } = await import('@testing-library/react')
    await act(async () => { result.current.mutate(1) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(completeTask).toHaveBeenCalledWith(1)
  })
})

describe('useUncompleteTask', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uncompleteTask를 id로 호출하고 캐시를 무효화한다', async () => {
    uncompleteTask.mockResolvedValue({ data: { id: 1, status: 'PENDING' } })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>

    const { result } = renderHook(() => useUncompleteTask(), { wrapper })
    const { act } = await import('@testing-library/react')
    await act(async () => { result.current.mutate(1) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(uncompleteTask).toHaveBeenCalledWith(1)
  })
})