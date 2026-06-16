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
