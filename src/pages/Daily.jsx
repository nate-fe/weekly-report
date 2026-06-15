import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  fetchMembers, fetchMembersByIds, deleteMember,
  fetchDailyTasks, fetchDailyTasksRange, insertDailyTask, updateDailyTask, deleteDailyTask,
} from '../utils/storage'
import { today } from '../utils/dates'
import { monthDateRange, countDailySubmissions, formatDailySubmission } from '../utils/dailyCalendar'
import { exportDailyExcel } from '../utils/excel'
import ConfirmModal from '../components/ConfirmModal'
import DailyCalendar from '../components/DailyCalendar'

let _uid = Date.now()
const uid = () => String(++_uid)

function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function Daily() {
  const [date, setDate]                 = useState(today)
  const [members, setMembers]           = useState([])
  const [extraMembers, setExtraMembers] = useState([])
  const [tasks, setTasks]               = useState({})
  const [selectedId, setSelectedId]     = useState(null)
  const [loadingInit, setLoadingInit]   = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [toast, setToast]               = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  const [monthTasks, setMonthTasks] = useState({})
  const [loadingMonth, setLoadingMonth] = useState(false)
  const [calYM, setCalYM] = useState(() => {
    const t = today()
    const [y, m] = t.split('-').map(Number)
    return { year: y, month: m }
  })
  const debounceRef                     = useRef({})

  const memberMap = useMemo(() => {
    const map = {}
    for (const m of [...members, ...extraMembers]) map[m.id] = m
    return map
  }, [members, extraMembers])

  const showToast = (msg, isErr = false) => {
    setToast({ msg, err: isErr })
    setTimeout(() => setToast(''), 3000)
  }

  // ── 초기 로드: 팀원 ──
  useEffect(() => {
    fetchMembers()
      .then(data => {
        setMembers(data)
        if (data.length) setSelectedId(data[0].id)
      })
      .catch(e => showToast('팀원 로드 실패: ' + e.message, true))
      .finally(() => setLoadingInit(false))
  }, [])

  // ── 날짜 변경 시 업무 로드 ──
  useEffect(() => {
    setLoadingTasks(true)
    fetchDailyTasks(date)
      .then(async data => {
        setTasks(data)
        const known = new Set(members.map(m => m.id))
        const orphanIds = Object.keys(data).filter(id => id && id !== '_orphan' && !known.has(id))
        if (!orphanIds.length) {
          setExtraMembers([])
          return
        }
        const extra = await fetchMembersByIds(orphanIds)
        setExtraMembers(extra)
      })
      .catch(e => showToast('업무 로드 실패: ' + e.message, true))
      .finally(() => setLoadingTasks(false))
  }, [date, members])

  const refreshMonthTasks = useCallback(async (year, month) => {
    const { from, to } = monthDateRange(year, month)
    setLoadingMonth(true)
    try {
      const data = await fetchDailyTasksRange(from, to)
      setMonthTasks(data)
      const known = new Set(members.map(m => m.id))
      const orphanIds = new Set()
      for (const dayData of Object.values(data)) {
        for (const memberId of Object.keys(dayData)) {
          if (memberId && memberId !== '_orphan' && !known.has(memberId)) {
            orphanIds.add(memberId)
          }
        }
      }
      if (orphanIds.size) {
        const extra = await fetchMembersByIds([...orphanIds])
        setExtraMembers(prev => {
          const map = new Map(prev.map(m => [m.id, m]))
          for (const m of extra) map.set(m.id, m)
          return [...map.values()]
        })
      }
    } catch (e) {
      showToast('달력 데이터 로드 실패: ' + e.message, true)
    } finally {
      setLoadingMonth(false)
    }
  }, [members])

  useEffect(() => {
    if (viewMode === 'calendar') {
      refreshMonthTasks(calYM.year, calYM.month)
    }
  }, [viewMode, calYM, refreshMonthTasks])

  const handleCalMonthChange = useCallback((year, month) => {
    setCalYM({ year, month })
  }, [])

  const goToDateFromCalendar = (dateStr) => {
    setDate(dateStr)
    setSelectedId('all')
    setViewMode('list')
  }

  const syncCalendarIfNeeded = (taskDate) => {
    if (viewMode !== 'calendar') return
    const [y, m] = taskDate.split('-').map(Number)
    if (y === calYM.year && m === calYM.month) {
      refreshMonthTasks(y, m)
    }
  }

  // ── 팀원 삭제 ──
  const confirmDeleteMember = () => {
    if (!deleteTarget) return
    const prev = members
    setMembers(m => m.filter(x => x.id !== deleteTarget))
    if (selectedId === deleteTarget) {
      setSelectedId(prev.find(m => m.id !== deleteTarget)?.id ?? 'all')
    }
    deleteMember(deleteTarget)
      .then(() => showToast('팀원이 삭제되었습니다'))
      .catch(e => {
        showToast('팀원 삭제 실패: ' + e.message, true)
        setMembers(prev)
      })
    setDeleteTarget(null)
  }

  // ── 업무 추가 ──
  const addTask = (memberId = selectedId) => {
    if (!memberId || memberId === 'all') return
    const t = { id: uid(), title: '', done: false, memo: '', createdAt: new Date().toISOString() }
    const orderIndex = (tasks[memberId] || []).length
    setTasks(prev => ({ ...prev, [memberId]: [...(prev[memberId] || []), t] }))
    insertDailyTask({ id: t.id, date, memberId, orderIndex })
      .then(() => syncCalendarIfNeeded(date))
      .catch(e => {
        showToast('업무 추가 실패: ' + e.message, true)
        setTasks(prev => ({ ...prev, [memberId]: prev[memberId].filter(x => x.id !== t.id) }))
      })
  }

  // ── 업무 수정 (낙관적 + 500ms 디바운스) ──
  const updateTask = (taskId, memberId, patch) => {
    const key = memberId || '_orphan'
    setTasks(prev => ({
      ...prev,
      [key]: prev[key].map(t => t.id === taskId ? { ...t, ...patch } : t),
    }))
    clearTimeout(debounceRef.current[taskId])
    debounceRef.current[taskId] = setTimeout(() => {
      updateDailyTask(taskId, patch).catch(e => showToast('저장 실패: ' + e.message, true))
      syncCalendarIfNeeded(date)
    }, 500)
  }

  // ── 업무 삭제 ──
  const removeTask = (taskId, memberId) => {
    const key = memberId || '_orphan'
    const backup = tasks[key]
    setTasks(prev => ({ ...prev, [key]: prev[key].filter(t => t.id !== taskId) }))
    deleteDailyTask(taskId)
      .then(() => syncCalendarIfNeeded(date))
      .catch(e => {
      showToast('삭제 실패: ' + e.message, true)
      setTasks(prev => ({ ...prev, [key]: backup }))
    })
  }

  // ── 통계 ──
  const stats = (memberId) => {
    const t = tasks[memberId] || []
    return { total: t.length, done: t.filter(x => x.done).length }
  }

  const allTasksFlat = useMemo(() => {
    const items = []
    for (const [memberId, list] of Object.entries(tasks)) {
      for (const t of list) {
        items.push({ ...t, memberId: memberId === '_orphan' ? '' : memberId })
      }
    }
    return items.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return ta - tb
    })
  }, [tasks])

  const selectedMember = selectedId && selectedId !== 'all'
    ? memberMap[selectedId]
    : null
  const memberTasks = selectedId && selectedId !== 'all' ? (tasks[selectedId] || []) : []

  const activeMemberIds = useMemo(() => members.map(m => m.id), [members])

  const submissionStats = useMemo(
    () => countDailySubmissions(tasks, activeMemberIds),
    [tasks, activeMemberIds]
  )

  const submissionLabel = formatDailySubmission(
    submissionStats.submitted,
    submissionStats.total
  )

  const memberName = (memberId) =>
    memberId ? (memberMap[memberId]?.name || '(삭제된 팀원)') : '(담당자 없음)'

  const memberColor = (memberId) =>
    memberMap[memberId]?.color || '#6b778c'

  // ── 엑셀 ──
  const handleExcel = () => {
    if (!members.length && !allTasksFlat.length) { showToast('팀원이 없습니다'); return }
    const exportMembers = [...members, ...extraMembers.filter(m => !members.some(x => x.id === m.id))]
    exportDailyExcel(date, exportMembers, tasks)
    showToast('엑셀 파일이 다운로드되었습니다')
  }

  const renderTaskItem = (task, memberId, showMember = false) => (
    <div key={task.id} className={`task-item ${task.done ? 'done' : ''}`}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => updateTask(task.id, memberId, { done: !task.done })}
        className="task-check"
      />
      <div className="task-content">
        {showMember && (
          <div className="task-all-member">
            <span className="member-dot" style={{ background: memberColor(memberId) }} />
            <span className="task-all-member-name">{memberName(memberId)}</span>
            {task.createdAt && (
              <span className="task-all-time">{fmtTime(task.createdAt)}</span>
            )}
          </div>
        )}
        <input
          type="text"
          className="task-title-input"
          placeholder="업무 내용을 입력하세요"
          value={task.title}
          onChange={e => updateTask(task.id, memberId, { title: e.target.value })}
        />
        <input
          type="text"
          className="task-memo-input"
          placeholder="메모 (선택)"
          value={task.memo}
          onChange={e => updateTask(task.id, memberId, { memo: e.target.value })}
        />
      </div>
      <span className={`task-badge ${task.done ? 'badge-done' : 'badge-wip'}`}>
        {task.done ? '완료' : '진행중'}
      </span>
      <button className="btn-icon-del" onClick={() => removeTask(task.id, memberId)}>×</button>
    </div>
  )

  // ── 렌더 ──
  if (loadingInit) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>데이터를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="daily-layout">
      {/* 상단 바 */}
      <div className="daily-topbar">
        <div className="topbar-left">
          {viewMode === 'list' ? (
            <>
              <label className="field-label">날짜</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="date-input"
              />
              {loadingTasks && <span className="loading-dot">●</span>}
              {members.length > 0 && (
                <span className="daily-submission-badge">{submissionLabel}</span>
              )}
            </>
          ) : (
            <span className="daily-topbar-cal-label">일일 업무 달력</span>
          )}
        </div>
        <button className="btn-excel" onClick={handleExcel}>
          📊 엑셀 다운로드
        </button>
      </div>

      <div className="daily-view-tabs">
        <button
          type="button"
          className={`weekly-view-tab ${viewMode === 'calendar' ? 'active' : ''}`}
          onClick={() => setViewMode('calendar')}
        >
          달력
        </button>
        <button
          type="button"
          className={`weekly-view-tab ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          목록
        </button>
        {viewMode === 'calendar' && loadingMonth && (
          <span className="daily-cal-loading">불러오는 중...</span>
        )}
      </div>

      {viewMode === 'calendar' ? (
        <div className="daily-calendar-panel">
          <DailyCalendar
            tasksByDate={monthTasks}
            memberMap={memberMap}
            activeMemberIds={activeMemberIds}
            highlightDate={date}
            onMonthChange={handleCalMonthChange}
            onGoToDate={goToDateFromCalendar}
          />
        </div>
      ) : (
      <div className="daily-body">
        {/* ── 왼쪽: 팀원 패널 ── */}
        <aside className="member-panel">
          <div className="panel-header">팀원</div>

          <div className="member-list">
            {members.map(m => {
              const s = stats(m.id)
              const pct = s.total ? Math.round((s.done / s.total) * 100) : 0
              return (
                <div
                  key={m.id}
                  className={`member-item ${selectedId === m.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(m.id)}
                >
                  <div className="member-avatar" style={{ background: m.color }}>
                    {m.name[0]}
                  </div>
                  <div className="member-info">
                    <div className="member-name">{m.name}</div>
                    <div className="member-progress-bar">
                      <div
                        className="member-progress-fill"
                        style={{ width: `${pct}%`, background: m.color }}
                      />
                    </div>
                    <div className="member-stat">
                      {s.total === 0 ? '업무 없음' : `${s.done} / ${s.total} 완료 (${pct}%)`}
                    </div>
                  </div>
                  <button
                    className="btn-icon-del"
                    title="팀원 삭제"
                    onClick={e => { e.stopPropagation(); setDeleteTarget(m.id) }}
                  >×</button>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            className={`btn-all-daily ${selectedId === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedId('all')}
          >
            <span>전체 일일 업무</span>
            {members.length > 0 && (
              <span className="btn-all-daily-cnt">
                {submissionStats.submitted} / {submissionStats.total}
              </span>
            )}
          </button>
        </aside>

        {/* ── 오른쪽: 업무 패널 ── */}
        <section className="task-panel">
          {selectedId === 'all' ? (
            <>
              <div className="task-panel-header">
                <div className="task-panel-title">
                  <strong>전체 일일 업무</strong>
                </div>
                <span className="task-panel-sub">
                  {members.length > 0 ? submissionLabel : '등록 시간 순'}
                  {members.length > 0 && allTasksFlat.length > 0 && ' · 등록 시간 순'}
                </span>
              </div>

              {allTasksFlat.length === 0 ? (
                <div className="empty-tasks">
                  <p>등록된 업무가 없습니다</p>
                </div>
              ) : (
                <div className="task-list">
                  {allTasksFlat.map(task => renderTaskItem(task, task.memberId, true))}
                </div>
              )}
            </>
          ) : !selectedId ? (
            <div className="empty-state">팀원을 선택해 주세요</div>
          ) : (
            <>
              <div className="task-panel-header">
                <div className="task-panel-title">
                  <span className="member-dot" style={{ background: selectedMember?.color }} />
                  <strong>{selectedMember?.name}</strong>의 오늘 업무
                </div>
                <button className="btn-primary-sm" onClick={() => addTask(selectedId)}>+ 업무 추가</button>
              </div>

              {memberTasks.length === 0 ? (
                <div className="empty-tasks">
                  <p>등록된 업무가 없습니다</p>
                  <button className="btn-add-task-center" onClick={() => addTask(selectedId)}>+ 업무 추가</button>
                </div>
              ) : (
                <div className="task-list">
                  {memberTasks.map(task => renderTaskItem(task, selectedId))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
      )}

      {toast && (
        <div className={`toast show ${toast.err ? 'toast-error' : ''}`}>
          {toast.msg}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        message={'팀원을 목록에서 삭제할까요?\n일일·주간 업무 기록은 그대로 유지됩니다.'}
        confirmLabel="삭제"
        onConfirm={confirmDeleteMember}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
