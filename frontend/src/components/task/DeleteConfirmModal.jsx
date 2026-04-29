import { Modal } from '@/components/common/Modal.jsx'
import { Button } from '@/components/common/Button.jsx'

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, title, message, isLoading }) {
  const handleConfirm = () => {
    onConfirm?.()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || '삭제 확인'}>
      <div className="flex flex-col gap-6">
        <p className="text-slate-600">{message || '정말로 삭제하시겠습니까?'}</p>
        
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            취소
          </Button>
          <Button variant="danger" onClick={handleConfirm} isLoading={isLoading}>
            삭제
          </Button>
        </div>
      </div>
    </Modal>
  )
}