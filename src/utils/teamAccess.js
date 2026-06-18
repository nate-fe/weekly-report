import { createElement } from 'react'
import {
  normalizeEmployeeId,
  isValidEmployeeId,
  employeeIdValidationError,
} from './employeeId'

const STORAGE_KEY = 'weekly-report-team-access-employee-id'

export function normalizeMemberName(value) {
  return (value || '').trim()
}

export function getStoredTeamAccessEmployeeId() {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? normalizeEmployeeId(raw) : ''
}

export function storeTeamAccessEmployeeId(employeeId) {
  const id = normalizeEmployeeId(employeeId)
  if (!isValidEmployeeId(id)) return ''
  localStorage.setItem(STORAGE_KEY, id)
  return id
}

export function clearTeamAccessEmployeeId() {
  localStorage.removeItem(STORAGE_KEY)
}

export function memberEmployeeIds(members) {
  return (members || [])
    .map(m => normalizeEmployeeId(m.employee_id))
    .filter(id => isValidEmployeeId(id))
}

export function findMemberByEmployeeId(members, employeeId) {
  const id = normalizeEmployeeId(employeeId)
  if (!isValidEmployeeId(id)) return null
  return (members || []).find(m => normalizeEmployeeId(m.employee_id) === id) ?? null
}

const LEADER_EMPLOYEE_IDS = new Set(['N1664'])

export function isTeamLeader(member) {
  if (!member) return false
  if (member.role === '팀장') return true
  const id = normalizeEmployeeId(member.employee_id)
  return LEADER_EMPLOYEE_IDS.has(id) || member.name === '이상원'
}

export function memberRoleHonorific(member) {
  if (!member) return '매니저님'
  if (isTeamLeader(member)) return '팀장님'
  return '매니저님'
}

export function memberGreeting(member) {
  if (!member?.name) return null

  return createElement(
    'p',
    { className: 'header-greeting' },
    createElement(
      'span',
      { className: 'header-greeting-strong' },
      `${member.name} ${memberRoleHonorific(member)}`,
    ),
    ' 오늘도 좋은 하루 보내세요!',
  )
}

export function isTeamEmployeeIdAllowed(employeeId, members) {
  const id = normalizeEmployeeId(employeeId)
  if (!isValidEmployeeId(id)) return false
  return memberEmployeeIds(members).includes(id)
}

export function verifyTeamAccessInput(employeeIdInput, members) {
  const formatErr = employeeIdValidationError(employeeIdInput)
  if (formatErr) return { ok: false, message: formatErr }

  const id = normalizeEmployeeId(employeeIdInput)
  const allowed = memberEmployeeIds(members)
  if (!allowed.length) {
    return {
      ok: false,
      message: '등록된 팀원 사번이 없습니다. 팀원 관리 DB 마이그레이션을 확인해 주세요.',
    }
  }
  if (!allowed.includes(id)) {
    return {
      ok: false,
      message: '등록된 팀원 사번이 아닙니다. UI팀 팀원만 이용할 수 있습니다.',
    }
  }
  return { ok: true, employeeId: id }
}

export function memberNameValidationError(value) {
  if (!normalizeMemberName(value)) return '이름을 입력해 주세요.'
  return ''
}

export function isRegisteredTeamMember(name, employeeId, members) {
  const id = normalizeEmployeeId(employeeId)
  const trimmed = normalizeMemberName(name)
  if (!trimmed || !isValidEmployeeId(id)) return false
  return (members || []).some(
    m => normalizeMemberName(m.name) === trimmed && normalizeEmployeeId(m.employee_id) === id,
  )
}
