import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskFormModal } from '../TaskFormModal.jsx'

describe('TaskFormModal', () => {
  const mockCategories = [
    { id: 1, name: '업무' },
    { id: 2, name: '개인' },
  ]

  it('열림 상태일 때 할일 추가 모달을 표시한다', () => {
    render(
      <TaskFormModal isOpen={true} onClose={() => {}} categories={mockCategories} onSubmit={() => {}} />
    )
    expect(screen.getByText('새 할일 추가')).toBeTruthy()
  })

  it('수정 모드일 때 제목이 "할일 수정"이다', () => {
    const mockTask = { id: 1, title: '기존 할일' }
    render(
      <TaskFormModal isOpen={true} onClose={() => {}} task={mockTask} categories={mockCategories} onSubmit={() => {}} />
    )
    expect(screen.getByText('할일 수정')).toBeTruthy()
  })

  it('task가 제공되면 기존 값으로 폼이 채워진다', () => {
    const mockTask = { id: 1, title: '기존 할일', description: '설명' }
    render(
      <TaskFormModal isOpen={true} onClose={() => {}} task={mockTask} categories={mockCategories} onSubmit={() => {}} />
    )
    expect(screen.getByDisplayValue('기존 할일')).toBeTruthy()
    expect(screen.getByDisplayValue('설명')).toBeTruthy()
  })

  it('제목이 빈 값이면 에러 메시지가 표시된다', async () => {
    render(
      <TaskFormModal isOpen={true} onClose={() => {}} categories={mockCategories} onSubmit={() => {}} />
    )
    const submitButton = screen.getByText('생성하기')
    await fireEvent.click(submitButton)
    expect(screen.getByText('제목을 입력해주세요')).toBeTruthy()
  })

  it('onSubmit이 올바른 데이터와 함께 호출된다', async () => {
    const onSubmit = vi.fn()
    render(
      <TaskFormModal isOpen={true} onClose={() => {}} categories={mockCategories} onSubmit={onSubmit} />
    )
    const titleInput = screen.getByPlaceholderText('할일 제목을 입력하세요')
    await fireEvent.change(titleInput, { target: { value: '새 할일' } })
    const submitButton = screen.getByText('생성하기')
    await fireEvent.click(submitButton)
    expect(onSubmit).toHaveBeenCalledWith({
      title: '새 할일',
      description: null,
      categoryId: null,
      dueDate: null,
    })
  })

  it('카테고리 Select가 렌더링된다', () => {
    render(
      <TaskFormModal isOpen={true} onClose={() => {}} categories={mockCategories} onSubmit={() => {}} />
    )
    expect(screen.getByRole('combobox')).toBeTruthy()
  })
})