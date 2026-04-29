import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '../Badge.jsx'
import { TASK_STATUS } from '@/constants/taskStatus.js'

describe('Badge', () => {
  it('PENDING 상태일 때 "대기중" 레이블을 표시한다', () => {
    render(<Badge status={TASK_STATUS.PENDING} />)
    expect(screen.getByText('대기중')).toBeTruthy()
  })

  it('COMPLETED 상태일 때 "완료" 레이블을 표시한다', () => {
    render(<Badge status={TASK_STATUS.COMPLETED} />)
    expect(screen.getByText('완료')).toBeTruthy()
  })

  it('OVERDUE 상태일 때 "기한 초과" 레이블을 표시한다', () => {
    render(<Badge status={TASK_STATUS.OVERDUE} />)
    expect(screen.getByText('기한 초과')).toBeTruthy()
  })

  it('알 수 없는 상태일 때 기본값으로 "대기중"을 표시한다', () => {
    render(<Badge status="UNKNOWN" />)
    expect(screen.getByText('대기중')).toBeTruthy()
  })
})