import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore.js'

// API 모듈 모킹
vi.mock('@/api/auth.js', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  logoutUser: vi.fn(),
  getMe: vi.fn(),
}))

// react-router-dom navigate 모킹
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import { loginUser, registerUser, getMe } from '@/api/auth.js'
import { useLogin, useRegister, useMe, useLogout } from '../useAuth.js'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
}

describe('useLogin', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false })
    mockNavigate.mockClear()
    vi.clearAllMocks()
  })

  it('로그인 성공 시 authStore.login이 호출된다', async () => {
    loginUser.mockResolvedValue({
      success: true,
      data: { token: 'jwt-token', user: { id: 1, email: 'test@example.com' } },
    })

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ email: 'test@example.com', password: 'Test1234!' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const store = useAuthStore.getState()
    expect(store.token).toBe('jwt-token')
    expect(store.isAuthenticated).toBe(true)
    expect(store.user).toEqual({ id: 1, email: 'test@example.com' })
  })

  it('로그인 성공 시 / 경로로 네비게이트한다', async () => {
    loginUser.mockResolvedValue({
      success: true,
      data: { token: 'jwt-token', user: { id: 1 } },
    })

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ email: 'test@example.com', password: 'Test1234!' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('로그인 실패 시 isError가 true가 된다', async () => {
    loginUser.mockRejectedValue(new Error('Invalid credentials'))

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ email: 'wrong@example.com', password: 'wrong' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useRegister', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    vi.clearAllMocks()
  })

  it('회원가입 성공 시 /login으로 네비게이트한다', async () => {
    registerUser.mockResolvedValue({
      success: true,
      data: { id: 1, email: 'new@example.com' },
    })

    const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ email: 'new@example.com', password: 'Test1234!' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('회원가입 실패 시 isError가 true가 된다', async () => {
    registerUser.mockRejectedValue(new Error('Email already in use'))

    const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() })

    await act(async () => {
      result.current.mutate({ email: 'existing@example.com', password: 'Test1234!' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useMe', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false })
    vi.clearAllMocks()
  })

  it('isAuthenticated가 false이면 쿼리가 실행되지 않는다', () => {
    const { result } = renderHook(() => useMe(), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
    expect(getMe).not.toHaveBeenCalled()
  })

  it('isAuthenticated가 true이면 getMe를 호출한다', async () => {
    useAuthStore.setState({ token: 'jwt-token', isAuthenticated: true })
    getMe.mockResolvedValue({
      success: true,
      data: { id: 1, email: 'me@example.com' },
    })

    const { result } = renderHook(() => useMe(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getMe).toHaveBeenCalled()
  })

  it('getMe 성공 시 authStore.setUser가 호출된다', async () => {
    useAuthStore.setState({ token: 'jwt-token', isAuthenticated: true, user: null })
    getMe.mockResolvedValue({
      success: true,
      data: { id: 1, email: 'me@example.com' },
    })

    const { result } = renderHook(() => useMe(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const store = useAuthStore.getState()
    expect(store.user).toEqual({ id: 1, email: 'me@example.com' })
  })
})

describe('useLogout', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: 'jwt-token', user: { id: 1 }, isAuthenticated: true })
    localStorage.setItem('token', 'jwt-token')
    mockNavigate.mockClear()
  })

  it('logout 호출 시 authStore가 초기화된다', () => {
    const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() })

    act(() => {
      result.current()
    })

    const store = useAuthStore.getState()
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
  })

  it('logout 호출 시 localStorage에서 토큰이 제거된다', () => {
    const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() })

    act(() => {
      result.current()
    })

    expect(localStorage.getItem('token')).toBeNull()
  })

  it('logout 호출 시 /login으로 네비게이트한다', () => {
    const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() })

    act(() => {
      result.current()
    })

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})
