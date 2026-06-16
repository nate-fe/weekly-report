import { useState } from 'react'
import { fmtKo } from '../utils/dates'
import { dayEntriesForGroup, formatDayCopyText } from '../utils/weeklyDayFormat'
import ServicePlatformLabel from './ServicePlatformLabel'

export default function WeeklyDayModal({ dateStr, groups = [], onClose }) {
  const [copied, setCopied] = useState(false)

  if (!dateStr) return null

  const totalItems = groups.reduce((n, g) => n + g.items.length, 0)

  const handleCopy = async () => {
    const text = formatDayCopyText(groups)
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="daily-day-modal weekly-day-modal weekly-day-modal-type2"
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
          <div className="daily-day-modal-body weekly-day-type2-body">
            {groups.map(group => {
              const entries = dayEntriesForGroup(group.items)
              return (
                <section key={group.memberName} className="weekly-day-type2-member">
                  <h4 className="weekly-day-type2-member-name">{group.memberName}</h4>
                  {entries.length === 0 ? (
                    <p className="weekly-day-type2-empty">업무 없음</p>
                  ) : (
                    <div className="weekly-day-type2-tasks">
                      {entries.map(entry => (
                        <div key={entry.key} className="weekly-day-type2-task">
                          {(entry.service || entry.platforms?.length > 0) && (
                            <div className="weekly-day-type2-service">
                              <ServicePlatformLabel
                                service={entry.service}
                                platforms={entry.platforms}
                              />
                            </div>
                          )}
                          {entry.title && (
                            <p className="weekly-day-type2-title">{entry.title}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}

        <div className="daily-day-modal-actions">
          {groups.length > 0 && (
            <button
              type="button"
              className="btn-modal-copy"
              onClick={handleCopy}
            >
              {copied ? '복사됨' : '텍스트 복사'}
            </button>
          )}
          <button type="button" className="btn-modal-ok" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
