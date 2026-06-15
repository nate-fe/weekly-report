export const MEMBER_LABELS = ['디자인', 'FE개발']

/**
 * 팀원 식별용 프리셋 컬러 (36색, 유사 색상끼리 인접 배치)
 * 달력·아바타 등 배경 + 흰색(#fff) 텍스트 대비를 기준으로 채도·명도 선정
 */
export const MEMBER_COLORS = [
  // 블루 · 네이비 · 인디고 (진한 → 밝은)
  '#1e3a5f', '#0052cc', '#1d4ed8', '#2563eb', '#4f46e5',
  // 시안 (진한 → 밝은)
  '#0e7490', '#0891b2', '#0284c7',
  // 틸 · 그린 (진한 → 밝은)
  '#0d9488', '#15803d', '#00875a', '#059669', '#047857',
  // 퍼플 · 바이올렛 (진한 → 밝은)
  '#403294', '#6554c0', '#7c3aed', '#9333ea', '#6d28d9',
  // 핑크 · 로즈 · 마젠타 — 따뜻한 계열 (진한 → 밝은)
  '#831843', '#9d174d', '#a21caf', '#be185d', '#b83280', '#c026d3', '#db2777',
  // 레드 · 코랄 (진한 → 밝은)
  '#b91c1c', '#dc2626', '#be123c', '#de350b',
  // 오렌지 · 앰버 · 테라코타 — 따뜻한 계열 (진한 → 밝은)
  '#9a3412', '#c2410c', '#b45309', '#d97706', '#ea580c', '#a16207',
  // 뉴트럴
  '#334155',
]

const DEFAULT_MEMBER_COLOR = MEMBER_COLORS[0]

let _uid = Date.now()
export function memberUid() {
  return String(++_uid)
}

export function labelClass(label) {
  return label === '디자인' ? 'label-designer' : 'label-fe'
}

/** 아직 쓰이지 않은 색을 우선 배정, 없으면 순환 */
export function nextMemberColor(existingMembers = []) {
  const used = new Set(existingMembers.map(m => m.color))
  const available = MEMBER_COLORS.find(c => !used.has(c))
  return available ?? MEMBER_COLORS[existingMembers.length % MEMBER_COLORS.length]
}

export function normalizeMemberColor(color) {
  if (typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color.trim())) {
    return color.trim().toLowerCase()
  }
  return DEFAULT_MEMBER_COLOR
}
