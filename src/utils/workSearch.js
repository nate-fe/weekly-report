import { normalizeTaskNameFields } from './nateServices'
import { rangesOverlap } from './weeklyTask'

export function buildAssigneeOptions(members = [], tasks = []) {
  const activeIds = new Set(members.map(m => m.id))
  const options = members.map(m => ({
    id: m.id,
    name: m.name,
    color: m.color,
    deleted: false,
  }))

  const orphanIds = [...new Set(
    tasks.map(t => t.memberId).filter(id => id && !activeIds.has(id))
  )]

  for (const id of orphanIds) {
    const task = tasks.find(t => t.memberId === id)
    options.push({
      id,
      name: task?.assignee?.trim() || '(삭제된 팀원)',
      color: '#6b778c',
      deleted: true,
    })
  }

  return options.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

export function taskMatchesFilters(task, filters = {}) {
  const { service = '', memberId = '', periodFrom = '', periodTo = '' } = filters
  const fields = normalizeTaskNameFields(task)

  if (service && fields.service !== service) return false
  if (memberId && task.memberId !== memberId) return false

  if (periodFrom || periodTo) {
    const filterFrom = periodFrom || periodTo
    const filterTo = periodTo || periodFrom
    const works = task.works || []
    const matched = works.some(work => {
      const from = work.from || work.to
      const to = work.to || work.from
      if (!from && !to) return false
      return rangesOverlap(from, to, filterFrom, filterTo)
    })
    if (!matched) return false
  }

  return true
}

export function filterWeeklyTasks(tasks = [], filters = {}) {
  return tasks.filter(task => taskMatchesFilters(task, filters))
}

export function matchingWorksInPeriod(task, periodFrom, periodTo) {
  if (!periodFrom && !periodTo) return task.works || []
  const filterFrom = periodFrom || periodTo
  const filterTo = periodTo || periodFrom
  return (task.works || []).filter(work => {
    const from = work.from || work.to
    const to = work.to || work.from
    if (!from && !to) return false
    return rangesOverlap(from, to, filterFrom, filterTo)
  })
}
