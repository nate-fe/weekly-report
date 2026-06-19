import { useState, useEffect } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import AlertModal from '../components/AlertModal'
import IdeaBoardFormModal from '../components/IdeaBoardFormModal'
import EditIcon from '../components/icons/EditIcon'
import TrashIcon from '../components/icons/TrashIcon'
import {
  fetchIdeas,
  insertIdea,
  updateIdea,
  deleteIdea,
  checkIdeaBoardSchema,
  ideaBoardSchemaMigrationMessages,
  canEditIdea,
  noteColor,
} from '../utils/ideaBoard'
import { useTeamAccess } from '../context/TeamAccessContext'

function formatNoteDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function IdeaBoard() {
  const { employeeId } = useTeamAccess()
  const [loading, setLoading] = useState(true)
  const [ideas, setIdeas] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [alert, setAlert] = useState(null)

  const showToast = (msg, isErr = false) => {
    setToast({ msg, err: isErr })
    setTimeout(() => setToast(''), 3000)
  }

  const loadIdeas = async () => {
    try {
      const rows = await fetchIdeas()
      setIdeas(rows)
    } catch (e) {
      if (e.message === 'SCHEMA') {
        setAlert({
          title: 'DB 업데이트가 필요합니다',
          messages: ideaBoardSchemaMigrationMessages(),
        })
      } else {
        showToast('아이디어 불러오기 실패: ' + e.message, true)
      }
    }
  }

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const ok = await checkIdeaBoardSchema()
        if (!ok && !cancelled) {
          setAlert({
            title: 'DB 업데이트가 필요합니다',
            messages: ideaBoardSchemaMigrationMessages(),
          })
        }
        if (!cancelled) await loadIdeas()
      } catch {
        if (!cancelled) showToast('아이디어 불러오기 실패', true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  const openAdd = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const openEdit = (idea) => {
    setEditTarget(idea)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditTarget(null)
  }

  const handleSave = async (content) => {
    if (!employeeId) return
    setSaving(true)
    try {
      if (editTarget) {
        const updated = await updateIdea(employeeId, { ...editTarget, content })
        setIdeas(prev => prev.map(item => (item.id === updated.id ? updated : item)))
        showToast('수정되었습니다')
      } else {
        const created = await insertIdea(employeeId, { content })
        setIdeas(prev => [created, ...prev])
        showToast('등록되었습니다')
      }
      closeForm()
    } catch (e) {
      if (e.message === 'SCHEMA') {
        setAlert({
          title: 'DB 업데이트가 필요합니다',
          messages: ideaBoardSchemaMigrationMessages(),
        })
      } else {
        showToast(e.message || '저장 실패', true)
      }
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget || !employeeId) return
    const targetId = deleteTarget.id
    const prev = ideas
    setIdeas(items => items.filter(item => item.id !== targetId))
    setDeleteTarget(null)

    try {
      await deleteIdea(employeeId, targetId)
      showToast('삭제되었습니다')
    } catch (e) {
      setIdeas(prev)
      if (e.message === 'SCHEMA') {
        setAlert({
          title: 'DB 업데이트가 필요합니다',
          messages: ideaBoardSchemaMigrationMessages(),
        })
      } else {
        showToast(e.message || '삭제 실패', true)
      }
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>아이디어 게시판을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="idea-board-page">
      <div className="idea-board-header">
        <div>
          <h2 className="idea-board-title">아이디어 게시판</h2>
          <p className="idea-board-desc">
            익명으로 아이디어를 남기고 팀과 공유해 보세요. 수정·삭제는 본인이 작성한 글만 가능합니다.
          </p>
        </div>
        <button type="button" className="btn-primary-sm idea-board-add-btn" onClick={openAdd}>
          + 아이디어 남기기
        </button>
      </div>

      {ideas.length === 0 ? (
        <div className="idea-board-empty">
          <p>아직 남겨진 아이디어가 없습니다.</p>
        </div>
      ) : (
        <div className="idea-board-grid">
          {ideas.map((idea, index) => {
            const editable = canEditIdea(idea, employeeId)
            const bg = noteColor(idea.id, idea.colorIndex)
            const tilt = ((index % 5) - 2) * 0.6

            return (
              <article
                key={idea.id}
                className="idea-board-note"
                style={{
                  '--note-bg': bg,
                  '--note-tilt': `${tilt}deg`,
                }}
              >
                <div className="idea-board-note-pin" aria-hidden="true" />
                <div className="idea-board-note-body">
                  <p className="idea-board-note-content">{idea.content}</p>
                </div>
                <footer className="idea-board-note-foot">
                  <time className="idea-board-note-date" dateTime={idea.updatedAt}>
                    {formatNoteDate(idea.updatedAt)}
                  </time>
                  {editable && (
                    <div className="idea-board-note-actions">
                      <button
                        type="button"
                        className="idea-board-note-action"
                        onClick={() => openEdit(idea)}
                        aria-label="아이디어 수정"
                        title="수정"
                      >
                        <EditIcon size={15} />
                      </button>
                      <button
                        type="button"
                        className="idea-board-note-action idea-board-note-action-danger"
                        onClick={() => setDeleteTarget(idea)}
                        aria-label="아이디어 삭제"
                        title="삭제"
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  )}
                </footer>
              </article>
            )
          })}
        </div>
      )}

      <IdeaBoardFormModal
        open={formOpen}
        idea={editTarget}
        onClose={closeForm}
        onSave={handleSave}
        saving={saving}
      />

      <ConfirmModal
        open={!!deleteTarget}
        message="이 아이디어를 삭제할까요?"
        confirmLabel="삭제"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <AlertModal
        open={!!alert}
        title={alert?.title}
        messages={alert?.messages ?? []}
        onClose={() => setAlert(null)}
      />

      {toast && (
        <div className={`toast show ${toast.err ? 'toast-error' : ''}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
