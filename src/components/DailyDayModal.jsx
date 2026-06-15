import { fmtKo } from '../utils/dates'
import { formatDailySubmission } from '../utils/dailyCalendar'
import { labelClass, normalizeMemberColor } from '../utils/members'

function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function DailyDayModal({
  dateStr,
  groups = [],
  submittedCount = 0,
  totalMembers = 0,
  onClose,
  onGoToDate,
}) {
  if (!dateStr) return null

  const submissionLabel = formatDailySubmission(submittedCount, totalMembers)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="daily-day-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-day-modal-title"
      >
        <div className="daily-day-modal-header">
          <h3 id="daily-day-modal-title" className="daily-day-modal-title">
            {fmtKo(dateStr)}
          </h3>
          {totalMembers > 0 && (
            <span className="daily-day-modal-submit">{submissionLabel}</span>
          )}
        </div>

        {groups.length === 0 ? (
          <p className="daily-day-modal-empty">등록된 업무가 없습니다.</p>
        ) : (
          <div className="daily-day-modal-body">
            {groups.map(group => (
              <section key={group.memberId || '_orphan'} className="daily-day-member-block">
                <div className="daily-day-member-header">
                  <span
                    className="member-tab-dot"
                    style={{ background: normalizeMemberColor(group.memberColor) }}
                  />
                  <span className="daily-day-member-name">{group.memberName}</span>
                  {group.memberLabel && (
                    <span className={`member-label-badge sm ${labelClass(group.memberLabel)}`}>
                      {group.memberLabel}
                    </span>
                  )}
                </div>
                <ul className="daily-day-task-list">
                  {group.tasks.map(task => (
                    <li key={task.id} className={`daily-day-task ${task.done ? 'done' : ''}`}>
                      <span className={`daily-day-task-badge ${task.done ? 'badge-done' : 'badge-wip'}`}>
                        {task.done ? '완료' : '진행중'}
                      </span>
                      <div className="daily-day-task-body">
                        <p className="daily-day-task-title">
                          {task.title?.trim() || '(내용 없음)'}
                        </p>
                        {task.memo?.trim() && (
                          <p className="daily-day-task-memo">{task.memo}</p>
                        )}
                        {task.createdAt && (
                          <span className="daily-day-task-time">{fmtTime(task.createdAt)}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <div className="daily-day-modal-actions">
          {onGoToDate && (
            <button type="button" className="btn-modal-cancel" onClick={() => onGoToDate(dateStr)}>
              이 날짜 보기
            </button>
          )}
          <button type="button" className="btn-modal-ok" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
