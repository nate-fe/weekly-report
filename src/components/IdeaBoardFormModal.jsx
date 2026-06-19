import { useEffect, useState } from 'react'
import { useDraggable } from '../hooks/useDraggable'
import { IDEA_CONTENT_MAX_LENGTH, ideaContentValidationError } from '../utils/ideaBoard'

export default function IdeaBoardFormModal({
  open,
  idea = null,
  onClose,
  onSave,
  saving = false,
}) {
  const isEdit = !!idea
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const { offset, onDragStart } = useDraggable(open ? (idea?.id || 'add') : null)

  useEffect(() => {
    if (!open) return
    setContent(idea?.content || '')
    setError('')
  }, [open, idea])

  if (!open) return null

  const handleClose = () => {
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = content.trim()
    const validationError = ideaContentValidationError(trimmed)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    await onSave(trimmed)
  }

  const charCount = content.length
  const nearLimit = charCount >= IDEA_CONTENT_MAX_LENGTH - 20

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="idea-board-form-modal idea-board-form-modal-draggable"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="idea-board-form-title"
      >
        <div className="idea-board-form-head" onMouseDown={onDragStart}>
          <h3 id="idea-board-form-title" className="idea-board-form-title">
            {isEdit ? '아이디어 수정' : '아이디어 남기기'}
          </h3>
          <p className="idea-board-form-desc">
            익명으로 등록됩니다. 본인이 작성한 글만 수정·삭제할 수 있습니다. 400자 이하로 작성해 주세요.
          </p>
        </div>

        <form className="idea-board-form" onSubmit={handleSubmit}>
          <label className="idea-board-form-field">
            <span className="field-label">내용</span>
            <textarea
              className="idea-board-form-textarea"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="아이디어, 제안, 메모를 자유롭게 적어 주세요..."
              rows={8}
              maxLength={IDEA_CONTENT_MAX_LENGTH}
              autoFocus
            />
            <span
              className={`idea-board-form-count${nearLimit ? ' idea-board-form-count-warn' : ''}`}
              aria-live="polite"
            >
              {charCount}/{IDEA_CONTENT_MAX_LENGTH}
            </span>
          </label>

          {error && <p className="idea-board-form-error">{error}</p>}

          <div className="idea-board-form-actions">
            <button type="button" className="btn-modal-cancel" onClick={handleClose}>
              취소
            </button>
            <button type="submit" className="btn-primary-md" disabled={saving}>
              {saving ? '저장 중...' : isEdit ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
