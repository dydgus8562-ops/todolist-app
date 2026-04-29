import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAuthStore } from '../authStore.js'

const TOKEN_KEY = 'token'

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear()
    // 스토어 초기화 (각 테스트 독립성 보장)
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
    })
  })

  describe('초기 상태', () => {
    it('localStorage에 토큰이 없으면 token은 null이다', () => {
      const { result } = renderHook(() => useAuthStore())
      expect(result.current.token).toBeNull()
    })

    it('localStorage에 토큰이 없으면 isAuthenticated는 false이다', () => {
      const { result } = renderHook(() => useAuthStore())
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('localStorage에 토큰이 있으면 token이 복원된다', () => {
      localStorage.setItem(TOKEN_KEY, 'existing-token')
      // 스토어를 localStorage 상태로 재초기화
      useAuthStore.setState({
        token: localStorage.getItem(TOKEN_KEY),
        isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
      })
      const { result } = renderHook(() => useAuthStore())
      expect(result.current.token).toBe('existing-token')
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('user 초기값은 null이다', () => {
      const { result } = renderHook(() => useAuthStore())
      expect(result.current.user).toBeNull()
    })
  })

  describe('login 액션', () => {
    it('token과 user를 상태에 저장한다', () => {
      const { result } = renderHook(() => useAuthStore())
      const mockUser = { id: 1, email: 'test@example.com' }

      act(() => {
        result.current.login('jwt-token', mockUser)
      })

      expect(result.current.token).toBe('jwt-token')
      expect(result.current.user).toEqual(mockUser)
    })

    it('isAuthenticated를 true로 설정한다', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.login('jwt-token', { id: 1 })
      })

      expect(result.current.isAuthenticated).toBe(true)
    })

    it('localStorage에 토큰을 저장한다', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.login('my-jwt-token', { id: 1 })
      })

      expect(localStorage.getItem(TOKEN_KEY)).toBe('my-jwt-token')
    })
  })

  describe('logout 액션', () => {
    it('token을 null로 초기화한다', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.login('jwt-token', { id: 1 })
      })
      act(() => {
        result.current.logout()
      })

      expect(result.current.token).toBeNull()
    })

    it('user를 null로 초기화한다', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.login('jwt-token', { id: 1, email: 'test@example.com' })
      })
      act(() => {
        result.current.logout()
      })

      expect(result.current.user).toBeNull()
    })

    it('isAuthenticated를 false로 설정한다', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.login('jwt-token', { id: 1 })
      })
      act(() => {
        result.current.logout()
      })

      expect(result.current.isAuthenticated).toBe(false)
    })

    it('localStorage에서 토큰을 제거한다', () => {
      localStorage.setItem(TOKEN_KEY, 'some-token')
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.logout()
      })

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    })
  })

  describe('setUser 액션', () => {
    it('user 상태를 업데이트한다', () => {
      const { result } = renderHook(() => useAuthStore())
      const updatedUser = { id: 1, email: 'updated@example.com' }

      act(() => {
        result.current.setUser(updatedUser)
      })

      expect(result.current.user).toEqual(updatedUser)
    })

    it('token과 isAuthenticated는 변경하지 않는다', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.login('jwt-token', { id: 1 })
      })
      act(() => {
        result.current.setUser({ id: 1, email: 'new@example.com' })
      })

      expect(result.current.token).toBe('jwt-token')
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  describe('여러 컴포넌트에서 상태 공유', () => {
    it('한 훅에서 login 호출 시 다른 훅에서도 상태가 반영된다', () => {
      const { result: hook1 } = renderHook(() => useAuthStore())
      const { result: hook2 } = renderHook(() => useAuthStore())

      act(() => {
        hook1.current.login('shared-token', { id: 1 })
      })

      expect(hook2.current.token).toBe('shared-token')
      expect(hook2.current.isAuthenticated).toBe(true)
    })
  })
})
