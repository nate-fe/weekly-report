import * as XLSX from 'xlsx'
import {
  fmtRangeShort,
  groupWorksForView,
  WORK_VIEW_GROUPS,
  workSummary,
} from './weeklyTask'

/** 열 너비 설정 헬퍼 */
function colWidths(...wch) {
  return wch.map(w => ({ wch: w }))
}

/** 헤더 스타일 (배경 파란색) — xlsx community 버전에서는 스타일 미지원이므로 볼드 처리만 */
function headerRow(labels) {
  return labels
}

function worksCell(works, key) {
  const items = works[key] || []
  if (!items.length) return ''
  return items.map(work => {
    const s = workSummary(work)
    const meta = s.meta ? `[${s.meta}] ` : ''
    return `${meta}${s.content}`
  }).join('\n')
}

/**
 * 일일 업무 엑셀 다운로드
 * @param {string}   date       "YYYY-MM-DD"
 * @param {Array}    members    [{ id, name }]
 * @param {Object}   dailyTasks { [memberId]: [{ title, done, memo }] }
 */
export function exportDailyExcel(date, members, dailyTasks) {
  const seen = new Set()
  const uniqueMembers = members.filter(m => {
    if (!m?.id || seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })

  const rows = [headerRow(['팀원', '업무', '메모'])]

  uniqueMembers.forEach(member => {
    const tasks = dailyTasks[member.id] || []
    if (tasks.length === 0) {
      rows.push([member.name, '(등록된 업무 없음)', ''])
    } else {
      tasks.forEach((task, i) => {
        rows.push([
          i === 0 ? member.name : '',
          task.title || '',
          task.memo || '',
        ])
      })
    }
  })

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = colWidths(14, 40, 36)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `${date}`)
  XLSX.writeFile(wb, `일일업무_${date}.xlsx`)
}

/**
 * 주간 보고 엑셀 다운로드
 * @param {string} weekKey  "YYYY-Www"
 * @param {Object} record   { from, to, tasks: [] }
 */
export function exportWeeklyExcel(weekKey, record) {
  const wb = XLSX.utils.book_new()

  const taskRows = [
    headerRow([
      '담당자', '업무명', '목표 일정',
      '지난주 작업', '이번주 작업', '다음주 작업',
    ]),
  ]
  ;(record.tasks || []).forEach(t => {
    const grouped = groupWorksForView(t.works || [], record.from, record.to)
    taskRows.push([
      t.assignee || '',
      t.name     || '',
      t.target?.date || '',
      worksCell(grouped, 'last'),
      worksCell(grouped, 'curr'),
      worksCell(grouped, 'next'),
    ])
  })
  const wsTask = XLSX.utils.aoa_to_sheet(taskRows)
  wsTask['!cols'] = colWidths(10, 18, 12, 28, 28, 28)
  XLSX.utils.book_append_sheet(wb, wsTask, '업무목록')
  XLSX.writeFile(wb, `주간보고_${weekKey}.xlsx`)
}
