import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '../Sidebar.jsx'

function renderSidebar(props = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    activeStatus: null,
    onStatusChange: vi.fn(),
    categorySlot: null,
  }
  return render(<Sidebar {...defaults} {...props} />)
}

describe('Sidebar', () => {
  it('상태 필터 4개가 렌더링된다', () => {
    renderSidebar()
    expect(screen.getByRole('button', { name: '전체' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '대기중' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '완료' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '기한 초과' })).toBeInTheDocument()
  })

  it('activeStatus가 null이면 "전체" 버튼이 활성 스타일을 가진다', () => {
    renderSidebar({ activeStatus: null })
    const btn = screen.getByRole('button', { name: '전체' })
    expect(btn.className).toContain('bg-slate-100')
  })

  it('activeStatus가 PENDING이면 "대기중" 버튼이 활성 스타일을 가진다', () => {
    renderSidebar({ activeStatus: 'PENDING' })
    const btn = screen.getByRole('button', { name: '대기중' })
    expect(btn.className).toContain('bg-slate-100')
  })

  it('필터 버튼 클릭 시 onStatusChange가 해당 값으로 호출된다', () => {
    const onStatusChange = vi.fn()
    renderSidebar({ onStatusChange })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))
    expect(onStatusChange).toHaveBeenCalledWith('COMPLETED')
  })

  it('전체 버튼 클릭 시 onStatusChange(null)이 호출된다', () => {
    const onStatusChange = vi.fn()
    renderSidebar({ onStatusChange })
    fireEvent.click(screen.getByRole('button', { name: '전체' }))
    expect(onStatusChange).toHaveBeenCalledWith(null)
  })

  it('오버레이 클릭 시 onClose가 호출된다', () => {
    const onClose = vi.fn()
    renderSidebar({ isOpen: true, onClose })
    // 오버레이(aria-hidden)를 클릭
    const overlay = document.querySelector('[aria-hidden="true"]')
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('닫기 버튼 클릭 시 onClose가 호출된다', () => {
    const onClose = vi.fn()
    renderSidebar({ isOpen: true, onClose })
    fireEvent.click(screen.getByRole('button', { name: '메뉴 닫기' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('categorySlot이 있으면 렌더링된다', () => {
    renderSidebar({ categorySlot: <div data-testid="cat-slot">카테고리 영역</div> })
    expect(screen.getByTestId('cat-slot')).toBeInTheDocument()
  })

  it('isOpen이 false이면 사이드바가 숨겨진다', () => {
    renderSidebar({ isOpen: false })
    const aside = document.querySelector('aside')
    expect(aside.className).toContain('-translate-x-full')
  })
})
