import { fmtKo } from '../utils/dates'
import { fmtRangeShort } from '../utils/weeklyTask'
import { labelClass, normalizeMemberColor } from '../utils/members'

export default function WeeklyDayModal({ dateStr, groups = [], onClose }) {
  if (!dateStr) return null

  const totalItems = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="daily-day-modal weekly-day-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-day-modal-title"
      >
        <div className="daily-day-modal-header">
          <h3 id="weekly-day-modal-title" className="daily-day-modal-title">
            {fmtKo(dateStr)}
          </h3>
          <span className="daily-day-modal-cnt">{totalItems}건</span>
        </div>

        {groups.length === 0 ? (
          <p className="daily-day-modal-empty">해당 일자에 등록된 업무가 없습니다.</p>
        ) : (
          <div className="daily-day-modal-body">
            {groups.map(group => (
              <section key={group.memberName} className="daily-day-member-block">
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
                  <span className="daily-day-member-cnt">{group.items.length}건</span>
                </div>
                <ul className="weekly-day-item-list">
                  {group.items.map(item => {
                    const meta = [fmtRangeShort(item.from, item.to), item.status]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                      <li key={item.id} className="weekly-day-item">
                        <div className={`weekly-day-item-badge tone-${item.tone}`}>
                          {item.workLabel}
                        </div>
                        <div className="weekly-day-item-body">
                          <div className="weekly-day-item-title-row">
                            <p className="weekly-day-item-title">{item.taskName}</p>
                            {item.weekKey && (
                              <span className="weekly-day-item-week">{item.weekKey}</span>
                            )}
                          </div>
                          {meta && <p className="weekly-day-item-meta">{meta}</p>}
                          {item.content ? (
                            <p className="weekly-day-item-content">{item.content}</p>
                          ) : (
                            <p className="weekly-day-item-content empty">상세 내용 없음</p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        <div className="daily-day-modal-actions">
          <button type="button" className="btn-modal-ok" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
