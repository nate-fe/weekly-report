export const EMPLOYEE_ID_PATTERN = /^N\d{4}$/
export const EMPLOYEE_ID_INPUT_PATTERN = /^[Nn]\d{4}$/

/** 저장·비교용 — 항상 N + 숫자 4자리 */
export function normalizeEmployeeId(value) {
  const raw = (value || '').trim()
  if (/^N\d{4}$/.test(raw)) return raw
  if (/^n\d{4}$/.test(raw)) return `N${raw.slice(1)}`
  return ''
}

export function isValidEmployeeId(value) {
  return EMPLOYEE_ID_PATTERN.test(normalizeEmployeeId(value))
}

/** 입장·등록 직전 검증 — 입력값이 N1234 / n1234 형식인지 */
export function employeeIdValidationError(value) {
  const raw = (value || '').trim()
  if (!raw) return '사번을 입력해 주세요.'
  if (!EMPLOYEE_ID_INPUT_PATTERN.test(raw)) {
    return '사번은 N/n과 숫자 4자리 형식입니다. (예: N1234, n1234)'
  }
  return ''
}
