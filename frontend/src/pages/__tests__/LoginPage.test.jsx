import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore.js'
import { LoginPage } from '../LoginPage.jsx'

// useLogin 훅 모킹
const mockMutate = vi.fn()
vi.mock('@/hooks/useAuth.js', () => ({
  useLogin: () => ({
    mutate: mockMutate,
    isPending: false,
    error: null,
  }),
  useRegister: vi.fn(),
  useMe: vi.fn(),
  useLogout: vi.fn(),
}))

function renderLoginPage(initialPath = '/login') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false })
    mockMutate.mockClear()
  })

  it('이메일과 비밀번호 입력 필드가 렌더링된다', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/이메일/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/비밀번호/i)).toBeInTheDocument()
  })

  it('로그인 버튼이 존재한다', () => {
    renderLoginPage()
    expect(screen.getByRole('button', { name: /로그인/i })).toBeInTheDocument()
  })

  it('회원가입 링크가 존재한다', () => {
    renderLoginPage()
    expect(screen.getByRole('link', { name: /회원가입으로 이동/i })).toBeInTheDocument()
  })

  describe('클라이언트 유효성 검사', () => {
    it('이메일 없이 제출 시 에러 메시지가 표시된다', async () => {
      renderLoginPage()
      fireEvent.click(screen.getByRole('button', { name: /로그인/i }))
      await waitFor(() => {
        expect(screen.getByText('이메일을 입력해주세요.')).toBeInTheDocument()
      })
    })

    it('잘못된 이메일 형식 시 에러 메시지가 표시된다', async () => {
      renderLoginPage()
      fireEvent.change(screen.getByLabelText(/이메일/i), { target: { value: 'notanemail' } })
      fireEvent.click(screen.getByRole('button', { name: /로그인/i }))
      await waitFor(() => {
        expect(screen.getByText('올바른 이메일 형식을 입력해주세요.')).toBeInTheDocument()
      })
    })

    it('비밀번호 7자 이하 시 에러 메시지가 표시된다', async () => {
      renderLoginPage()
      fireEvent.change(screen.getByLabelText(/이메일/i), { target: { value: 'user@example.com' } })
      fireEvent.change(screen.getByLabelText(/비밀번호/i), { target: { value: 'short' } })
      fireEvent.click(screen.getByRole('button', { name: /로그인/i }))
      await waitFor(() => {
        expect(screen.getByText('비밀번호는 최소 8자 이상이어야 합니다.')).toBeInTheDocument()
      })
    })

    it('유효한 입력 시 login mutate가 호출된다', async () => {
      renderLoginPage()
      fireEvent.change(screen.getByLabelText(/이메일/i), { target: { value: 'user@example.com' } })
      fireEvent.change(screen.getByLabelText(/비밀번호/i), { target: { value: 'Test1234!' } })
      fireEvent.click(screen.getByRole('button', { name: /로그인/i }))
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({ email: 'user@example.com', password: 'Test1234!' })
      })
    })
  })

  it('이미 로그인 상태에서 접근 시 / 로 리다이렉트된다', () => {
    useAuthStore.setState({ token: 'jwt', isAuthenticated: true, user: { id: 1 } })
    renderLoginPage()
    // Navigate 컴포넌트가 렌더링되므로 로그인 폼이 없어야 함
    expect(screen.queryByRole('button', { name: /로그인/i })).not.toBeInTheDocument()
  })
})
