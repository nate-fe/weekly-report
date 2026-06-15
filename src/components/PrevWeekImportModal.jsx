import { useState, useEffect } from 'react'
import { workSummary } from '../utils/weeklyTask'
import { formatTaskDisplayName } from '../utils/nateServices'

export default function PrevWeekImportModal({
  open,
  loading = false,
  prevWeekKey = '',
  memberName = '',
  tasks = [],
  onImport,
  onClose,
}) {
  const [selected, setSelected] = useState(() => new Set())

  useEffect(() => {
    if (open) {
      setSelected(new Set(tasks.map(t => t.id)))
    }
  }, [open, tasks])

  if (!open) return null

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === tasks.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(tasks.map(t => t.id)))
    }
  }

  const handleImport = () => {
    if (!selected.size) return
    onImport([...selected])
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="prev-import-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prev-import-modal-title"
      >
        <div className="prev-import-modal-header">
          <h3 id="prev-import-modal-title" className="prev-import-modal-title">
            저번주 데이터 불러오기
          </h3>
          <p className="prev-import-modal-sub">
            {prevWeekKey && <span>{prevWeekKey}</span>}
            {memberName && <span>{memberName}</span>}
          </p>
        </div>

        {loading ? (
          <div className="prev-import-loading">
            <div className="spinner" />
            <p>저번주 데이터를 불러오는 중...</p>
          </div>
        ) : tasks.length === 0 ? (
          <p className="prev-import-empty">저번주에 등록된 업무가 없습니다.</p>
        ) : (
          <>
            <div className="prev-import-toolbar">
              <button type="button" className="btn-link-sm" onClick={toggleAll}>
                {selected.size === tasks.length ? '전체 해제' : '전체 선택'}
              </button>
              <span className="prev-import-cnt">{selected.size} / {tasks.length} 선택</span>
            </div>
            <ul className="prev-import-list">
              {tasks.map(task => {
                const works = task.works || []
                const checked = selected.has(task.id)
                return (
                  <li key={task.id}>
                    <label className={`prev-import-item ${checked ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(task.id)}
                      />
                      <div className="prev-import-item-body">
                        <p className="prev-import-item-title">
                          {formatTaskDisplayName(task) || '(업무명 없음)'}
                        </p>
                        <p className="prev-import-item-meta">
                          작업 {works.length}개
                          {task.target?.date && ` · 목표 ${task.target.date}`}
                        </p>
                        {works.length > 0 && (
                          <ul className="prev-import-works">
                            {works.map(work => {
                              const s = workSummary(work)
                              return (
                                <li key={work.id} className="prev-import-work">
                                  {s.meta && <span className="prev-import-work-meta">{s.meta}</span>}
                                  <span className="prev-import-work-content">
                                    {s.content || '(내용 없음)'}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    </label>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        <div className="prev-import-modal-actions">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>취소</button>
          <button
            type="button"
            className="btn-modal-ok"
            onClick={handleImport}
            disabled={loading || !selected.size}
          >
            {selected.size ? `${selected.size}개 불러오기` : '불러오기'}
          </button>
        </div>
      </div>
    </div>
  )
}
