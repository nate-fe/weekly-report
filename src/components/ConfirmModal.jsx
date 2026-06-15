export default function ConfirmModal({
  open,
  message,
  confirmLabel = '삭제',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <div className="modal-icon modal-icon-confirm">?</div>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn-modal-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn-modal-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
