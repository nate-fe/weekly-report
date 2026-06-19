import { supabase } from '../lib/supabase'
import { normalizeEmployeeId, employeeIdValidationError } from './employeeId'

const SCHEMA_MIGRATION_HINT = [
  'idea_posts 테이블이 필요합니다.',
  'Supabase Dashboard → SQL Editor에서',
  'supabase/migrate-idea-board.sql 내용을 실행해 주세요.',
]

/** 400자 이하 */
export const IDEA_CONTENT_MAX_LENGTH = 400

export function ideaContentValidationError(content) {
  const trimmed = (content || '').trim()
  if (!trimmed) return '내용을 입력해 주세요.'
  if (trimmed.length > IDEA_CONTENT_MAX_LENGTH) {
    return `400자 이하로 작성해 주세요. (현재 ${trimmed.length}자)`
  }
  return null
}

export const IDEA_NOTE_COLORS = [
  '#fff9c4',
  '#fce4ec',
  '#e3f2fd',
  '#e8f5e9',
  '#f3e5f5',
  '#fff3e0',
  '#f1f8e9',
  '#e0f7fa',
  '#fce4ec',
]

let _uid = Date.now()

export function ideaUid() {
  return `idea-${++_uid}`
}

export function ideaBoardSchemaMigrationMessages() {
  return SCHEMA_MIGRATION_HINT
}

export function isIdeaBoardSchemaError(error) {
  const msg = error?.message || ''
  return msg.includes('idea_posts') || error?.code === 'PGRST204'
}

export function noteColorIndex(id, fallback = 0) {
  if (!id) return fallback % IDEA_NOTE_COLORS.length
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return hash % IDEA_NOTE_COLORS.length
}

export function noteColor(id, colorIndex) {
  const idx = typeof colorIndex === 'number'
    ? colorIndex % IDEA_NOTE_COLORS.length
    : noteColorIndex(id)
  return IDEA_NOTE_COLORS[idx]
}

export function normalizeIdeaPost(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = typeof raw.id === 'string' && raw.id ? raw.id : ideaUid()
  const content = typeof raw.content === 'string' ? raw.content.trim() : ''
  if (!content) return null
  const employeeId = raw.employeeId || raw.employee_id
    ? normalizeEmployeeId(raw.employeeId || raw.employee_id)
    : ''
  if (!employeeId) return null
  const colorIndex = Number.isFinite(raw.colorIndex ?? raw.color_index)
    ? Number(raw.colorIndex ?? raw.color_index) % IDEA_NOTE_COLORS.length
    : noteColorIndex(id)
  return {
    id,
    employeeId,
    content,
    colorIndex,
    createdAt: typeof raw.createdAt === 'string'
      ? raw.createdAt
      : (raw.created_at || new Date().toISOString()),
    updatedAt: typeof raw.updatedAt === 'string'
      ? raw.updatedAt
      : (raw.updated_at || raw.createdAt || raw.created_at || new Date().toISOString()),
  }
}

export function canEditIdea(idea, employeeId) {
  if (!employeeId || !idea?.id) return false
  if (!idea.employeeId) return false
  return normalizeEmployeeId(idea.employeeId) === normalizeEmployeeId(employeeId)
}

function assertEmployeeId(employeeId) {
  const err = employeeIdValidationError(employeeId)
  if (err) throw new Error(err)
  return normalizeEmployeeId(employeeId)
}

function handleSchemaError(error) {
  if (isIdeaBoardSchemaError(error)) {
    const err = new Error('SCHEMA')
    err.code = error.code
    throw err
  }
  throw error
}

export async function checkIdeaBoardSchema() {
  const { error } = await supabase
    .from('idea_posts')
    .select('id, employee_id, content, color_index, created_at, updated_at')
    .limit(0)
  return !error
}

export async function fetchIdeas() {
  const { data, error } = await supabase
    .from('idea_posts')
    .select('id, employee_id, content, color_index, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) handleSchemaError(error)

  return (data || [])
    .map(row => normalizeIdeaPost({
      id: row.id,
      employeeId: row.employee_id,
      content: row.content,
      colorIndex: row.color_index,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
    .filter(Boolean)
}

export async function insertIdea(employeeId, { content }) {
  const id = assertEmployeeId(employeeId)
  const trimmed = (content || '').trim()
  const validationError = ideaContentValidationError(trimmed)
  if (validationError) throw new Error(validationError)

  const now = new Date().toISOString()
  const postId = ideaUid()
  const colorIndex = noteColorIndex(postId)

  const { data, error } = await supabase
    .from('idea_posts')
    .insert({
      id: postId,
      employee_id: id,
      content: trimmed,
      color_index: colorIndex,
      created_at: now,
      updated_at: now,
    })
    .select('id, employee_id, content, color_index, created_at, updated_at')
    .single()

  if (error) handleSchemaError(error)
  return normalizeIdeaPost({
    id: data.id,
    employeeId: data.employee_id,
    content: data.content,
    colorIndex: data.color_index,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  })
}

export async function updateIdea(employeeId, idea) {
  const id = assertEmployeeId(employeeId)
  const trimmed = (idea?.content || '').trim()
  const validationError = ideaContentValidationError(trimmed)
  if (validationError) throw new Error(validationError)
  const normalized = normalizeIdeaPost({ ...idea, content: trimmed, employeeId: idea?.employeeId || id })
  if (!normalized) throw new Error('수정할 아이디어를 확인할 수 없습니다.')
  if (!canEditIdea(normalized, id)) throw new Error('본인이 작성한 글만 수정할 수 있습니다.')

  const updatedAt = new Date().toISOString()

  const { data, error } = await supabase
    .from('idea_posts')
    .update({
      content: normalized.content,
      updated_at: updatedAt,
    })
    .eq('id', normalized.id)
    .eq('employee_id', id)
    .select('id, employee_id, content, color_index, created_at, updated_at')
    .single()

  if (error) handleSchemaError(error)
  return normalizeIdeaPost({
    id: data.id,
    employeeId: data.employee_id,
    content: data.content,
    colorIndex: data.color_index,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  })
}

export async function deleteIdea(employeeId, ideaId) {
  const id = assertEmployeeId(employeeId)
  if (!ideaId) throw new Error('삭제할 아이디어를 확인할 수 없습니다.')

  const { error } = await supabase
    .from('idea_posts')
    .delete()
    .eq('id', ideaId)
    .eq('employee_id', id)

  if (error) handleSchemaError(error)
}
