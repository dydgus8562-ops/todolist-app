import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore.js'
import App from './App.jsx'

// 페이지 컴포넌트 모킹 (단순 마커로 렌더링 여부만 확인)
vi.mock('@/pages/LoginPage.jsx', () => ({
  LoginPage: () => <div data-testid="login-page">Login Page</div>,
}))
vi.mock('@/pages/RegisterPage.jsx', () => ({
  RegisterPage: () => <div data-testid="register-page">Register Page</div>,
}))
vi.mock('@/pages/TasksPage.jsx', () => ({
  TasksPage: () => <div data-testid="tasks-page">Tasks Page</div>,
}))

function renderApp(initialPath, isAuthenticated = false) {
  useAuthStore.setState({
    token: isAuthenticated ? 'jwt-token' : null,
    isAuthenticated,
    user: null,
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('App 라우팅', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false })
  })

  it('/login 경로에서 LoginPage가 렌더링된다', () => {
    renderApp('/login')
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('/register 경로에서 RegisterPage가 렌더링된다', () => {
    renderApp('/register')
    expect(screen.getByTestId('register-page')).toBeInTheDocument()
  })

  it('비인증 상태에서 / 접근 시 /login으로 리다이렉트된다', () => {
    renderApp('/', false)
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.queryByTestId('tasks-page')).not.toBeInTheDocument()
  })

  it('인증 상태에서 / 접근 시 TasksPage가 렌더링된다', () => {
    renderApp('/', true)
    expect(screen.getByTestId('tasks-page')).toBeInTheDocument()
  })

  it('존재하지 않는 경로 접근 시 /로 리다이렉트된다 (비인증이면 /login까지)', () => {
    renderApp('/nonexistent', false)
    // /* → Navigate to / → PrivateRoute → Navigate to /login
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('존재하지 않는 경로 접근 시 인증 상태면 TasksPage가 보인다', () => {
    renderApp('/nonexistent', true)
    expect(screen.getByTestId('tasks-page')).toBeInTheDocument()
  })
})
