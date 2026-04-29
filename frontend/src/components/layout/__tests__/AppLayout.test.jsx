import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore.js'
import { AppLayout } from '../AppLayout.jsx'

vi.mock('@/hooks/useAuth.js', () => ({
  useLogout: () => vi.fn(),
  useLogin: vi.fn(),
  useRegister: vi.fn(),
  useMe: vi.fn(),
}))

function renderAppLayout(props = {}) {
  useAuthStore.setState({ user: { id: 1, email: 'user@test.com' }, isAuthenticated: true, token: 'jwt' })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const defaults = {
    activeStatus: null,
    onStatusChange: vi.fn(),
    children: <div data-testid="main-content">메인 컨텐츠</div>,
  }
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AppLayout {...defaults} {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AppLayout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('헤더가 렌더링된다', () => {
    renderAppLayout()
    expect(screen.getByText('TodoList')).toBeInTheDocument()
  })

  it('사이드바 상태 필터가 렌더링된다', () => {
    renderAppLayout()
    expect(screen.getByRole('button', { name: '전체' })).toBeInTheDocument()
  })

  it('children이 MainContent 영역에 렌더링된다', () => {
    renderAppLayout()
    expect(screen.getByTestId('main-content')).toBeInTheDocument()
  })

  it('햄버거 버튼 클릭 시 사이드바가 열린다', () => {
    renderAppLayout()
    const hamburger = screen.getByRole('button', { name: '메뉴 열기' })
    fireEvent.click(hamburger)
    // 사이드바가 열리면 닫기 버튼이 보임
    expect(screen.getByRole('button', { name: '메뉴 닫기' })).toBeInTheDocument()
  })
})
