import { fmt as toDateStr, today, normalizeDateStr } from './dates'
import { normalizeMemberColor } from './members'
import { workMetaForDate } from './weeklyTask'
import { formatTaskDisplayName, normalizeTaskNameFields } from './nateServices'

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function sundayOf(dateStr) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function addDays(dateStr, days) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

/** 해당 월을 담는 주 단위 그리드 (일요일 시작, 앞뒤 달 패딩 포함) */
export function buildMonthWeeks(year, month) {
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const todayStr = today()

  const weeks = []
  const cursor = sundayOf(toDateStr(first))
  const endSunday = sundayOf(toDateStr(last))

  while (cursor <= endSunday) {
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(cursor)
      d.setDate(cursor.getDate() + i)
      const dateStr = toDateStr(d)
      days.push({
        dateStr,
        day: d.getDate(),
        inMonth: d.getMonth() + 1 === month,
        isToday: dateStr === todayStr,
      })
    }
    weeks.push({ days })
    cursor.setDate(cursor.getDate() + 7)
  }

  return weeks
}

/** 업무 → 달력 이벤트 */
export function tasksToCalendarEvents(tasks, tabMembers = [], reportFrom = '', reportTo = '') {
  const events = []

  for (const task of tasks) {
    const member = tabMembers.find(m => m.id === task.memberId)
    const assigneeName = member?.name || task.assignee?.trim() || '담당자 없음'
    const displayName = formatTaskDisplayName(task) || '(업무명 없음)'
    const fields = normalizeTaskNameFields(task)
    const taskTitle = fields.nameDetail?.trim() || ''
    const base = {
      taskId: task.id,
      weekKey: task.weekKey || '',
      taskName: displayName,
      service: fields.service || '',
      platforms: fields.platforms,
      taskTitle,
      assignee: assigneeName,
      memberColor: normalizeMemberColor(member?.color),
      memberLabel: member?.label || '',
      displayLabel: `[${assigneeName}] ${displayName}`,
    }

    for (const work of task.works || []) {
      const from = normalizeDateStr(work?.from)
      if (!from) continue
      const to = normalizeDateStr(work?.to) || from
      const content = work.content?.trim()
      if (!content && !displayName) continue

      events.push({
        ...base,
        id: `${task.id}-${work.id}`,
        from,
        to,
        content: content || '',
        status: work.status || '',
      })
    }
  }

  return events
}

function clipRange(from, to, weekFrom, weekTo) {
  let a = from
  let b = to || from
  if (a > b) [a, b] = [b, a]
  const clipFrom = a < weekFrom ? weekFrom : a
  const clipTo = b > weekTo ? weekTo : b
  if (clipFrom > clipTo) return null
  return { from: clipFrom, to: clipTo }
}

/** 선택 주(일~토) 밖이면 tone-last, 안이면 날짜 기준 분류 */
function eventToneForSegment(dateStr, reportFrom, reportTo) {
  if (!isInSelectedWeek(dateStr, reportFrom, reportTo)) {
    return { key: 'last', label: '지난주', tone: 'last' }
  }
  return workMetaForDate(dateStr, reportFrom, reportTo)
}

/** 한 주 안에서 이벤트 바 배치 (겹침 방지 레인) */
export function placeEventsInWeek(events, weekDays, maxLanes = 4, reportFrom = '', reportTo = '') {
  const dateToCol = Object.fromEntries(weekDays.map((d, i) => [d.dateStr, i]))
  const weekFrom = weekDays[0].dateStr
  const weekTo = weekDays[6].dateStr

  const segments = events
    .map(ev => {
      const clipped = clipRange(ev.from, ev.to, weekFrom, weekTo)
      if (!clipped) return null
      const startCol = dateToCol[clipped.from]
      const endCol = dateToCol[clipped.to]
      if (startCol === undefined || endCol === undefined) return null
      const meta = eventToneForSegment(clipped.from, reportFrom, reportTo)
      return {
        ...ev,
        clipFrom: clipped.from,
        clipTo: clipped.to,
        startCol,
        endCol,
        span: endCol - startCol + 1,
        isRangeStart: clipped.from === ev.from,
        isRangeEnd: clipped.to === ev.to,
        workKey: meta.key,
        workLabel: meta.label,
        tone: meta.tone,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.startCol - b.startCol || b.span - a.span)

  const lanes = []

  for (const seg of segments) {
    let placed = false
    for (let li = 0; li < lanes.length; li++) {
      const conflict = lanes[li].some(
        s => !(seg.endCol < s.startCol || seg.startCol > s.endCol)
      )
      if (!conflict) {
        lanes[li].push({ ...seg, lane: li })
        placed = true
        break
      }
    }
    if (!placed) lanes.push([{ ...seg, lane: lanes.length }])
  }

  const flat = lanes.flat()
  const visible = flat.filter(s => s.lane < maxLanes)
  const hiddenCount = flat.filter(s => s.lane >= maxLanes).length

  return { segments: visible, hiddenCount }
}

export function isInReportRange(dateStr, reportFrom, reportTo) {
  if (!reportFrom || !reportTo) return false
  return dateStr >= reportFrom && dateStr <= reportTo
}

/** 달력 강조 범위: 선택 주 월요일 기준 전주 일요일 ~ 이번주 토요일 */
export function selectedWeekHighlightRange(reportFrom) {
  if (!reportFrom) return { from: '', to: '' }
  return {
    from: addDays(reportFrom, -1),
    to: addDays(reportFrom, 5),
  }
}

/** 선택 주차 강조(일~토)에 포함되는 날짜인지 */
export function isInSelectedWeek(dateStr, reportFrom, reportTo) {
  if (!reportFrom) return false
  const { from, to } = selectedWeekHighlightRange(reportFrom)
  return dateStr >= from && dateStr <= to
}

export function isSelectedWeekRow(weekDays, reportFrom, reportTo) {
  return weekDays.some(d => isInSelectedWeek(d.dateStr, reportFrom, reportTo))
}

/** @deprecated isInSelectedWeek 사용 */
export function isInReportWeek(dateStr, reportFrom, reportTo) {
  return isInSelectedWeek(dateStr, reportFrom, reportTo)
}

/** @deprecated isSelectedWeekRow 사용 */
export function isReportWeekRow(weekDays, reportFrom, reportTo) {
  return isSelectedWeekRow(weekDays, reportFrom, reportTo)
}

/** 특정 일자에 해당하는 이벤트를 팀원별로 묶음 */
export function groupEventsForDay(events, dateStr, reportFrom = '', reportTo = '') {
  if (!dateStr) return []

  const active = events.filter(ev => {
    const to = ev.to || ev.from
    return dateStr >= ev.from && dateStr <= to
  })

  const map = new Map()
  for (const ev of active) {
    const key = ev.assignee || '_orphan'
    const meta = workMetaForDate(dateStr, reportFrom, reportTo)
    const item = {
      ...ev,
      workKey: meta.key,
      workLabel: meta.label,
      tone: meta.tone,
    }
    if (!map.has(key)) {
      map.set(key, {
        memberName: ev.assignee || '(담당자 없음)',
        memberColor: ev.memberColor,
        memberLabel: ev.memberLabel,
        items: [],
      })
    }
    map.get(key).items.push(item)
  }

  return [...map.values()]
    .map(group => ({
      ...group,
      items: [...group.items].sort((a, b) => {
        const ta = a.taskName.localeCompare(b.taskName, 'ko')
        if (ta !== 0) return ta
        return (a.workLabel || '').localeCompare(b.workLabel || '', 'ko')
      }),
    }))
    .sort((a, b) => a.memberName.localeCompare(b.memberName, 'ko'))
}
