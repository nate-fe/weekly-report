import { normalizePlatforms } from '../utils/nateServices'

/** PC/모바일 뱃지 + 서비스명 */
export default function ServicePlatformLabel({ service = '', platforms = [], className = '' }) {
  const svc = (service || '').trim()
  const plats = normalizePlatforms(platforms)

  if (!svc && !plats.length) return null

  return (
    <span className={`task-service-bracket ${className}`.trim()}>
      {plats.map(p => (
        <span
          key={p}
          className={`task-platform-badge ${p === 'PC' ? 'pc' : 'mobile'}`}
        >
          {p}
        </span>
      ))}
      {svc && <span className="task-service-name">{svc}</span>}
    </span>
  )
}
