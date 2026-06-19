import { supabase } from '../lib/supabase'
import { normalizeEmployeeId, employeeIdValidationError } from './employeeId'

const MEMO_SCHEMA_MIGRATION_HINT = [
  'personal_memos 테이블에 pages 컬럼이 필요합니다.',
  'Supabase Dashboard → SQL Editor에서',
  'supabase/migrate-personal-memo-pages.sql 내용을 실행해 주세요.',
]

let _pageUid = Date.now()

export function memoPageUid() {
  return `mp-${++_pageUid}`
}

export function createMemoPage({ title = '새 페이지', content = '' } = {}) {
  const now = new Date().toISOString()
  return {
    id: memoPageUid(),
    title,
    content,
    updatedAt: now,
  }
}

export function normalizeMemoPage(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = typeof raw.id === 'string' && raw.id ? raw.id : memoPageUid()
  const title = typeof raw.title === 'string' ? raw.title : '제목 없음'
  const content = typeof raw.content === 'string' ? raw.content : ''
  const updatedAt = typeof raw.updatedAt === 'string'
    ? raw.updatedAt
    : new Date().toISOString()
  return { id, title, content, updatedAt }
}

export function normalizeMemoPages(rawPages, legacyContent = '') {
  if (Array.isArray(rawPages) && rawPages.length > 0) {
    return rawPages
      .map(normalizeMemoPage)
      .filter(Boolean)
  }

  const trimmed = (legacyContent || '').trim()
  if (trimmed) {
    return [createMemoPage({ title: '메모', content: trimmed })]
  }

  return []
}

export function personalMemoSchemaMigrationMessages() {
  return MEMO_SCHEMA_MIGRATION_HINT
}

export async function checkPersonalMemoSchema() {
  const { error } = await supabase
    .from('personal_memos')
    .select('employee_id, pages, schedules')
    .limit(0)
  return !error
}

export function isPersonalMemoSchemaError(error) {
  const msg = error?.message || ''
  return msg.includes('personal_memos') || error?.code === 'PGRST204'
}

function assertEmployeeId(employeeId) {
  const err = employeeIdValidationError(employeeId)
  if (err) throw new Error(err)
  return normalizeEmployeeId(employeeId)
}

function handleSchemaError(error) {
  if (isPersonalMemoSchemaError(error)) {
    const err = new Error('SCHEMA')
    err.code = error.code
    throw err
  }
  throw error
}

export async function fetchPersonalMemoPages(employeeId) {
  const id = assertEmployeeId(employeeId)

  const { data, error } = await supabase
    .from('personal_memos')
    .select('pages, content, updated_at')
    .eq('employee_id', id)
    .maybeSingle()

  if (error) handleSchemaError(error)

  const pages = normalizeMemoPages(data?.pages, data?.content)

  return {
    pages,
    updatedAt: data?.updated_at || null,
  }
}

export async function savePersonalMemoPages(employeeId, pages) {
  const id = assertEmployeeId(employeeId)
  const updatedAt = new Date().toISOString()
  const normalized = (pages || [])
    .map(normalizeMemoPage)
    .filter(Boolean)
    .map(page => ({
      ...page,
      updatedAt: page.updatedAt || updatedAt,
    }))

  const { data: existing } = await supabase
    .from('personal_memos')
    .select('schedules')
    .eq('employee_id', id)
    .maybeSingle()

  const schedules = Array.isArray(existing?.schedules) ? existing.schedules : []

  const { error } = await supabase.from('personal_memos').upsert({
    employee_id: id,
    pages: normalized,
    schedules,
    content: '',
    updated_at: updatedAt,
  })

  if (error) handleSchemaError(error)
  return { pages: normalized, updatedAt }
}

export async function deleteAllPersonalMemoPages(employeeId) {
  const id = assertEmployeeId(employeeId)

  const { error } = await supabase
    .from('personal_memos')
    .delete()
    .eq('employee_id', id)

  if (error) throw error
}

// 하위 호환
export async function fetchPersonalMemo(employeeId) {
  const { pages, updatedAt } = await fetchPersonalMemoPages(employeeId)
  return {
    content: pages.map(p => p.content).join('\n\n'),
    updatedAt,
    pages,
  }
}

export async function savePersonalMemo(employeeId, content) {
  const { pages } = await fetchPersonalMemoPages(employeeId)
  const nextPages = pages.length
    ? [{ ...pages[0], content, updatedAt: new Date().toISOString() }, ...pages.slice(1)]
    : [createMemoPage({ title: '메모', content })]
  const result = await savePersonalMemoPages(employeeId, nextPages)
  return result.updatedAt
}

export async function deletePersonalMemo(employeeId) {
  return deleteAllPersonalMemoPages(employeeId)
}
