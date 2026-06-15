import { fmt as toDateStr } from './dates'
import { buildMonthWeeks } from './weeklyCalendar'

/** 해당 월의 첫날·마지막날 (YYYY-MM-DD) */
export function monthDateRange(year, month) {
  const from = toDateStr(new Date(year, month - 1, 1))
  const to = toDateStr(new Date(year, month, 0))
  return { from, to }
}

export { buildMonthWeeks }

/** 날짜별 업무 맵 → 일자 요약 */
export function summarizeDay(tasksByMember = {}) {
  let total = 0
  let done = 0
  const memberIds = []

  for (const [memberId, list] of Object.entries(tasksByMember)) {
    if (!list?.length) continue
    memberIds.push(memberId)
    total += list.length
    done += list.filter(t => t.done).length
  }

  return { total, done, memberIds }
}

/** 활성 팀원 중 일일 업무를 제출한 인원 수 (업무 1건 이상) */
export function countDailySubmissions(tasksByMember = {}, activeMemberIds = []) {
  const total = activeMemberIds.length
  let submitted = 0
  for (const id of activeMemberIds) {
    if ((tasksByMember[id] || []).length > 0) submitted++
  }
  return { submitted, total }
}

export function formatDailySubmission(submitted, total) {
  if (!total) return '팀원 없음'
  return `${total}명 중 ${submitted}명 제출`
}

/** 날짜별 맵에서 멤버별 업무 배열 (정렬: 등록 시간) */
export function dayTasksGrouped(tasksByMember = {}, memberMap = {}) {
  const groups = []

  for (const [memberId, list] of Object.entries(tasksByMember)) {
    if (!list?.length) continue
    const member = memberMap[memberId]
    const sorted = [...list].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return ta - tb
    })
    groups.push({
      memberId: memberId === '_orphan' ? '' : memberId,
      memberName: member?.name || (memberId && memberId !== '_orphan' ? '(삭제된 팀원)' : '(담당자 없음)'),
      memberColor: member?.color || '#6b778c',
      memberLabel: member?.label || '',
      tasks: sorted,
    })
  }

  return groups.sort((a, b) => a.memberName.localeCompare(b.memberName, 'ko'))
}
