import { fmtKo } from '../utils/dates'
import { scheduleTypeLabel, canEditPersonalSchedule } from '../utils/personalSchedule'
import { normalizeEmployeeId } from '../utils/employeeId'
import TrashIcon from './icons/TrashIcon'
import EditIcon from './icons/EditIcon'

function memberNameForEmployee(members, scheduleEmployeeId) {
  if (!scheduleEmployeeId) return ''
  const id = normalizeEmployeeId(scheduleEmployeeId)
  const member = (members || []).find(m => normalizeEmployeeId(m.employee_id) === id)
  return member?.name || id
}

export default function PersonalScheduleDayModal({
  dateStr,
  schedules = [],
  employeeId = '',
  members = [],
  onClose,
  onSelect,
  onEdit,
  onDelete,
  busy = false,
}) {
  if (!dateStr || !schedules.length) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="personal-schedule-modal personal-schedule-day-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="personal-schedule-day-title"
      >
        <h3 id="personal-schedule-day-title" className="personal-schedule-modal-title">
          {fmtKo(dateStr)} 일정
        </h3>
        <p className="personal-schedule-modal-desc">
          일정을 선택하면 상세 내용을 확인할 수 있습니다.
        </p>

        <ul className="personal-schedule-day-list">
          {schedules.map(schedule => {
            const canEdit = canEditPersonalSchedule(schedule, employeeId)
            const ownerName = memberNameForEmployee(members, schedule.employeeId)
            return (
              <li key={schedule.id} className="personal-schedule-day-item">
                <button
                  type="button"
                  className="personal-schedule-day-item-main"
                  onClick={() => onSelect(schedule)}
                  disabled={busy}
                >
                  <span className={`personal-schedule-day-type type-${schedule.type}`}>
                    {scheduleTypeLabel(schedule.type)}
                  </span>
                  <span className="personal-schedule-day-title">{schedule.title}</span>
                  {ownerName && (
                    <span className="personal-schedule-day-owner">{ownerName}</span>
                  )}
                  {schedule.time && (
                    <span className="personal-schedule-day-time">{schedule.time}</span>
                  )}
                </button>
                {canEdit && (
                  <div className="personal-schedule-day-item-actions">
                    <button
                      type="button"
                      className="btn-icon-edit"
                      onClick={() => onEdit(schedule)}
                      disabled={busy}
                      aria-label={`${schedule.title} 일정 수정`}
                      title="수정"
                    >
                      <EditIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon-trash personal-schedule-delete-icon"
                      onClick={() => onDelete(schedule)}
                      disabled={busy}
                      aria-label={`${schedule.title} 일정 삭제`}
                      title="삭제"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <div className="personal-schedule-actions">
          <button type="button" className="btn-modal-ok" onClick={onClose} disabled={busy}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
