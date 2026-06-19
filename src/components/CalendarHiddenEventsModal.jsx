import { fmtKo } from '../utils/dates'

export default function CalendarHiddenEventsModal({
  dateStr,
  segments = [],
  onClose,
  onSelectEvent,
}) {
  if (!dateStr || !segments.length) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="gcal-hidden-events-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gcal-hidden-events-title"
      >
        <h3 id="gcal-hidden-events-title" className="gcal-hidden-events-title">
          {fmtKo(dateStr)}
        </h3>
        <p className="gcal-hidden-events-desc">
          업무 {segments.length}건입니다. 바를 클릭하면 상세 내용을 볼 수 있습니다.
        </p>

        <div className="gcal-hidden-events-bars">
          {segments.map(ev => (
            <button
              type="button"
              key={`${ev.id}-${ev.clipFrom}`}
              className={[
                'gcal-hidden-event-bar',
                `tone-${ev.tone}`,
                ev.isRangeStart ? 'seg-start' : '',
                ev.isRangeEnd ? 'seg-end' : '',
              ].filter(Boolean).join(' ')}
              style={{ '--member-color': ev.memberColor }}
              title={`${ev.displayLabel} · ${ev.workLabel}`}
              aria-label={`${ev.displayLabel} · ${ev.workLabel}`}
              onClick={() => onSelectEvent(ev)}
            >
              <span className="gcal-hidden-event-bar-label">{ev.displayLabel}</span>
            </button>
          ))}
        </div>

        <div className="gcal-event-modal-actions">
          <button type="button" className="btn-modal-ok" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
