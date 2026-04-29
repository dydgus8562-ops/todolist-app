import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore.js'
import { Header } from '../Header.jsx'

const mockLogout = vi.fn()
vi.mock('@/hooks/useAuth.js', () => ({
  useLogout: () => mockLogout,
  useLogin: vi.fn(),
  useRegister: vi.fn(),
  useMe: vi.fn(),
}))

function renderHeader(user = null, onMenuToggle = vi.fn()) {
  useAuthStore.setState({ user, isAuthenticated: !!user, token: user ? 'jwt' : null })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Header onMenuToggle={onMenuToggle} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Header', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    localStorage.clear()
    useAuthStore.setState({ user: null, isAuthenticated: false, token: null })
  })

  it('앱 이름 "TodoList"가 렌더링된다', () => {
    renderHeader()
    expect(screen.getByText('TodoList')).toBeInTheDocument()
  })

  it('로그아웃 버튼이 렌더링된다', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument()
  })

  it('사용자 이메일이 있으면 표시된다', () => {
    renderHeader({ id: 1, email: 'test@example.com' })
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('로그아웃 버튼 클릭 시 logout 함수가 호출된다', () => {
    renderHeader()
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))
    expect(mockLogout).toHaveBeenCalledOnce()
  })

  it('햄버거 메뉴 버튼 클릭 시 onMenuToggle이 호출된다', () => {
    const onMenuToggle = vi.fn()
    renderHeader(null, onMenuToggle)
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))
    expect(onMenuToggle).toHaveBeenCalledOnce()
  })
})
