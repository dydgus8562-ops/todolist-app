import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteConfirmModal } from '../DeleteConfirmModal.jsx'

describe('DeleteConfirmModal', () => {
  it('열림 상태일 때 삭제 확인 모달을 표시한다', () => {
    render(
      <DeleteConfirmModal isOpen={true} onClose={() => {}} onConfirm={() => {}} />
    )
    expect(screen.getByText('삭제 확인')).toBeTruthy()
    expect(screen.getByText('정말로 삭제하시겠습니까?')).toBeTruthy()
  })

  it('사용자 정의 제목과 메시지를 표시한다', () => {
    render(
      <DeleteConfirmModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="카테고리 삭제"
        message="이 카테고리를 삭제하시겠습니까?"
      />
    )
    expect(screen.getByText('카테고리 삭제')).toBeTruthy()
    expect(screen.getByText('이 카테고리를 삭제하시겠습니까?')).toBeTruthy()
  })

  it('취소 버튼 클릭 시 onClose를 호출한다', () => {
    const onClose = vi.fn()
    render(
      <DeleteConfirmModal isOpen={true} onClose={onClose} onConfirm={() => {}} />
    )
    fireEvent.click(screen.getByText('취소'))
    expect(onClose).toHaveBeenCalled()
  })

  it('삭제 버튼 클릭 시 onConfirm을 호출한다', () => {
    const onConfirm = vi.fn()
    render(
      <DeleteConfirmModal isOpen={true} onClose={() => {}} onConfirm={onConfirm} />
    )
    fireEvent.click(screen.getByText('삭제'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('로딩 상태일 때 버튼이 비활성화된다', () => {
    render(
      <DeleteConfirmModal isOpen={true} onClose={() => {}} onConfirm={() => {}} isLoading={true} />
    )
    expect(screen.getByText('삭제').closest('button')).toBeDisabled()
    expect(screen.getByText('취소').closest('button')).toBeDisabled()
  })
})