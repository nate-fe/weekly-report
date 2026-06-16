import { fmtKo } from '../utils/dates'
import { fmtRangeShort } from '../utils/weeklyTask'
import { labelClass } from '../utils/members'
import ServicePlatformLabel from './ServicePlatformLabel'

export default function CalendarEventModal({ event, onClose }) {
  if (!event) return null

  const period = event.workKey === 'target'
    ? (event.from ? fmtKo(event.from) : '')
    : fmtRangeShort(event.from, event.to)
  const meta = [period, event.status].filter(Boolean).join(' · ')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="gcal-event-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gcal-event-modal-title"
      >
        <div className="gcal-event-modal-header">
          <span className="member-tab-dot" style={{ background: event.memberColor }} />
          <div className="gcal-event-modal-heading">
            <h3 id="gcal-event-modal-title" className="gcal-event-modal-title">
              <span className="gcal-event-assignee">{event.assignee}</span>
              <span className="gcal-event-title-sep">:</span>
              <ServicePlatformLabel
                service={event.service}
                platforms={event.platforms}
              />
              {event.taskTitle && (
                <span className="gcal-event-task-title">{event.taskTitle}</span>
              )}
            </h3>
            {event.memberLabel && (
              <span className={`member-label-badge sm ${labelClass(event.memberLabel)}`}>
                {event.memberLabel}
              </span>
            )}
          </div>
        </div>

        {meta && (
          <div className={`gcal-event-modal-section tone-${event.tone}`}>
            <span className="gcal-event-modal-meta">{meta}</span>
          </div>
        )}

        {event.content ? (
          <p className="gcal-event-modal-content">{event.content}</p>
        ) : (
          <p className="gcal-event-modal-empty">상세 내용이 없습니다.</p>
        )}

        <div className="gcal-event-modal-actions">
          {event.weekKey && (
            <span className="gcal-event-modal-week">{event.weekKey}에 작성</span>
          )}
          <button type="button" className="btn-modal-ok" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
