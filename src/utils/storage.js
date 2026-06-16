/**
 * storage.js — Supabase 기반 데이터 접근 레이어
 *
 * 모든 함수는 async 이며 에러 시 throw 합니다.
 * 컴포넌트에서는 낙관적 업데이트(UI 먼저) 후 이 함수를 호출하세요.
 */
import { supabase } from '../lib/supabase'
import { taskFromRow, taskToRow, normalizeWorkEntry } from './weeklyTask'
import { normalizeDateStr } from './dates'
import { normalizeTaskNameFields } from './nateServices'

// ── 팀원 ─────────────────────────────────────────────────────

const MEMBERS_SCHEMA_MIGRATION_HINT = [
  'members 테이블에 label 컬럼이 없습니다.',
  'Supabase Dashboard → SQL Editor에서 아래 SQL을 실행해 주세요.',
  "alter table members add column if not exists label text not null default 'FE개발';",
]

/** members.label 컬럼 존재 여부 */
export async function checkMembersSchema() {
  const { error } = await supabase.from('members').select('label').limit(0)
  return !error
}

export function isMembersSchemaError(error) {
  const msg = error?.message || ''
  return (msg.includes('label') && msg.includes('schema cache')) || error?.code === 'PGRST204'
}

export function membersSchemaMigrationMessages() {
  return MEMBERS_SCHEMA_MIGRATION_HINT
}

/** 활성 팀원 목록 반환 (삭제된 팀원 제외) */
export async function fetchMembers() {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .is('deleted_at', null)
    .order('created_at')
  if (error?.code === 'PGRST204' && (error.message || '').includes('deleted_at')) {
    const res = await supabase.from('members').select('*').order('created_at')
    if (res.error) throw res.error
    return res.data ?? []
  }
  if (error) throw error
  return data ?? []
}

/** ID 목록으로 팀원 조회 (삭제된 팀원 포함) */
export async function fetchMembersByIds(ids) {
  if (!ids?.length) return []
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .in('id', ids)
  if (error) throw error
  return data ?? []
}

/** 팀원 추가 */
export async function insertMember(member) {
  const base = {
    id: member.id,
    name: member.name,
    color: member.color,
  }
  let { error } = await supabase.from('members').insert({
    ...base,
    label: member.label || 'FE개발',
  })
  if (error && isMembersSchemaError(error)) {
    ;({ error } = await supabase.from('members').insert(base))
  }
  if (error) throw error
}

/** 팀원 레이블 수정 */
export async function updateMemberLabel(id, label) {
  const { error } = await supabase.from('members').update({ label }).eq('id', id)
  if (error) {
    if (isMembersSchemaError(error)) {
      const err = new Error('label 컬럼이 없습니다. Supabase에서 migrate-members.sql을 실행해 주세요.')
      err.code = error.code
      throw err
    }
    throw error
  }
}

/** 팀원 컬러 수정 */
export async function updateMemberColor(id, color) {
  const { error } = await supabase.from('members').update({ color }).eq('id', id)
  if (error) throw error
}

/** 팀원 삭제 (soft delete — 일일·주간 업무 기록은 유지) */
export async function deleteMember(id) {
  const { error } = await supabase
    .from('members')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error?.code === 'PGRST204' && (error.message || '').includes('deleted_at')) {
    const err = new Error('deleted_at 컬럼이 없습니다. Supabase에서 migrate-member-soft-delete.sql을 실행해 주세요.')
    err.code = error.code
    throw err
  }
  if (error) throw error
}

// ── 주간 보고 ────────────────────────────────────────────────

const SCHEMA_MIGRATION_HINT = [
  'weekly_tasks 테이블에 works 컬럼이 없습니다.',
  'Supabase Dashboard → SQL Editor에서',
  'supabase/migrate-weekly-works.sql 내용을 실행해 주세요.',
]

const DRAFT_SCHEMA_MIGRATION_HINT = [
  'weekly_drafts 테이블이 없습니다.',
  'Supabase Dashboard → SQL Editor에서',
  'supabase/migrate-weekly-drafts.sql 내용을 실행해 주세요.',
]

/** 주간 업무 works 컬럼 존재 여부 */
export async function checkWeeklyTasksSchema() {
  const { error } = await supabase
    .from('weekly_tasks')
    .select('works')
    .limit(0)
  return !error
}

export function isWeeklySchemaError(error) {
  const msg = error?.message || ''
  return msg.includes('schema cache') || msg.includes('works') || msg.includes('curr_from') || error?.code === 'PGRST204'
}

export function weeklySchemaMigrationMessages() {
  return SCHEMA_MIGRATION_HINT
}

export function weeklyDraftSchemaMigrationMessages() {
  return DRAFT_SCHEMA_MIGRATION_HINT
}

/** weekly_drafts 테이블 존재 여부 */
export async function checkWeeklyDraftsSchema() {
  const { error } = await supabase
    .from('weekly_drafts')
    .select('week_key')
    .limit(0)
  return !error
}

export function isWeeklyDraftSchemaError(error) {
  const msg = error?.message || ''
  return msg.includes('weekly_drafts') || error?.code === 'PGRST204'
}

function normalizeDraftTask(t) {
  const fields = normalizeTaskNameFields(t)
  return {
    id: t?.id || '',
    memberId: t?.memberId || t?.member_id || '',
    assignee: t?.assignee || '',
    service: fields.service,
    platforms: fields.platforms,
    nameDetail: fields.nameDetail,
    name: fields.name,
    works: (t?.works || []).map(normalizeWorkEntry),
    target: {
      date: normalizeDateStr(t?.target?.date) || '',
      memo: t?.target?.memo || '',
    },
  }
}

function draftFromRow(row) {
  const tasks = (Array.isArray(row.tasks) ? row.tasks : []).map(normalizeDraftTask)
  return {
    savedAt: row.updated_at,
    record: {
      from: normalizeDateStr(row.from_date),
      to: normalizeDateStr(row.to_date),
      tasks,
    },
  }
}

/** 주간 업무 임시 저장 불러오기 */
export async function fetchWeeklyDraft(weekKey) {
  const { data, error } = await supabase
    .from('weekly_drafts')
    .select('*')
    .eq('week_key', weekKey)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return draftFromRow(data)
}

/** 주간 업무 임시 저장 (검증 없음) */
export async function upsertWeeklyDraft(weekKey, record) {
  const updated_at = new Date().toISOString()
  const { error } = await supabase.from('weekly_drafts').upsert({
    week_key: weekKey,
    from_date: record.from,
    to_date: record.to,
    tasks: record.tasks || [],
    updated_at,
  })
  if (error) throw error
  return updated_at
}

/** 주간 업무 임시 저장 삭제 */
export async function deleteWeeklyDraft(weekKey) {
  const { error } = await supabase
    .from('weekly_drafts')
    .delete()
    .eq('week_key', weekKey)
  if (error) throw error
}

/** 업무 데이터가 저장된 week_key 목록 반환 (weekly_tasks 기준) */
export async function fetchWeeklyKeys() {
  const { data, error } = await supabase
    .from('weekly_tasks')
    .select('week_key')
  if (error) throw error
  return [...new Set((data ?? []).map(r => r.week_key))]
}

/** 저장된 모든 주간 업무 반환 */
export async function fetchAllWeeklyTasks() {
  const { data, error } = await supabase
    .from('weekly_tasks')
    .select('*')
    .order('week_key')
    .order('order_index')
  if (error) throw error
  return (data ?? []).map(taskFromRow)
}

/**
 * 특정 주의 보고 내용 반환
 * @returns {{ from, to, tasks } | null}
 */
export async function fetchWeeklyRecord(weekKey) {
  const [recRes, taskRes] = await Promise.all([
    supabase.from('weekly_records').select('*').eq('week_key', weekKey).maybeSingle(),
    supabase.from('weekly_tasks').select('*').eq('week_key', weekKey).order('order_index'),
  ])

  if (recRes.error) throw recRes.error
  if (taskRes.error) throw taskRes.error
  if (!recRes.data) return null

  return {
    from:  normalizeDateStr(recRes.data.from_date),
    to:    normalizeDateStr(recRes.data.to_date),
    tasks: (taskRes.data ?? []).map(taskFromRow),
  }
}

/**
 * 주간 보고 저장 (upsert 헤더 + tasks 전체 교체)
 */
export async function upsertWeeklyRecord(weekKey, record) {
  // 1) 헤더 upsert
  const { error: hErr } = await supabase.from('weekly_records').upsert({
    week_key:   weekKey,
    from_date:  record.from,
    to_date:    record.to,
    updated_at: new Date().toISOString(),
  })
  if (hErr) throw hErr

  // 2) tasks 전체 교체
  const { error: tDelErr } = await supabase
    .from('weekly_tasks').delete().eq('week_key', weekKey)
  if (tDelErr) throw tDelErr

  if (record.tasks?.length) {
    const { error } = await supabase.from('weekly_tasks').insert(
      record.tasks.map((t, i) => taskToRow(t, weekKey, i))
    )
    if (error) throw error
  }
}
