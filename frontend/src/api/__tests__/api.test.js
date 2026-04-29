import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import api from '../index.js'

describe('API 클라이언트 - axios 인스턴스', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(api)
    localStorage.clear()
  })

  afterEach(() => {
    mock.restore()
    vi.restoreAllMocks()
  })

  it('기본 baseURL이 설정되어 있다', () => {
    expect(api.defaults.baseURL).toBeTruthy()
  })

  it('기본 timeout이 설정되어 있다', () => {
    expect(api.defaults.timeout).toBe(10000)
  })

  describe('요청 인터셉터', () => {
    it('localStorage에 토큰이 있을 때 Authorization 헤더가 자동 추가된다', async () => {
      localStorage.setItem('token', 'test-jwt-token')
      mock.onGet('/test').reply(200, { success: true })

      const response = await api.get('/test')
      expect(mock.history.get[0].headers.Authorization).toBe('Bearer test-jwt-token')
    })

    it('localStorage에 토큰이 없을 때 Authorization 헤더가 추가되지 않는다', async () => {
      mock.onGet('/test').reply(200, { success: true })

      await api.get('/test')
      expect(mock.history.get[0].headers.Authorization).toBeUndefined()
    })
  })

  describe('응답 인터셉터', () => {
    it('401 응답 시 localStorage 토큰이 제거된다', async () => {
      localStorage.setItem('token', 'expired-token')
      mock.onGet('/protected').reply(401, { success: false, error: { code: 'TOKEN_EXPIRED' } })

      const assignSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        href: '',
      })

      try {
        await api.get('/protected')
      } catch {
        // 에러 예상
      }

      expect(localStorage.getItem('token')).toBeNull()
      assignSpy.mockRestore()
    })

    it('200 응답은 정상적으로 반환된다', async () => {
      mock.onGet('/data').reply(200, { success: true, data: { id: 1 } })
      const response = await api.get('/data')
      expect(response.data).toEqual({ success: true, data: { id: 1 } })
    })

    it('403 응답은 reject로 전달된다', async () => {
      mock.onGet('/forbidden').reply(403, { success: false, error: { code: 'FORBIDDEN' } })

      await expect(api.get('/forbidden')).rejects.toThrow()
    })
  })
})
