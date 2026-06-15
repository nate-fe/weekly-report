import { normalizeDateStr } from './dates'
import {
  normalizeTaskNameFields,
  parseTaskName,
} from './nateServices'

export const WORK_STATUSES = ['완료', '진행중', '예정']

export const WORK_VIEW_GROUPS = [
  { key: 'last', label: '지난주', colorClass: 'col-last' },
  { key: 'curr', label: '이번주', colorClass: 'col-curr' },
  { key: 'next', label: '다음주', colorClass: 'col-next' },
]

let _uid = Date.now()
export function uid() {
  return String(++_uid)
}

export function emptyWorkEntry(defaultStatus = '진행중') {
  return {
    id: uid(),
    content: '',
    from: '',
    to: '',
    status: defaultStatus,
  }
}

/** @deprecated 호환용 — emptyWorkEntry 사용 */
export function emptyWork(defaultStatus = '진행중') {
  return emptyWorkEntry(defaultStatus)
}

export function emptyTask(memberId = '', memberName = '') {
  return {
    id: uid(),
    memberId,
    assignee: memberName,
    service: '',
    platforms: [],
    nameDetail: '',
    name: '',
    works: [],
    target: { date: '', memo: '' },
  }
}

function mapWork(content, from, to, status, fallbackStatus) {
  const fromDate = normalizeDateStr(from)
  const toDate = normalizeDateStr(to) || fromDate
  return {
    content: content || '',
    from: fromDate,
    to: toDate,
    status: status || fallbackStatus,
  }
}

export function normalizeWorkEntry(w) {
  const from = normalizeDateStr(w?.from)
  const to = normalizeDateStr(w?.to) || from
  return {
    id: w?.id || uid(),
    content: w?.content || '',
    from,
    to,
    status: w?.status || '진행중',
  }
}

function parseWorksFromRow(t) {
  if (t.works != null) {
    const raw = Array.isArray(t.works) ? t.works : []
    if (raw.length) return raw.map(normalizeWorkEntry)
  }

  const legacy = []
  const slots = [
    ['last', '완료'],
    ['curr', '진행중'],
    ['next', '예정'],
  ]
  for (const [key, status] of slots) {
    const w = mapWork(
      t[`${key}_work`],
      t[`${key}_from`],
      t[`${key}_to`],
      t[`${key}_status`],
      status,
    )
    if (w.from || w.content?.trim()) {
      legacy.push({ id: uid(), ...w })
    }
  }
  return legacy
}

/** 작업 기간이 설정되었는지 (하루만 선택해도 true) */
export function hasWorkPeriod(work) {
  return !!work?.from
}

/** DB row → 앱 task 객체 */
export function taskFromRow(t) {
  const parsed = parseTaskName(t.name)
  const fields = normalizeTaskNameFields({
    service: t.service || parsed.service,
    platforms: t.platforms,
    platform: t.platform,
    nameDetail: t.name_detail ?? t.nameDetail ?? parsed.nameDetail,
    name: t.name,
  })
  return {
    id: t.id,
    memberId: t.member_id || '',
    assignee: t.assignee,
    service: fields.service,
    platforms: fields.platforms,
    nameDetail: fields.nameDetail,
    name: fields.name,
    weekKey: t.week_key || '',
    works: parseWorksFromRow(t),
    target: {
      date: normalizeDateStr(t.target_date),
      memo: t.target_memo || '',
    },
  }
}

/** 앱 task 객체 → DB insert row */
export function taskToRow(t, weekKey, orderIndex) {
  const works = (t.works || []).map(normalizeWorkEntry)
  const fields = normalizeTaskNameFields(t)
  return {
    id: t.id,
    week_key: weekKey,
    member_id: t.memberId || null,
    assignee: t.assignee || '',
    name: fields.name || '',
    works,
    last_work: '',
    last_from: null,
    last_to: null,
    last_status: '진행중',
    curr_work: '',
    curr_from: null,
    curr_to: null,
    curr_status: '진행중',
    next_work: '',
    next_from: null,
    next_to: null,
    next_status: '예정',
    target_date: t.target?.date || null,
    target_memo: t.target?.memo || '',
    order_index: orderIndex,
  }
}

const WEEK_OFFSET = { last: -7, curr: 0, next: 7 }

function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 보고 기간 기준 지난주/이번주/다음주 범위 */
export function expectedWorkRanges(reportFrom, reportTo) {
  if (!reportFrom || !reportTo) return null
  const ranges = {}
  for (const [key, offset] of Object.entries(WEEK_OFFSET)) {
    ranges[key] = {
      from: shiftDate(reportFrom, offset),
      to: shiftDate(reportTo, offset),
    }
  }
  return ranges
}

function rangesOverlap(aFrom, aTo, bFrom, bTo) {
  const fromA = aFrom
  const toA = aTo || aFrom
  const fromB = bFrom
  const toB = bTo || bFrom
  const [s1, e1] = fromA <= toA ? [fromA, toA] : [toA, fromA]
  const [s2, e2] = fromB <= toB ? [fromB, toB] : [toB, fromB]
  return s1 <= e2 && s2 <= e1
}

/** 특정 날짜가 속하는 지난/이번/다음주 (달력·일별 보기용) */
export function classifyWorkOnDate(dateStr, reportFrom, reportTo) {
  if (!dateStr) return null
  const ranges = expectedWorkRanges(reportFrom, reportTo)
  if (!ranges) return null

  for (const key of ['last', 'curr', 'next']) {
    const r = ranges[key]
    if (dateStr >= r.from && dateStr <= r.to) return key
  }
  return null
}

export function workMetaForDate(dateStr, reportFrom, reportTo) {
  const key = classifyWorkOnDate(dateStr, reportFrom, reportTo) || 'curr'
  const labels = { last: '지난주', curr: '이번주', next: '다음주' }
  return { key, label: labels[key], tone: key }
}

/** 작업 기간이 겹치는 모든 주(지난/이번/다음) */
export function classifyWorkAll(work, reportFrom, reportTo) {
  if (!hasWorkPeriod(work)) return []
  const ranges = expectedWorkRanges(reportFrom, reportTo)
  if (!ranges) return []

  const from = work.from
  const to = work.to || from
  const keys = []

  for (const key of ['last', 'curr', 'next']) {
    const r = ranges[key]
    if (rangesOverlap(from, to, r.from, r.to)) keys.push(key)
  }
  return keys
}

/** 작업 기간이 어느 주(지난/이번/다음)에 해당하는지 — 복수 겹침 시 이번주 우선 */
export function classifyWork(work, reportFrom, reportTo) {
  const keys = classifyWorkAll(work, reportFrom, reportTo)
  if (!keys.length) return null
  const priority = ['curr', 'next', 'last']
  return priority.find(key => keys.includes(key)) || keys[0]
}

/** 보기 화면용 — works를 지난주/이번주/다음주로 묶음 (기간이 겹치면 여러 구간에 표시) */
export function groupWorksForView(works = [], reportFrom, reportTo) {
  const grouped = { last: [], curr: [], next: [] }
  for (const work of works) {
    for (const key of classifyWorkAll(work, reportFrom, reportTo)) {
      grouped[key].push(work)
    }
  }
  return grouped
}

/** 주간 보고 저장 전 유효성 검사 */
export function validateWeeklyRecord(record) {
  const errors = []
  const tasks = record?.tasks || []

  tasks.forEach((task, i) => {
    const slot = `업무 ${i + 1}`
    const fields = normalizeTaskNameFields(task)
    const label = fields.name || slot
    const works = task.works || []

    if (!fields.service) {
      errors.push(`${label}: 서비스를 선택해 주세요.`)
    }
    if (!fields.platforms.length) {
      errors.push(`${label}: PC 또는 모바일을 선택해 주세요.`)
    }

    if (!task.memberId) {
      errors.push(`${label}: 담당 팀원이 지정되지 않았습니다.`)
    } else if (!task.assignee?.trim()) {
      errors.push(`${label}: 담당자를 입력해 주세요.`)
    }

    const workErrors = []
    works.forEach((work, wi) => {
      const workSlot = `${label} · 작업 ${wi + 1}`
      const hasContent = !!work.content?.trim()
      const hasPeriod = hasWorkPeriod(work)

      if (hasContent && !hasPeriod) {
        workErrors.push(`${workSlot}: 작업 내용이 있으면 기간을 선택해 주세요.`)
      }
      if (hasPeriod && !hasContent) {
        workErrors.push(`${workSlot}: 기간을 선택했으면 작업 내용을 입력해 주세요.`)
      }
    })

    const hasAnyValid = works.some(w => hasWorkPeriod(w) && w.content?.trim())
    if (!hasAnyValid && workErrors.length === 0) {
      errors.push(`${label}: 작업 기간과 내용을 최소 1개 입력해 주세요.`)
    }

    errors.push(...workErrors)
  })

  return { valid: errors.length === 0, errors }
}

/** 기간 표시용 "M/D ~ M/D" */
export function fmtRangeShort(from, to) {
  if (!from && !to) return ''
  const fmt = (s) => {
    if (!s) return ''
    const [, m, d] = s.split('-')
    return `${+m}/${+d}`
  }
  if (from && to && from !== to) return `${fmt(from)} ~ ${fmt(to)}`
  return fmt(from || to)
}

/** 보기 모드용 작업 요약 */
export function workSummary(work) {
  const period = fmtRangeShort(work?.from, work?.to)
  const meta = [period, work?.status].filter(Boolean).join(' · ')
  const content = work?.content?.trim() || ''
  return { meta: meta || null, content, empty: !meta && !content }
}

/** 전주 업무 불러오기용 — 새 id로 복제 */
export function cloneTaskForImport(task, memberId, memberName) {
  const fields = normalizeTaskNameFields(task)
  const works = (task.works || []).map(w => ({
    ...normalizeWorkEntry(w),
    id: uid(),
  }))
  return {
    id: uid(),
    memberId,
    assignee: memberName,
    service: fields.service,
    platforms: fields.platforms,
    nameDetail: fields.nameDetail,
    name: fields.name,
    works: works.length ? works : [emptyWorkEntry()],
    target: {
      date: task.target?.date || '',
      memo: task.target?.memo || '',
    },
  }
}
