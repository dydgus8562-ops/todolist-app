import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore.js'
import { PrivateRoute } from '../PrivateRoute.jsx'

function renderWithRouter(initialPath, isAuthenticated) {
  useAuthStore.setState({ token: isAuthenticated ? 'jwt' : null, isAuthenticated, user: null })

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>로그인 페이지</div>} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <div>보호된 컨텐츠</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PrivateRoute', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false })
  })

  it('비인증 상태에서 / 접근 시 /login으로 리다이렉트된다', () => {
    renderWithRouter('/', false)
    expect(screen.getByText('로그인 페이지')).toBeInTheDocument()
    expect(screen.queryByText('보호된 컨텐츠')).not.toBeInTheDocument()
  })

  it('인증 상태에서 / 접근 시 보호된 컨텐츠가 렌더링된다', () => {
    renderWithRouter('/', true)
    expect(screen.getByText('보호된 컨텐츠')).toBeInTheDocument()
    expect(screen.queryByText('로그인 페이지')).not.toBeInTheDocument()
  })
})
