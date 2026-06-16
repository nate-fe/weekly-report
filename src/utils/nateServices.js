export const NATE_SERVICES = [
  '메인',
  '뉴스',
  '판',
  '메일',
  '온딜',
  'TV',
  '네이트온',
  '팀룸',
  '고객센터',
  '네이트오늘',
  'DA/SA',
  '로고 스페셜',
  'EMS',
  '회원',
  '체인지미',
  'MMCS',
  '회사홈페이지',
  '숏폼',
  '만화',
  '운세',
  '게임',
  '쇼핑',
  '네이트뷰',
  '자동차',
]

export const NATE_PLATFORMS = ['PC', '모바일']

const SERVICES_BY_LENGTH = [...NATE_SERVICES].sort((a, b) => b.length - a.length)

/** 플랫폼 배열 정규화 (순서: PC → 모바일) */
export function normalizePlatforms(platforms, legacyPlatform) {
  const selected = new Set()

  if (Array.isArray(platforms)) {
    platforms.forEach(p => {
      if (NATE_PLATFORMS.includes(p)) selected.add(p)
    })
  }

  if (!selected.size && legacyPlatform) {
    if (NATE_PLATFORMS.includes(legacyPlatform)) {
      selected.add(legacyPlatform)
    } else {
      for (const p of NATE_PLATFORMS) {
        if (legacyPlatform === p || legacyPlatform.startsWith(`${p} `)) {
          selected.add(p)
        }
      }
    }
  }

  return NATE_PLATFORMS.filter(p => selected.has(p))
}

/** 저장된 업무명 → 서비스·플랫폼·상세 */
export function parseTaskName(name = '') {
  let rest = (name || '').trim()
  let service = ''
  const platforms = []

  for (const s of SERVICES_BY_LENGTH) {
    if (rest === s || rest.startsWith(`${s} `)) {
      service = s
      rest = rest === s ? '' : rest.slice(s.length).trim()
      break
    }
  }

  for (const p of NATE_PLATFORMS) {
    if (rest === p || rest.startsWith(`${p} `)) {
      platforms.push(p)
      rest = rest === p ? '' : rest.slice(p.length).trim()
    }
  }

  return { service, platforms, nameDetail: rest }
}

/** 서비스·플랫폼·상세 → 업무명 */
export function composeTaskName(service, platforms, nameDetail) {
  const ordered = normalizePlatforms(platforms)
  return [service, ...ordered, (nameDetail || '').trim()].filter(Boolean).join(' ')
}

/** task에 서비스 필드 정규화 */
export function normalizeTaskNameFields(task) {
  const parsed = parseTaskName(task?.name)
  const service = task?.service || parsed.service
  const platforms = normalizePlatforms(
    task?.platforms ?? parsed.platforms,
    task?.platform,
  )
  const nameDetail = task?.nameDetail ?? parsed.nameDetail
  return {
    service,
    platforms,
    nameDetail,
    name: composeTaskName(service, platforms, nameDetail) || (task?.name || '').trim(),
  }
}

/** 이름 필드 변경 시 task 패치 */
export function patchTaskNameFields(task, patch) {
  const service = patch.service !== undefined ? patch.service : (task.service || '')
  const platforms = patch.platforms !== undefined
    ? normalizePlatforms(patch.platforms)
    : normalizePlatforms(task.platforms ?? parseTaskName(task.name).platforms, task.platform)
  const nameDetail = patch.nameDetail !== undefined ? patch.nameDetail : (task.nameDetail || '')
  const name = composeTaskName(service, platforms, nameDetail)
  return { service, platforms, nameDetail, name }
}

export function formatTaskDisplayName(task) {
  const { service, platforms, nameDetail, name } = normalizeTaskNameFields(task || {})
  return name || composeTaskName(service, platforms, nameDetail) || ''
}

/** PC/모바일 텍스트 (복사·라벨용) */
export function formatPlatformParen(platforms) {
  const plats = normalizePlatforms(platforms)
  if (plats.length === 2) return 'PC/모바일'
  if (plats.length === 1) return plats[0]
  return ''
}

/** 달력 팝업 표시용 — PC/모바일 뱃지 + 서비스명 텍스트 */
export function formatPlatformServiceLabel(service, platforms) {
  const svc = (service || '').trim()
  const plat = formatPlatformParen(platforms)
  if (!svc && !plat) return ''
  if (plat && svc) return `${plat} ${svc}`
  return plat || svc
}

/** 클립보드 복사용 — [PC/모바일 서비스명] */
export function formatPlatformServiceCopyLabel(service, platforms) {
  const svc = (service || '').trim()
  const plat = formatPlatformParen(platforms)
  if (!svc && !plat) return ''
  if (plat && svc) return `[${plat} ${svc}]`
  if (plat) return `[${plat}]`
  return `[${svc}]`
}

/** 플랫폼 토글 */
export function togglePlatform(platforms, platform) {
  const current = normalizePlatforms(platforms)
  if (current.includes(platform)) {
    return current.filter(p => p !== platform)
  }
  return NATE_PLATFORMS.filter(p => current.includes(p) || p === platform)
}
