import { describe, it, expect } from 'vitest'
import { formatDate, isOverdue } from '../dateUtils.js'

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('유효한 날짜 문자열을 한국어 날짜 형식으로 변환한다', () => {
      const result = formatDate('2026-05-15')
      expect(result).toBe('2026. 05. 15.')
    })

    it('null 또는 undefined 입력 시 null을 반환한다', () => {
      expect(formatDate(null)).toBeNull()
      expect(formatDate(undefined)).toBeNull()
    })
  })

  describe('isOverdue', () => {
    it('현재보다 지난 날짜는 true를 반환한다', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString()
      expect(isOverdue(pastDate)).toBe(true)
    })

    it('현재보다 미래 날짜는 false를 반환한다', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString()
      expect(isOverdue(futureDate)).toBe(false)
    })

    it('null 또는 undefined 입력 시 false를 반환한다', () => {
      expect(isOverdue(null)).toBe(false)
      expect(isOverdue(undefined)).toBe(false)
    })
  })
})