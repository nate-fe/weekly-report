export default function AlertModal({ open, title, messages, onClose }) {
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <div className="modal-icon">!</div>
        <div className="modal-title">{title}</div>
        <ul className="modal-messages">
          {messages.map((msg, i) => <li key={i}>{msg}</li>)}
        </ul>
        <button type="button" className="btn-modal-ok" onClick={onClose}>확인</button>
      </div>
    </div>
  )
}
