import { useState, useEffect, useMemo } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import AlertModal from '../components/AlertModal'
import MemoRichEditor from '../components/MemoRichEditor'
import {
  fetchPersonalMemoPages,
  savePersonalMemoPages,
  deleteAllPersonalMemoPages,
  checkPersonalMemoSchema,
  personalMemoSchemaMigrationMessages,
  createMemoPage,
} from '../utils/personalMemo'
import { useTeamAccess } from '../context/TeamAccessContext'
import { findMemberByEmployeeId } from '../utils/teamAccess'

export default function PersonalMemo() {
  const { employeeId, members } = useTeamAccess()
  const member = findMemberByEmployeeId(members, employeeId)

  const [loading, setLoading] = useState(true)
  const [pages, setPages] = useState([])
  const [activePageId, setActivePageId] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [alert, setAlert] = useState(null)
  const [deletePageTarget, setDeletePageTarget] = useState(null)

  const activePage = useMemo(
    () => pages.find(p => p.id === activePageId) ?? null,
    [pages, activePageId],
  )

  const showToast = (msg, isErr = false) => {
    setToast({ msg, err: isErr })
    setTimeout(() => setToast(''), 3000)
  }

  const loadPages = async () => {
    if (!employeeId) return
    try {
      const data = await fetchPersonalMemoPages(employeeId)
      setPages(data.pages)
      setSavedAt(data.updatedAt)
      setDirty(false)
      setActivePageId(prev => {
        if (prev && data.pages.some(p => p.id === prev)) return prev
        return data.pages[0]?.id ?? null
      })
    } catch (e) {
      if (e.message === 'SCHEMA') {
        setAlert({
          title: 'DB 업데이트가 필요합니다',
          messages: personalMemoSchemaMigrationMessages(),
        })
      } else {
        showToast('메모 불러오기 실패: ' + e.message, true)
      }
    }
  }

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const ok = await checkPersonalMemoSchema()
        if (!ok && !cancelled) {
          setAlert({
            title: 'DB 업데이트가 필요합니다',
            messages: personalMemoSchemaMigrationMessages(),
          })
        }
        if (!cancelled) await loadPages()
      } catch {
        if (!cancelled) showToast('메모 불러오기 실패', true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [employeeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateActivePage = (patch) => {
    if (!activePageId) return
    setPages(prev => prev.map(p => (
      p.id === activePageId ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
    )))
    setDirty(true)
  }

  const handleAddPage = () => {
    const page = createMemoPage()
    setPages(prev => [...prev, page])
    setActivePageId(page.id)
    setDirty(true)
  }

  const titleActions = (
    <div className="memo-page-title-actions">
      {savedAt && (
        <span className="memo-saved-at">
          마지막 저장 · {new Date(savedAt).toLocaleString('ko-KR')}
        </span>
      )}
      <button
        type="button"
        className="btn-primary-sm"
        onClick={handleSave}
        disabled={busy || !dirty || !activePage}
      >
        {busy ? '저장 중...' : '저장'}
      </button>
    </div>
  )

  const handleSave = async () => {
    if (!employeeId) return
    setBusy(true)
    try {
      const result = await savePersonalMemoPages(employeeId, pages)
      setPages(result.pages)
      setSavedAt(result.updatedAt)
      setDirty(false)
      showToast('저장되었습니다')
    } catch (e) {
      if (e.message === 'SCHEMA') {
        setAlert({
          title: 'DB 업데이트가 필요합니다',
          messages: personalMemoSchemaMigrationMessages(),
        })
      } else {
        showToast('저장 실패: ' + e.message, true)
      }
    } finally {
      setBusy(false)
    }
  }

  const confirmDeletePage = () => {
    if (!deletePageTarget) return
    const idx = pages.findIndex(p => p.id === deletePageTarget)
    const nextPages = pages.filter(p => p.id !== deletePageTarget)
    setPages(nextPages)
    if (activePageId === deletePageTarget) {
      const fallback = nextPages[idx] ?? nextPages[idx - 1] ?? null
      setActivePageId(fallback?.id ?? null)
    }
    setDeletePageTarget(null)
    setDirty(true)
  }
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="memo-page memo-page-workspace">
      <div className="memo-header">
        <div className="memo-header-row">
          <div>
            <h2 className="memo-title">개인 메모</h2>
            <p className="memo-desc">
              {member ? `${member.name} · ${employeeId}` : employeeId}
              {dirty && <span className="memo-dirty-badge">저장 안 됨</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="memo-workspace">
        <aside className="memo-sidebar">
          <div className="memo-sidebar-head">
            <span className="memo-sidebar-label">페이지</span>
            <span className="memo-sidebar-count">{pages.length}</span>
          </div>

          <ul className="memo-page-list">
            {pages.map(page => (
              <li key={page.id} className="memo-page-list-item">
                <button
                  type="button"
                  className={`memo-page-link ${activePageId === page.id ? 'active' : ''}`}
                  onClick={() => setActivePageId(page.id)}
                >
                  <span className="memo-page-link-icon">📄</span>
                  <span className="memo-page-link-title">
                    {page.title.trim() || '제목 없음'}
                  </span>
                </button>
                <button
                  type="button"
                  className="memo-page-delete"
                  onClick={() => setDeletePageTarget(page.id)}
                  aria-label={`${page.title || '제목 없음'} 페이지 삭제`}
                  title="페이지 삭제"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="memo-page-add" onClick={handleAddPage}>
            <span className="memo-page-add-icon">+</span>
            새 페이지
          </button>
        </aside>

        <section className="memo-main">
          <div className="memo-page-title-row">
            {activePage ? (
              <input
                type="text"
                className="memo-page-title-input"
                value={activePage.title}
                onChange={e => updateActivePage({ title: e.target.value })}
                placeholder="페이지 제목"
                spellCheck={false}
              />
            ) : (
              <div className="memo-page-title-input memo-page-title-ghost" aria-hidden="true">
                페이지 제목
              </div>
            )}
            {titleActions}
          </div>

          {activePage ? (
            <MemoRichEditor
              pageId={activePage.id}
              value={activePage.content}
              onChange={content => updateActivePage({ content })}
              placeholder="내용을 입력하세요..."
            />
          ) : (
            <div className="memo-rich-editor memo-rich-editor-empty">
              <div className="memo-editor-toolbar memo-editor-toolbar-ghost" aria-hidden="true" />
              <div className="memo-main-empty">
                <p>페이지를 선택하거나 새 페이지를 추가해 주세요.</p>
                <button type="button" className="btn-primary-sm" onClick={handleAddPage}>
                  + 새 페이지
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
      
      {toast && (
        <div className={`toast show ${toast.err ? 'toast-error' : ''}`}>
          {toast.msg}
        </div>
      )}

      <AlertModal
        open={!!alert}
        title={alert?.title}
        messages={alert?.messages ?? []}
        onClose={() => setAlert(null)}
      />

      <ConfirmModal
        open={!!deletePageTarget}
        message="이 페이지를 삭제할까요? 저장 전이면 복구할 수 없습니다."
        confirmLabel="삭제"
        onConfirm={confirmDeletePage}
        onCancel={() => setDeletePageTarget(null)}
      />
    </div>
  )
}
