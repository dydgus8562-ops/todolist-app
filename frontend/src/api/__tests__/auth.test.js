import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import api from '../index.js'
import { registerUser, loginUser, logoutUser, getMe } from '../auth.js'

describe('Auth API', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(api)
    localStorage.clear()
  })

  afterEach(() => {
    mock.restore()
  })

  describe('registerUser', () => {
    it('회원가입 성공 시 응답 data를 반환한다', async () => {
      const mockResponse = { success: true, data: { id: 1, email: 'test@example.com' } }
      mock.onPost('/auth/register').reply(201, mockResponse)

      const result = await registerUser('test@example.com', 'Test1234!')
      expect(result).toEqual(mockResponse)
    })

    it('이메일과 비밀번호를 body에 담아 요청한다', async () => {
      mock.onPost('/auth/register').reply(201, { success: true, data: {} })

      await registerUser('user@example.com', 'Pass1234!')
      const requestBody = JSON.parse(mock.history.post[0].data)
      expect(requestBody.email).toBe('user@example.com')
      expect(requestBody.password).toBe('Pass1234!')
    })
  })

  describe('loginUser', () => {
    it('로그인 성공 시 token과 user를 포함한 data를 반환한다', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'jwt-token-here',
          user: { id: 1, email: 'test@example.com' }
        }
      }
      mock.onPost('/auth/login').reply(200, mockResponse)

      const result = await loginUser('test@example.com', 'Test1234!')
      expect(result.data.token).toBe('jwt-token-here')
      expect(result.data.user.email).toBe('test@example.com')
    })
  })

  describe('logoutUser', () => {
    it('POST /auth/logout을 호출한다', async () => {
      mock.onPost('/auth/logout').reply(200, { success: true, data: null })

      await logoutUser()
      expect(mock.history.post[0].url).toBe('/auth/logout')
    })
  })

  describe('getMe', () => {
    it('GET /auth/me을 호출하고 data를 반환한다', async () => {
      const mockResponse = { success: true, data: { id: 1, email: 'me@example.com' } }
      mock.onGet('/auth/me').reply(200, mockResponse)

      const result = await getMe()
      expect(result).toEqual(mockResponse)
    })
  })
})
