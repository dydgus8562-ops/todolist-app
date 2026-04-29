import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskItem } from '../TaskItem.jsx'
import { TASK_STATUS } from '@/constants/taskStatus.js'

describe('TaskItem', () => {
  const mockTask = {
    id: 1,
    title: '할일 제목',
    description: '할일 설명',
    status: TASK_STATUS.PENDING,
    dueDate: '2026-05-15T00:00:00Z',
    categoryId: 1,
  }

  it('제목을 표시한다', () => {
    render(<TaskItem task={mockTask} />)
    expect(screen.getByText('할일 제목')).toBeTruthy()
  })

  it('설명이 있으면 설명을 표시한다', () => {
    render(<TaskItem task={mockTask} />)
    expect(screen.getByText('할일 설명')).toBeTruthy()
  })

  it('COMPLETED 상태일 때 취소선을 표시한다', () => {
    const completedTask = { ...mockTask, status: TASK_STATUS.COMPLETED }
    render(<TaskItem task={completedTask} />)
    const title = screen.getByText('할일 제목')
    expect(title.className).toContain('line-through')
  })

  it('OVERDUE 상태일 때 경고 이모지를 표시한다', () => {
    const overdueTask = {
      ...mockTask,
      status: TASK_STATUS.PENDING,
      dueDate: new Date(Date.now() - 86400000).toISOString(),
    }
    render(<TaskItem task={overdueTask} />)
    expect(screen.getByText('🚨')).toBeTruthy()
  })

  it('카테고리 이름을 표시한다', () => {
    render(<TaskItem task={mockTask} categoryName="업무" />)
    expect(screen.getByText('업무')).toBeTruthy()
  })

  it('카테고리 없으면 "미분류"를 표시한다', () => {
    render(<TaskItem task={mockTask} categoryName={null} />)
    expect(screen.getByText('미분류')).toBeTruthy()
  })

  it('체크박스 토글 시 onComplete 또는 onUncomplete를 호출한다', () => {
    const onComplete = vi.fn()
    const onUncomplete = vi.fn()
    const { container } = render(
      <TaskItem task={mockTask} onComplete={onComplete} onUncomplete={onUncomplete} />
    )
    const checkbox = container.querySelector('input[type="checkbox"]')
    fireEvent.click(checkbox)
    expect(onComplete).toHaveBeenCalledWith(1)
  })

  it('수정 버튼 클릭 시 onEdit를 호출한다', () => {
    const onEdit = vi.fn()
    render(<TaskItem task={mockTask} onEdit={onEdit} />)
    fireEvent.click(screen.getByText('수정'))
    expect(onEdit).toHaveBeenCalledWith(mockTask)
  })

  it('삭제 버튼 클릭 시 onDelete를 호출한다', () => {
    const onDelete = vi.fn()
    render(<TaskItem task={mockTask} onDelete={onDelete} />)
    fireEvent.click(screen.getByText('삭제'))
    expect(onDelete).toHaveBeenCalledWith(1)
  })
})