import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore.js'
import { RegisterPage } from '../RegisterPage.jsx'

const mockMutate = vi.fn()
vi.mock('@/hooks/useAuth.js', () => ({
  useRegister: () => ({
    mutate: mockMutate,
    isPending: false,
    error: null,
  }),
  useLogin: vi.fn(),
  useMe: vi.fn(),
  useLogout: vi.fn(),
}))

function renderRegisterPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false })
    mockMutate.mockClear()
  })

  it('이메일, 비밀번호, 비밀번호 확인 필드가 렌더링된다', () => {
    renderRegisterPage()
    expect(screen.getByLabelText(/이메일/i)).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호 *')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호 확인 *')).toBeInTheDocument()
  })

  it('로그인 링크가 존재한다', () => {
    renderRegisterPage()
    expect(screen.getByRole('link', { name: /로그인으로 이동/i })).toBeInTheDocument()
  })

  describe('클라이언트 유효성 검사', () => {
    it('이메일 없이 제출 시 에러가 표시된다', async () => {
      renderRegisterPage()
      fireEvent.click(screen.getByRole('button', { name: /회원가입/i }))
      await waitFor(() => {
        expect(screen.getByText('이메일을 입력해주세요.')).toBeInTheDocument()
      })
    })

    it('비밀번호 복잡도 미달 시 에러가 표시된다', async () => {
      renderRegisterPage()
      fireEvent.change(screen.getByLabelText(/이메일/i), { target: { value: 'user@example.com' } })
      fireEvent.change(screen.getByLabelText('비밀번호 *'), { target: { value: 'simple' } })
      fireEvent.click(screen.getByRole('button', { name: /회원가입/i }))
      await waitFor(() => {
        expect(screen.getByText(/영문, 숫자, 특수문자를 포함/i)).toBeInTheDocument()
      })
    })

    it('비밀번호 불일치 시 에러가 표시된다', async () => {
      renderRegisterPage()
      fireEvent.change(screen.getByLabelText(/이메일/i), { target: { value: 'user@example.com' } })
      fireEvent.change(screen.getByLabelText('비밀번호 *'), { target: { value: 'Test1234!' } })
      fireEvent.change(screen.getByLabelText('비밀번호 확인 *'), { target: { value: 'Different1!' } })
      fireEvent.click(screen.getByRole('button', { name: /회원가입/i }))
      await waitFor(() => {
        expect(screen.getByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument()
      })
    })

    it('유효한 입력 시 register mutate가 호출된다', async () => {
      renderRegisterPage()
      fireEvent.change(screen.getByLabelText(/이메일/i), { target: { value: 'new@example.com' } })
      fireEvent.change(screen.getByLabelText('비밀번호 *'), { target: { value: 'Test1234!' } })
      fireEvent.change(screen.getByLabelText('비밀번호 확인 *'), { target: { value: 'Test1234!' } })
      fireEvent.click(screen.getByRole('button', { name: /회원가입/i }))
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({ email: 'new@example.com', password: 'Test1234!' })
      })
    })
  })

  it('이미 로그인 상태에서 접근 시 폼이 렌더링되지 않는다', () => {
    useAuthStore.setState({ token: 'jwt', isAuthenticated: true, user: { id: 1 } })
    renderRegisterPage()
    expect(screen.queryByRole('button', { name: /회원가입/i })).not.toBeInTheDocument()
  })
})
