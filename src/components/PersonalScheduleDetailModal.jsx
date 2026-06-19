import { fmtKo } from '../utils/dates'
import { scheduleTypeLabel } from '../utils/personalSchedule'
import TrashIcon from './icons/TrashIcon'
import EditIcon from './icons/EditIcon'

export default function PersonalScheduleDetailModal({
  schedule,
  ownerName = '',
  canEdit = false,
  onClose,
  onEdit,
  onDelete,
  busy = false,
}) {
  if (!schedule) return null

  const typeLabel = scheduleTypeLabel(schedule.type)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="personal-schedule-modal personal-schedule-detail-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="personal-schedule-detail-title"
      >
        <div className="personal-schedule-detail-head">
          <span className={`personal-schedule-detail-type type-${schedule.type}`}>
            {typeLabel}
          </span>
          <h3 id="personal-schedule-detail-title" className="personal-schedule-modal-title">
            {schedule.title}
          </h3>
        </div>

        <dl className="personal-schedule-detail-meta">
          <div>
            <dt>날짜</dt>
            <dd>{fmtKo(schedule.date)}</dd>
          </div>
          {ownerName && (
            <div>
              <dt>등록</dt>
              <dd>{ownerName}</dd>
            </div>
          )}
          {schedule.time && (
            <div>
              <dt>시간</dt>
              <dd>{schedule.time}</dd>
            </div>
          )}
        </dl>

        {schedule.memo && (
          <p className="personal-schedule-detail-memo">{schedule.memo}</p>
        )}

        {!canEdit && (
          <p className="personal-schedule-detail-note">본인이 등록한 일정만 수정·삭제할 수 있습니다.</p>
        )}

        <div className="personal-schedule-actions personal-schedule-detail-actions">
          {canEdit && (
            <button
              type="button"
              className="btn-icon-trash personal-schedule-delete-icon"
              onClick={onDelete}
              disabled={busy}
              aria-label="일정 삭제"
              title="삭제"
            >
              <TrashIcon size={18} />
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              className="btn-icon-edit"
              onClick={() => onEdit(schedule)}
              disabled={busy}
              aria-label="일정 수정"
              title="수정"
            >
              <EditIcon size={18} />
            </button>
          )}
          <button type="button" className="btn-modal-ok" onClick={onClose} disabled={busy}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
