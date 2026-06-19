import { supabase } from '../lib/supabase'
import { normalizeDateStr } from './dates'
import { normalizeEmployeeId, employeeIdValidationError } from './employeeId'
import { normalizeMemoPages, isPersonalMemoSchemaError } from './personalMemo'

export const SCHEDULE_TYPES = [
  { value: 'meeting', label: '회의' },
  { value: 'live', label: '라이브' },
]

const SCHEMA_MIGRATION_HINT = [
  'personal_memos 테이블에 schedules 컬럼이 필요합니다.',
  'Supabase Dashboard → SQL Editor에서',
  'supabase/migrate-personal-schedules.sql 내용을 실행해 주세요.',
]

let _uid = Date.now()

export function scheduleUid() {
  return `ps-${++_uid}`
}

export function personalScheduleSchemaMigrationMessages() {
  return SCHEMA_MIGRATION_HINT
}

export function scheduleTypeLabel(type) {
  return type === 'live' ? '라이브' : '회의'
}

export function createPersonalSchedule({
  type = 'meeting',
  title = '',
  date = '',
  time = '',
  memo = '',
} = {}) {
  return normalizePersonalSchedule({
    id: scheduleUid(),
    type,
    title,
    date,
    time,
    memo,
    updatedAt: new Date().toISOString(),
  })
}

export function patchPersonalSchedule(existing, fields = {}) {
  if (!existing?.id) return null
  const merged = normalizePersonalSchedule({
    ...existing,
    ...fields,
    id: existing.id,
    employeeId: existing.employeeId,
    updatedAt: new Date().toISOString(),
  })
  return merged
}

export function normalizePersonalSchedule(raw) {
  if (!raw || typeof raw !== 'object') return null
  const date = normalizeDateStr(raw.date)
  if (!date) return null
  const title = (raw.title || '').trim()
  if (!title) return null
  const employeeId = raw.employeeId ? normalizeEmployeeId(raw.employeeId) : ''
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : scheduleUid(),
    type: raw.type === 'live' ? 'live' : 'meeting',
    title,
    date,
    time: (raw.time || '').trim(),
    memo: (raw.memo || '').trim(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    ...(employeeId ? { employeeId } : {}),
  }
}

export function normalizePersonalSchedules(rawSchedules) {
  if (!Array.isArray(rawSchedules)) return []
  return rawSchedules.map(normalizePersonalSchedule).filter(Boolean)
}

export function schedulesOnDate(schedules, dateStr) {
  const date = normalizeDateStr(dateStr)
  if (!date) return []
  return (schedules || [])
    .filter(s => s.date === date)
    .sort((a, b) => (a.time || '').localeCompare(b.time || '') || a.title.localeCompare(b.title, 'ko'))
}

/** 본인(employeeId)이 등록한 일정만 수정·삭제 가능 */
export function canEditPersonalSchedule(schedule, employeeId) {
  if (!employeeId || !schedule?.id) return false
  if (!schedule.employeeId) return false
  return normalizeEmployeeId(schedule.employeeId) === normalizeEmployeeId(employeeId)
}

function assertEmployeeId(employeeId) {
  const err = employeeIdValidationError(employeeId)
  if (err) throw new Error(err)
  return normalizeEmployeeId(employeeId)
}

function handleSchemaError(error) {
  if (isPersonalMemoSchemaError(error) || (error?.message || '').includes('schedules')) {
    const err = new Error('SCHEMA')
    err.code = error.code
    throw err
  }
  throw error
}

export async function checkPersonalScheduleSchema() {
  const { error } = await supabase
    .from('personal_memos')
    .select('employee_id, schedules')
    .limit(0)
  return !error
}

async function fetchPersonalMemoRow(employeeId) {
  const id = assertEmployeeId(employeeId)
  const { data, error } = await supabase
    .from('personal_memos')
    .select('pages, content, schedules, updated_at')
    .eq('employee_id', id)
    .maybeSingle()
  if (error) handleSchemaError(error)
  return data
}

export async function fetchPersonalSchedules(employeeId) {
  const data = await fetchPersonalMemoRow(employeeId)
  const id = assertEmployeeId(employeeId)
  return normalizePersonalSchedules(data?.schedules).map(schedule => ({
    ...schedule,
    employeeId: id,
  }))
}

export async function fetchAllTeamSchedules() {
  const { data, error } = await supabase
    .from('personal_memos')
    .select('employee_id, schedules')
  if (error) handleSchemaError(error)

  const all = []
  for (const row of data || []) {
    const employeeId = normalizeEmployeeId(row.employee_id)
    if (!employeeId) continue
    for (const schedule of normalizePersonalSchedules(row.schedules)) {
      all.push({ ...schedule, employeeId })
    }
  }

  return all.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date)
    if (dateCmp !== 0) return dateCmp
    const timeCmp = (a.time || '').localeCompare(b.time || '')
    if (timeCmp !== 0) return timeCmp
    return a.title.localeCompare(b.title, 'ko')
  })
}

export async function savePersonalSchedules(employeeId, schedules) {
  const id = assertEmployeeId(employeeId)
  const updatedAt = new Date().toISOString()
  const normalized = normalizePersonalSchedules(schedules)
  const existing = await fetchPersonalMemoRow(employeeId)
  const pages = normalizeMemoPages(existing?.pages, existing?.content)

  const { error } = await supabase.from('personal_memos').upsert({
    employee_id: id,
    pages,
    schedules: normalized,
    content: '',
    updated_at: updatedAt,
  })

  if (error) handleSchemaError(error)
  return normalized
}
