import {
  formatPlatformServiceLabel,
  formatPlatformServiceCopyLabel,
  normalizePlatforms,
  parseTaskName,
} from './nateServices'

export function entryFieldsFromItem(item) {
  if (item.service !== undefined || item.platforms !== undefined || item.taskTitle !== undefined) {
    return {
      service: item.service || '',
      platforms: normalizePlatforms(item.platforms),
      nameDetail: item.taskTitle?.trim() || '',
    }
  }
  return parseTaskName(item.taskName)
}

function taskTitleFromItem(item) {
  const { nameDetail } = entryFieldsFromItem(item)
  return nameDetail?.trim() || ''
}

/** 팀원별 달력 일자 팝업 — 표시·복사용 업무 목록 (taskId 기준 중복 제거) */
export function dayEntriesForGroup(items = []) {
  const seen = new Set()
  const entries = []

  for (const item of items) {
    const { service, platforms } = entryFieldsFromItem(item)
    const title = taskTitleFromItem(item)
    const label = formatPlatformServiceLabel(service, platforms)
    const key = item.taskId || `${label}:${title}`
    if (seen.has(key)) continue
    seen.add(key)

    if (!label && !title) continue

    entries.push({ key, service, platforms, title, label })
  }

  return entries
}

function formatMemberDayBlock(group) {
  const entries = dayEntriesForGroup(group.items)
  if (!entries.length) return ''

  const lines = [group.memberName]
  for (const entry of entries) {
    const copyLabel = formatPlatformServiceCopyLabel(entry.service, entry.platforms)
    if (copyLabel) lines.push(copyLabel)
    if (entry.title) lines.push(entry.title)
  }
  return lines.join('\n')
}

/** 달력 일자 팝업 — 클립보드용 텍스트 */
export function formatDayCopyText(groups = []) {
  return groups
    .map(formatMemberDayBlock)
    .filter(Boolean)
    .join('\n\n')
}
