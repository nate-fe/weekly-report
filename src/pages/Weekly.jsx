import { NavLink } from 'react-router-dom'
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  fetchWeeklyKeys,
  fetchWeeklyRecord,
  fetchAllWeeklyTasks,
  upsertWeeklyRecord,
  fetchWeeklyDraft,
  upsertWeeklyDraft,
  deleteWeeklyDraft,
  fetchMembers,
  fetchMembersByIds,
  checkWeeklyTasksSchema,
  checkWeeklyDraftsSchema,
  isWeeklySchemaError,
  isWeeklyDraftSchemaError,
  weeklySchemaMigrationMessages,
  weeklyDraftSchemaMigrationMessages,
} from '../utils/storage'
import {
  weeksInMonth,
  fmtKo,
  today,
  weekKey,
  prevWeekKey,
  fmtWeekSidebarRange,
} from '../utils/dates'
import { exportWeeklyExcel } from '../utils/excel'
import {
  emptyTask,
  fmtRangeShort,
  validateWeeklyRecord,
  emptyWorkEntry,
  groupWorksForView,
  WORK_VIEW_GROUPS,
  workSummary,
  cloneTaskForImport,
} from '../utils/weeklyTask'
import { formatDraftSavedAt } from '../utils/weeklyDraft'
import { labelClass } from '../utils/members'
import AlertModal from '../components/AlertModal'
import ConfirmModal from '../components/ConfirmModal'
import WeeklyTaskCard from '../components/WeeklyTaskCard'
import WeeklyCalendar from '../components/WeeklyCalendar'
import PrevWeekImportModal from '../components/PrevWeekImportModal'

const emptyRecord = (from, to) => ({ from, to, tasks: [] })

const LIST_PANEL_WIDTH_KEY = 'weekly-list-panel-width'
const LIST_PANEL_DEFAULT = 570
const LIST_PANEL_MIN = 320
const LIST_PANEL_CALENDAR_MIN = 280

function readListPanelWidth() {
  try {
    const saved = Number(localStorage.getItem(LIST_PANEL_WIDTH_KEY))
    if (Number.isFinite(saved) && saved >= LIST_PANEL_MIN) return saved
  } catch { /* ignore */ }
  return LIST_PANEL_DEFAULT
}

function clampListPanelWidth(width, containerWidth) {
  const max = Math.max(LIST_PANEL_MIN, containerWidth - LIST_PANEL_CALENDAR_MIN)
  return Math.min(max, Math.max(LIST_PANEL_MIN, width))
}

function recordsEqual(a, b) {
  if (!a || !b) return false
  return JSON.stringify({ from: a.from, to: a.to, tasks: a.tasks || [] })
    === JSON.stringify({ from: b.from, to: b.to, tasks: b.tasks || [] })
}

export default function Weekly() {
  const now = new Date()
  const [year, setYear]               = useState(now.getFullYear())
  const [month, setMonth]             = useState(now.getMonth() + 1)
  const [selectedKey, setSelectedKey] = useState(null)
  const [record, setRecord]           = useState(null)
  const [savedKeys, setSavedKeys]     = useState([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [loadingWeek, setLoadingWeek] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [toast, setToast]             = useState('')
  const [alert, setAlert]             = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editingTaskIds, setEditingTaskIds] = useState(() => new Set())
  const [draftTaskIds, setDraftTaskIds] = useState(() => new Set())
  const [lastSavedTaskIds, setLastSavedTaskIds] = useState(() => new Set())
  const [members, setMembers]               = useState([])
  const [deletedTabMembers, setDeletedTabMembers] = useState([])
  const [activeMemberTab, setActiveMemberTab] = useState('all')
  const [draftSavedAt, setDraftSavedAt] = useState(null)
  const [serverDraftAt, setServerDraftAt] = useState(null)
  const [draftSaving, setDraftSaving] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)
  const [prevImportOpen, setPrevImportOpen] = useState(false)
  const [prevImportLoading, setPrevImportLoading] = useState(false)
  const [prevImportWeekKey, setPrevImportWeekKey] = useState('')
  const [listPanelWidth, setListPanelWidth] = useState(readListPanelWidth)
  const splitRef = useRef(null)
  const listPanelInnerRef = useRef(null)
  const scrollListAfterAddRef = useRef(false)
  const listPanelWidthRef = useRef(listPanelWidth)
  const resizingRef = useRef(false)
  const [prevImportTasks, setPrevImportTasks] = useState([])
  const [allWeekTasks, setAllWeekTasks] = useState([])
  const recordRef = useRef(null)

  const refreshAllWeekTasks = async () => {
    try {
      const tasks = await fetchAllWeeklyTasks()
      setAllWeekTasks(tasks)
    } catch {
      setAllWeekTasks([])
    }
  }

  const weeks = weeksInMonth(year, month)
  const thisWeekKey = weekKey(today())

  useEffect(() => {
    recordRef.current = record
  }, [record])

  listPanelWidthRef.current = listPanelWidth

  const startListPanelResize = (e) => {
    if (e.button !== 0) return
    e.preventDefault()
    resizingRef.current = true
    document.body.classList.add('weekly-resizing')
  }

  useEffect(() => {
    const onMove = (e) => {
      if (!resizingRef.current || !splitRef.current) return
      const rect = splitRef.current.getBoundingClientRect()
      const next = clampListPanelWidth(rect.right - e.clientX, rect.width)
      setListPanelWidth(next)
    }

    const onUp = () => {
      if (!resizingRef.current) return
      resizingRef.current = false
      document.body.classList.remove('weekly-resizing')
      try {
        localStorage.setItem(LIST_PANEL_WIDTH_KEY, String(listPanelWidthRef.current))
      } catch { /* ignore */ }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.classList.remove('weekly-resizing')
    }
  }, [])

  useEffect(() => {
    if (!scrollListAfterAddRef.current) return
    scrollListAfterAddRef.current = false
    const el = listPanelInnerRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    })
  }, [record?.tasks?.length])

  const showToast = (msg, isErr = false) => {
    setToast({ msg, err: isErr })
    setTimeout(() => setToast(''), 3000)
  }

  // ── 저장된 주 목록 (월 변경 시 갱신) ──
  useEffect(() => {
    if (loadingInit) return
    fetchWeeklyKeys()
      .then(setSavedKeys)
      .catch(e => showToast('저장 목록 로드 실패: ' + e.message, true))
  }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 팀원 목록 ──
  useEffect(() => {
    fetchMembers()
      .then(setMembers)
      .catch(e => showToast('팀원 로드 실패: ' + e.message, true))
  }, [])

  // ── 현재 주차 업무에 있는 삭제된 팀원 탭 ──
  useEffect(() => {
    if (!record?.tasks?.length) {
      setDeletedTabMembers([])
      return
    }
    const activeIds = new Set(members.map(m => m.id))
    const orphanIds = [...new Set(
      record.tasks.map(t => t.memberId).filter(id => id && !activeIds.has(id))
    )]
    if (!orphanIds.length) {
      setDeletedTabMembers([])
      return
    }
    let cancelled = false
    fetchMembersByIds(orphanIds)
      .then(data => {
        if (cancelled) return
        const foundIds = new Set(data.map(m => m.id))
        const synthetic = orphanIds
          .filter(id => !foundIds.has(id))
          .map(id => {
            const task = record.tasks.find(t => t.memberId === id)
            return {
              id,
              name: task?.assignee?.trim() || '(삭제된 팀원)',
              color: '#6b778c',
              label: 'FE개발',
              deleted: true,
            }
          })
        setDeletedTabMembers([
          ...data.map(m => ({ ...m, deleted: true })),
          ...synthetic,
        ])
      })
      .catch(e => showToast('삭제된 팀원 로드 실패: ' + e.message, true))
    return () => { cancelled = true }
  }, [record?.tasks, members]) // eslint-disable-line react-hooks/exhaustive-deps

  const tabMembers = useMemo(
    () => [...members, ...deletedTabMembers],
    [members, deletedTabMembers]
  )

  useEffect(() => {
    if (activeMemberTab !== 'all' && !tabMembers.some(m => m.id === activeMemberTab)) {
      setActiveMemberTab('all')
    }
  }, [tabMembers, activeMemberTab])

  // ── DB 스키마 확인 ──
  useEffect(() => {
    Promise.all([checkWeeklyTasksSchema(), checkWeeklyDraftsSchema()])
      .then(([tasksOk, draftsOk]) => {
        const messages = []
        if (!tasksOk) messages.push(...weeklySchemaMigrationMessages())
        if (!draftsOk) messages.push(...weeklyDraftSchemaMigrationMessages())
        if (messages.length) {
          setAlert({ title: 'DB 업데이트가 필요합니다', messages })
        }
      })
      .catch(() => {})
  }, [])

  // ── 최초 진입: 저장 목록 + 이번 주 데이터 로드 ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const keys = await fetchWeeklyKeys()
        if (cancelled) return
        setSavedKeys(keys)

        const thisWeek = weeksInMonth(now.getFullYear(), now.getMonth() + 1)
          .find(w => w.key === weekKey(today()))
        if (thisWeek) await loadWeek(thisWeek)
      } catch (e) {
        if (!cancelled) showToast('데이터 로드 실패: ' + e.message, true)
      } finally {
        if (!cancelled) setLoadingInit(false)
      }
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadWeek = async (week) => {
    setSelectedKey(week.key)
    setSaved(false)
    setEditingTaskIds(new Set())
    setDraftTaskIds(new Set())
    setDeletedTabMembers([])
    setActiveMemberTab('all')
    setDraftSavedAt(null)
    setServerDraftAt(null)
    setPrevImportOpen(false)
    setLoadingWeek(true)
    try {
      const [data, draft] = await Promise.all([
        fetchWeeklyRecord(week.key),
        fetchWeeklyDraft(week.key).catch(() => null),
      ])
      await refreshAllWeekTasks()
      const dbTasks = data?.tasks || []
      const period = { from: week.from, to: week.to }
      setRecord(data ? { ...data, ...period, tasks: dbTasks } : emptyRecord(week.from, week.to))
      setLastSavedTaskIds(new Set(dbTasks.map(t => t.id)))
      setSaved(!!dbTasks.length)
      setServerDraftAt(draft?.savedAt ?? null)
    } catch (e) {
      showToast('주간 보고 로드 실패: ' + e.message, true)
      setRecord(emptyRecord(week.from, week.to))
      setLastSavedTaskIds(new Set())
      setServerDraftAt(null)
    } finally {
      setLoadingWeek(false)
    }
  }

  const applyDraftRecord = (draft, dbTasks) => {
    if (!draft?.record) return
    const dbRecord = {
      from: draft.record.from,
      to: draft.record.to,
      tasks: dbTasks,
    }
    setRecord(draft.record)
    recordRef.current = draft.record
    setDraftTaskIds(new Set(
      (draft.record.tasks || [])
        .filter(t => !dbTasks.some(d => d.id === t.id))
        .map(t => t.id)
    ))
    setEditingTaskIds(new Set((draft.record.tasks || []).map(t => t.id)))
    setSaved(recordsEqual(draft.record, dbRecord) && dbTasks.length > 0)
    setDraftSavedAt(draft.savedAt)
    setServerDraftAt(draft.savedAt)
  }

  // ── 주 선택 (미저장 시 자동 임시 저장) ──
  const selectWeek = async (week) => {
    if (selectedKey && recordRef.current && !saved) {
      try {
        await upsertWeeklyDraft(selectedKey, recordRef.current)
      } catch {
        // 자동 임시 저장 실패는 무시
      }
    }
    await loadWeek(week)
  }

  // ── 저장 ──
  const persistRecord = async (
    recordData,
    { successMessage = '저장되었습니다', skipValidation = false } = {}
  ) => {
    if (!selectedKey || !recordData || saving) return false

    if (!skipValidation) {
      const { valid, errors } = validateWeeklyRecord(recordData)
      if (!valid) {
        setAlert({ title: '저장할 수 없습니다', messages: errors })
        return false
      }
    }

    setSaving(true)
    try {
      const toSave = {
        ...recordData,
        tasks: recordData.tasks.map(t => {
          const m = tabMembers.find(x => x.id === t.memberId)
          return { ...t, assignee: m?.name || t.assignee }
        }),
      }
      await upsertWeeklyRecord(selectedKey, toSave)
      const keys = await fetchWeeklyKeys()
      setSavedKeys(keys)
      setSaved(true)
      setEditingTaskIds(new Set())
      setDraftTaskIds(new Set())
      setLastSavedTaskIds(new Set(recordData.tasks.map(t => t.id)))
      await deleteWeeklyDraft(selectedKey)
      setDraftSavedAt(null)
      setServerDraftAt(null)
      await refreshAllWeekTasks()
      if (successMessage) showToast(successMessage)
      return true
    } catch (e) {
      if (isWeeklySchemaError(e)) {
        setAlert({ title: 'DB 업데이트가 필요합니다', messages: weeklySchemaMigrationMessages() })
      } else {
        showToast('저장 실패: ' + e.message, true)
      }
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    await persistRecord(recordRef.current)
  }

  const handleDraftSave = async () => {
    if (!selectedKey || !recordRef.current || draftSaving) return
    setDraftSaving(true)
    try {
      const at = await upsertWeeklyDraft(selectedKey, recordRef.current)
      setDraftSavedAt(at)
      setServerDraftAt(at)
      showToast('임시 저장되었습니다')
    } catch (e) {
      if (isWeeklyDraftSchemaError(e)) {
        setAlert({ title: 'DB 업데이트가 필요합니다', messages: weeklyDraftSchemaMigrationMessages() })
      } else {
        showToast('임시 저장 실패: ' + e.message, true)
      }
    } finally {
      setDraftSaving(false)
    }
  }

  const handleDraftLoad = async () => {
    if (!selectedKey || draftSaving || draftLoading || saving) return
    setDraftLoading(true)
    try {
      const [draft, data] = await Promise.all([
        fetchWeeklyDraft(selectedKey),
        fetchWeeklyRecord(selectedKey),
      ])
      if (!draft?.record) {
        setServerDraftAt(null)
        showToast('임시 저장본이 없습니다', true)
        return
      }
      const dbTasks = data?.tasks || []
      applyDraftRecord(draft, dbTasks)
      showToast('임시 저장을 불러왔습니다')
    } catch (e) {
      if (isWeeklyDraftSchemaError(e)) {
        setAlert({ title: 'DB 업데이트가 필요합니다', messages: weeklyDraftSchemaMigrationMessages() })
      } else {
        showToast('임시 저장 불러오기 실패: ' + e.message, true)
      }
    } finally {
      setDraftLoading(false)
    }
  }

  const draftBusy = draftSaving || draftLoading

  // ── record 업데이트 헬퍼 ──
  const update = (patch) => {
    setRecord(r => ({ ...r, ...patch }))
    setSaved(false)
    setDraftSavedAt(null)
  }

  const updateTasks = (fn) => {
    setRecord(r => ({ ...r, tasks: fn(r.tasks || []) }))
    setSaved(false)
    setDraftSavedAt(null)
  }

  // ── 업무 CRUD ──
  const addTask = () => {
    if (activeMemberTab === 'all') return
    const member = tabMembers.find(m => m.id === activeMemberTab)
    if (!member || member.deleted) return
    const t = emptyTask(member.id, member.name)
    t.works = [emptyWorkEntry()]
    updateTasks(tasks => [...tasks, t])
    setEditingTaskIds(prev => new Set([...prev, t.id]))
    setDraftTaskIds(prev => new Set([...prev, t.id]))
    scrollListAfterAddRef.current = true
  }

  const openPrevWeekImport = async () => {
    if (!record?.from || activeMemberTab === 'all') return

    setPrevImportOpen(true)
    setPrevImportLoading(true)
    setPrevImportTasks([])
    setPrevImportWeekKey('')

    try {
      const pKey = prevWeekKey(record.from)
      const data = await fetchWeeklyRecord(pKey)
      const draft = await fetchWeeklyDraft(pKey).catch(() => null)
      const prevRecord = draft?.record || data
      const tasks = (prevRecord?.tasks || []).filter(t => t.memberId === activeMemberTab)

      setPrevImportWeekKey(pKey)
      setPrevImportTasks(tasks)
    } catch (e) {
      showToast('저번주 데이터 로드 실패: ' + e.message, true)
      setPrevImportOpen(false)
    } finally {
      setPrevImportLoading(false)
    }
  }

  const handlePrevWeekImport = (selectedIds) => {
    const member = tabMembers.find(m => m.id === activeMemberTab)
    if (!member) return

    const idSet = new Set(selectedIds)
    const toImport = prevImportTasks.filter(t => idSet.has(t.id))
    if (!toImport.length) return

    const clones = toImport.map(t => cloneTaskForImport(t, member.id, member.name))
    updateTasks(tasks => [...tasks, ...clones])
    setEditingTaskIds(prev => new Set([...prev, ...clones.map(t => t.id)]))
    setDraftTaskIds(prev => new Set([...prev, ...clones.map(t => t.id)]))
    setPrevImportOpen(false)
    showToast(`${clones.length}개 업무를 불러왔습니다`)
  }


  const calendarTasks = useMemo(
    () => allWeekTasks.filter(t => !draftTaskIds.has(t.id)),
    [allWeekTasks, draftTaskIds],
  )

  /** 선택 주(record) 기준 — 업무 목록·카운트용 */
  const weekTasks = useMemo(
    () => (record?.tasks || []).filter(t => !draftTaskIds.has(t.id)),
    [record?.tasks, draftTaskIds],
  )

  const filteredTasks = (record?.tasks || []).filter(t =>
    t.memberId === activeMemberTab
  )

  const listTasks = activeMemberTab === 'all' ? weekTasks : filteredTasks

  const taskCountLabel = activeMemberTab === 'all'
    ? `${weekTasks.length}건`
    : `${filteredTasks.length}건`

  const showSaveActions = activeMemberTab !== 'all' && (record?.tasks || []).some(
    t => t.memberId === activeMemberTab && editingTaskIds.has(t.id)
  )
  const updateTask = (id, patch) => updateTasks(tasks =>
    tasks.map(t => t.id === id ? { ...t, ...patch } : t)
  )
  const addWorkEntry = (taskId) => updateTasks(tasks =>
    tasks.map(t => t.id === taskId
      ? { ...t, works: [...(t.works || []), emptyWorkEntry()] }
      : t)
  )
  const updateWorkEntry = (taskId, workId, patch) => updateTasks(tasks =>
    tasks.map(t => t.id === taskId
      ? { ...t, works: (t.works || []).map(w => w.id === workId ? { ...w, ...patch } : w) }
      : t)
  )
  const removeWorkEntry = (taskId, workId) => updateTasks(tasks =>
    tasks.map(t => t.id === taskId
      ? { ...t, works: (t.works || []).filter(w => w.id !== workId) }
      : t)
  )
  const updateTarget = (id, patch) => updateTasks(tasks =>
    tasks.map(t => t.id === id ? { ...t, target: { ...t.target, ...patch } } : t)
  )
  const removeTask = (id) => setDeleteTarget(id)

  /** 삭제 후 임시 저장본 동기화 */
  const syncDraftAfterEdit = async (recordData) => {
    if (!selectedKey || !recordData) return
    try {
      const at = await upsertWeeklyDraft(selectedKey, recordData)
      setServerDraftAt(at)
    } catch {
      // 임시 저장 실패는 무시
    }
  }

  const confirmRemoveTask = async () => {
    if (!deleteTarget || !record) return
    const id = deleteTarget
    const wasPersisted = lastSavedTaskIds.has(id)
    const nextRecord = {
      ...record,
      tasks: (record.tasks || []).filter(t => t.id !== id),
    }

    setRecord(nextRecord)
    recordRef.current = nextRecord
    setSaved(false)
    setLastSavedTaskIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setEditingTaskIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setDraftTaskIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setDeleteTarget(null)

    if (wasPersisted) {
      const ok = await persistRecord(nextRecord, {
        successMessage: '삭제되었습니다',
        skipValidation: true,
      })
      if (!ok) {
        await syncDraftAfterEdit(nextRecord)
        showToast('삭제 후 저장에 실패했습니다. 내용을 확인한 뒤 저장 버튼을 눌러 주세요.', true)
      }
    } else {
      await syncDraftAfterEdit(nextRecord)
      showToast('삭제되었습니다')
    }
  }

  const startEditTask = (id) => {
    setEditingTaskIds(prev => new Set([...prev, id]))
    const task = record?.tasks?.find(t => t.id === id)
    if (task && !(task.works || []).length) {
      addWorkEntry(id)
    }
  }

  const switchMemberTab = (tabId) => {
    if (tabId === activeMemberTab) return

    if (tabId === 'all' && draftTaskIds.size > 0) {
      const remaining = (record?.tasks || []).filter(t => !draftTaskIds.has(t.id))
      const remainingIds = new Set(remaining.map(t => t.id))
      const onlyDraftsDiscarded =
        remainingIds.size === lastSavedTaskIds.size &&
        [...lastSavedTaskIds].every(id => remainingIds.has(id))

      setRecord(r => ({ ...r, tasks: (r?.tasks || []).filter(t => !draftTaskIds.has(t.id)) }))
      setDraftTaskIds(new Set())
      if (onlyDraftsDiscarded) setSaved(true)
    }

    setEditingTaskIds(new Set())
    setDeleteTarget(null)
    setPrevImportOpen(false)
    setActiveMemberTab(tabId)
  }

  // ── 월 이동 ──
  const prevMonth = () => month === 1 ? (setYear(y => y - 1), setMonth(12)) : setMonth(m => m - 1)
  const nextMonth = () => month === 12 ? (setYear(y => y + 1), setMonth(1)) : setMonth(m => m + 1)

  // ── 마크다운 복사 ──
  const copyMarkdown = () => {
    if (!record) return
    let md = `# 📋 주간 업무\n> 기간: ${fmtKo(record.from)} ~ ${fmtKo(record.to)}\n\n`
    if (record.tasks?.length) {
      md += `## 업무 목록\n\n`
      record.tasks.forEach(t => {
        const c = v => (v || '-').replace(/\n/g, ' ').replace(/\|/g, '\\|')
        const grouped = groupWorksForView(t.works || [], record.from, record.to)
        md += `### ${c(t.name)} (${c(t.assignee)})\n`
        if (t.target?.date) {
          md += `- 목표 일정: ${c(t.target.date)}\n`
        }
        for (const { key, label } of WORK_VIEW_GROUPS) {
          const items = grouped[key]
          if (!items.length) continue
          items.forEach(work => {
            const s = workSummary(work)
            const meta = [s.meta].filter(Boolean).join('')
            md += `- **${label}**${meta ? ` (${meta})` : ''}: ${c(s.content)}\n`
          })
        }
        md += '\n'
      })
    }
    navigator.clipboard.writeText(md).then(() => showToast('마크다운이 복사되었습니다'))
  }

  // ── 엑셀 ──
  const handleExcel = () => {
    if (!selectedKey || !record) return
    exportWeeklyExcel(selectedKey, record)
    showToast('엑셀 파일이 다운로드되었습니다')
  }

  // ── 렌더 ──
  if (loadingInit) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>데이터를 불러오는 중...</p>
      </div>
    )
  }

  const saveHeaderActions = (
    <div className="form-section-header-actions">
      {draftSavedAt && (
        <span className="draft-saved-hint">
          임시 저장 · {formatDraftSavedAt(draftSavedAt)}
        </span>
      )}
      <button
        type="button"
        className="btn-import-prev"
        onClick={openPrevWeekImport}
        disabled={saving || draftBusy}
      >
        저번주 데이터 불러오기
      </button>
      {serverDraftAt && (
        <button
          type="button"
          className="btn-draft-load"
          onClick={handleDraftLoad}
          disabled={saving || draftBusy}
        >
          {draftLoading ? '불러오는 중...' : '임시 저장 불러오기'}
        </button>
      )}
      <button
        type="button"
        className="btn-draft-save"
        onClick={handleDraftSave}
        disabled={saving || draftBusy}
      >
        {draftSaving ? '저장 중...' : '임시 저장'}
      </button>
      <button
        type="button"
        className={`btn-save ${saved ? 'saved' : ''} ${saving ? 'saving' : ''}`}
        onClick={handleSave}
        disabled={saving || draftBusy}
      >
        {saving ? '저장 중...' : saved ? '✓ 저장됨' : '저장'}
      </button>
    </div>
  )

  return (
    <div className="weekly-layout">
      {/* 왼쪽: 월 네비 + 주 목록 */}
      <aside className="week-sidebar">
        <div className="month-nav">
          <button className="btn-month-arrow" onClick={prevMonth}>‹</button>
          <span className="month-label">{year}년 {month}월</span>
          <button className="btn-month-arrow" onClick={nextMonth}>›</button>
        </div>
        <div className="week-list">
          {weeks.map(week => (
              <div
                key={week.key}
                className={`week-item ${selectedKey === week.key ? 'active' : ''} ${week.key === thisWeekKey ? 'is-this-week' : ''}`}
                onClick={() => selectWeek(week)}
              >
                <div className="week-item-head">
                  <div className="week-item-key">{week.key}</div>
                  {week.key === thisWeekKey && (
                    <span className="week-item-this-badge">이번주</span>
                  )}
                </div>
                <div className="week-item-range">
                  {fmtWeekSidebarRange(week.from)}
                </div>
              </div>
            ))}
        </div>
      </aside>

      {/* 오른쪽: 주간 보고 폼 */}
      <section className="weekly-form">
        {loadingWeek ? (
          <div className="loading-screen">
            <div className="spinner" />
          </div>
        ) : !record ? (
          <div className="empty-state">주차를 선택해 주세요</div>
        ) : (
          <>
            {/* 폼 헤더 */}
            <div className="weekly-form-header">
              <div>
                <div className="weekly-form-title">주간 업무</div>
                <div className="weekly-form-period">
                  {fmtKo(record.from)} ~ {fmtKo(record.to)}
                </div>
              </div>
              <div className="weekly-form-actions">
                <div className="period-inputs">
                  <input type="date" value={record.from} onChange={e => update({ from: e.target.value })} className="date-input-sm" />
                  <span className="sep">~</span>
                  <input type="date" value={record.to}   onChange={e => update({ to: e.target.value })}   className="date-input-sm" />
                </div>
                <button className="btn-outline-sm" onClick={copyMarkdown}>마크다운 복사</button>
                <button className="btn-outline-sm" onClick={handleExcel}>📊 엑셀</button>
              </div>
            </div>

            {/* 팀원 탭 */}
            <div className="member-tabs">
              <button
                type="button"
                className={`member-tab ${activeMemberTab === 'all' ? 'active' : ''}`}
                onClick={() => switchMemberTab('all')}
              >
                전체
                <span className="member-tab-cnt">{weekTasks.length}</span>
              </button>
              {tabMembers.map(m => {
                const cnt = (record.tasks || []).filter(t => t.memberId === m.id).length
                if (!cnt && m.deleted) return null
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`member-tab ${m.deleted ? 'deleted' : ''} ${activeMemberTab === m.id ? 'active' : ''}`}
                    onClick={() => switchMemberTab(m.id)}
                  >
                    <span className="member-tab-dot" style={{ background: m.color }} />
                    {m.name}
                    {m.deleted && <span className="member-tab-deleted-badge">삭제됨</span>}
                    {!m.deleted && (
                      <span className={`member-label-badge sm ${labelClass(m.label || 'FE개발')}`}>
                        {m.label || 'FE개발'}
                      </span>
                    )}
                    <span className="member-tab-cnt">{cnt}</span>
                  </button>
                )
              })}
            </div>

            <div className="weekly-split" ref={splitRef}>
              <div className="weekly-calendar-column">
                <WeeklyCalendar
                  tasks={calendarTasks}
                  tabMembers={tabMembers}
                  reportFrom={record.from}
                  reportTo={record.to}
                  alwaysShow
                />
              </div>

              <div
                className="weekly-split-handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="달력과 업무 목록 너비 조절"
                onMouseDown={startListPanelResize}
              />

              <aside
                className="weekly-list-panel"
                style={{ width: listPanelWidth }}
              >
                <div className="weekly-list-panel-inner" key={activeMemberTab} ref={listPanelInnerRef}>
                  <div className="form-section-header weekly-list-header">
                    <div className="form-section-header-left">
                      <span className="form-section-title">업무 목록</span>
                      <span className="form-section-cnt">{taskCountLabel}</span>
                    </div>
                    {showSaveActions && saveHeaderActions}
                  </div>

                  {listTasks.length === 0 && (
                    <div className="empty-tasks-sm">
                      {activeMemberTab === 'all'
                        ? '이 주차에 저장된 업무가 없습니다.'
                        : deletedTabMembers.some(m => m.id === activeMemberTab)
                          ? '삭제된 팀원의 업무입니다. 수정·삭제만 가능합니다.'
                          : '이 팀원의 업무가 없습니다. 아래에서 추가해 주세요.'}
                    </div>
                  )}

                  <div className="weekly-list-items">
                    {listTasks.map(task => {
                      const member = tabMembers.find(m => m.id === task.memberId)
                      const readOnly = activeMemberTab === 'all'
                      return (
                        <WeeklyTaskCard
                          key={`${activeMemberTab}-${task.id}`}
                          task={task}
                          member={member}
                          showMember={activeMemberTab === 'all'}
                          reportFrom={record.from}
                          reportTo={record.to}
                          readOnly={readOnly}
                          editing={!readOnly && editingTaskIds.has(task.id)}
                          onEdit={() => startEditTask(task.id)}
                          onUpdate={patch => updateTask(task.id, patch)}
                          onAddWork={() => addWorkEntry(task.id)}
                          onUpdateWorkEntry={(workId, patch) => updateWorkEntry(task.id, workId, patch)}
                          onRemoveWorkEntry={workId => removeWorkEntry(task.id, workId)}
                          onUpdateTarget={patch => updateTarget(task.id, patch)}
                          onDelete={() => removeTask(task.id)}
                        />
                      )
                    })}
                  </div>

                  {activeMemberTab !== 'all' && !deletedTabMembers.some(m => m.id === activeMemberTab) && (
                    <button type="button" className="btn-add-dashed" onClick={addTask}>
                      + 업무 추가
                    </button>
                  )}
                  {activeMemberTab === 'all' && members.length === 0 && (
                    <p className="members-hint-link">
                      <NavLink to="/members">팀원 관리</NavLink>에서 팀원을 먼저 등록해 주세요.
                    </p>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </section>

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
        open={!!deleteTarget}
        message="해당 업무 내용을 삭제하시겠습니까?"
        onConfirm={confirmRemoveTask}
        onCancel={() => setDeleteTarget(null)}
      />

      <PrevWeekImportModal
        open={prevImportOpen}
        loading={prevImportLoading}
        prevWeekKey={prevImportWeekKey}
        memberName={tabMembers.find(m => m.id === activeMemberTab)?.name || ''}
        tasks={prevImportTasks}
        onImport={handlePrevWeekImport}
        onClose={() => setPrevImportOpen(false)}
      />
    </div>
  )
}
