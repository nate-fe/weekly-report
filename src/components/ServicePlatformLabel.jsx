import { normalizePlatforms } from '../utils/nateServices'

/** [서비스명 PC/모바일] — 플랫폼은 뱃지로 표시 */
export default function ServicePlatformLabel({ service = '', platforms = [], className = '' }) {
  const svc = (service || '').trim()
  const plats = normalizePlatforms(platforms)

  if (!svc && !plats.length) return null

  return (
    <span className={`task-service-bracket ${className}`.trim()}>
      <span className="task-service-bracket-open">[</span>
      {svc && <span className="task-service-name">{svc}</span>}
      <span className="task-service-bracket-close">]</span>
      {plats.length > 0 && (
        <span className="task-service-platforms">
          {plats.map((p, i) => (
            <span key={p} className="task-platform-badge-wrap">
              {i > 0 && <span className="task-platform-slash">/</span>}
              <span className={`task-platform-badge ${p === 'PC' ? 'pc' : 'mobile'}`}>{p}</span>
            </span>
          ))}
        </span>
      )}
    </span>
  )
}
