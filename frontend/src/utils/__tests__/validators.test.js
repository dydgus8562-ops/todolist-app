import { describe, it, expect } from 'vitest'
import { isValidEmail, isValidPassword } from '../validators.js'

describe('isValidEmail', () => {
  it('올바른 이메일을 유효하다고 판단한다', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('test.user+tag@sub.domain.com')).toBe(true)
  })

  it('잘못된 이메일을 무효하다고 판단한다', () => {
    expect(isValidEmail('notanemail')).toBe(false)
    expect(isValidEmail('missing@tld')).toBe(false)
    expect(isValidEmail('@nodomain.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

describe('isValidPassword', () => {
  it('영문+숫자+특수문자 8자 이상을 유효하다고 판단한다', () => {
    expect(isValidPassword('Test1234!')).toBe(true)
    expect(isValidPassword('Abc123@xyz')).toBe(true)
  })

  it('7자 이하는 무효하다', () => {
    expect(isValidPassword('Ab1@xyz')).toBe(false)
  })

  it('특수문자 없는 비밀번호는 무효하다', () => {
    expect(isValidPassword('Abcdef123')).toBe(false)
  })

  it('숫자 없는 비밀번호는 무효하다', () => {
    expect(isValidPassword('Abcdef!@#')).toBe(false)
  })

  it('영문 없는 비밀번호는 무효하다', () => {
    expect(isValidPassword('12345678!')).toBe(false)
  })

  it('빈 문자열은 무효하다', () => {
    expect(isValidPassword('')).toBe(false)
  })
})
