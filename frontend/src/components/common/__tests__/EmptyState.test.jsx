import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from '../EmptyState.jsx'

describe('EmptyState', () => {
  it('메시지를 표시한다', () => {
    render(<EmptyState message="데이터가 없습니다" />)
    expect(screen.getByText('데이터가 없습니다')).toBeTruthy()
  })

  it('액션 버튼이 제공되면 버튼을 표시한다', () => {
    const handleAction = vi.fn()
    render(<EmptyState message="데이터가 없습니다" actionLabel="추가" onAction={handleAction} />)
    expect(screen.getByText('추가')).toBeTruthy()
  })

  it('액션 버튼 클릭 시 onAction을 호출한다', () => {
    const handleAction = vi.fn()
    render(<EmptyState message="데이터가 없습니다" actionLabel="추가" onAction={handleAction} />)
    screen.getByText('추가').click()
    expect(handleAction).toHaveBeenCalled()
  })

  it('액션 버튼이 없으면 버튼을 표시하지 않는다', () => {
    render(<EmptyState message="데이터가 없습니다" />)
    expect(screen.queryByRole('button')).not.toBeTruthy()
  })
})