import WorkEntryRow from './WorkEntryRow'
import DatePicker from './DatePicker'
import { fmtKo } from '../utils/dates'
import { workSummary, WORK_VIEW_GROUPS, groupWorksForView } from '../utils/weeklyTask'
import { labelClass } from '../utils/members'
import {
  NATE_SERVICES,
  NATE_PLATFORMS,
  formatTaskDisplayName,
  normalizeTaskNameFields,
  patchTaskNameFields,
  togglePlatform,
} from '../utils/nateServices'

export default function WeeklyTaskCard({
  task,
  member,
  showMember = false,
  reportFrom = '',
  reportTo = '',
  editing,
  readOnly = false,
  onEdit,
  onUpdate,
  onAddWork,
  onUpdateWorkEntry,
  onRemoveWorkEntry,
  onUpdateTarget,
  onDelete,
}) {
  const memberName = member?.name || task.assignee?.trim() || '(담당자 없음)'
  const memberLabel = member?.label
  const works = task.works || []
  const grouped = groupWorksForView(works, reportFrom, reportTo)
  const displayName = formatTaskDisplayName(task)

  if (!editing) {
    return (
      <div className="wtask-card wtask-card-view">
        <div className="wtask-view-header">
          <div className="wtask-view-title">
            <strong>{displayName || '(업무명 없음)'}</strong>
            {showMember && (
              <span className="wtask-view-member">
                <span className="member-tab-dot" style={{ background: member?.color || '#ccc' }} />
                {memberName}
                {memberLabel && (
                  <span className={`member-label-badge sm ${labelClass(memberLabel)}`}>{memberLabel}</span>
                )}
              </span>
            )}
          </div>
          {!readOnly && (
            <div className="wtask-view-actions">
              <button type="button" className="btn-edit-task" onClick={onEdit}>수정</button>
              <button type="button" className="btn-remove-task" onClick={onDelete}>삭제</button>
            </div>
          )}
        </div>

        {task.target?.date && (
          <div className="wtask-view-target">
            <span className="field-label">목표 일정</span>
            <span>{fmtKo(task.target.date)}</span>
          </div>
        )}

        <div className="wtask-view-works">
          {WORK_VIEW_GROUPS.map(({ key, label, colorClass }) => {
            const items = grouped[key]
            if (!items.length) return null
            return (
              <div key={key} className={`wtask-view-work ${colorClass}`}>
                <span className="wtask-view-work-label">{label}</span>
                <div className="wtask-view-work-items">
                  {items.map(work => {
                    const s = workSummary(work)
                    return (
                      <div key={work.id} className="wtask-view-work-item">
                        {s.meta && <span className="wtask-view-work-meta">{s.meta}</span>}
                        {s.content && <p className="wtask-view-work-content">{s.content}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const handleNameField = (patch) => {
    onUpdate(patchTaskNameFields(task, patch))
  }

  const platforms = normalizeTaskNameFields(task).platforms

  return (
    <div className="wtask-card wtask-card-edit">
      <div className="wtask-header">
        <div className="wtask-meta wtask-meta-name">
          <div className="wtask-name-row">
            <div className="wtask-name-fields">
              <label className="wtask-name-field">
                <span className="field-label">서비스</span>
                <select
                  className="wtask-service-select"
                  value={task.service || ''}
                  onChange={e => handleNameField({ service: e.target.value })}
                >
                  <option value="">선택</option>
                  {NATE_SERVICES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <div className="wtask-name-field">
                <span className="field-label">플랫폼</span>
                <div className="platform-group">
                  {NATE_PLATFORMS.map(p => (
                    <button
                      key={p}
                      type="button"
                      className={`platform-btn ${platforms.includes(p) ? 'active' : ''}`}
                      onClick={() => handleNameField({ platforms: togglePlatform(platforms, p) })}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <label className="wtask-name-field wtask-name-field-grow">
                <span className="field-label">업무 내용</span>
                <input
                  type="text"
                  className="wtask-name-detail"
                  placeholder="예: 메인 UI 수정"
                  value={task.nameDetail || ''}
                  onChange={e => handleNameField({ nameDetail: e.target.value })}
                />
              </label>
            </div>
            <button type="button" className="btn-remove-task btn-remove-task-inline" onClick={onDelete}>삭제</button>
          </div>
        </div>
      </div>

      <div className="wtask-target">
        <span className="field-label">목표 일정</span>
        <DatePicker
          value={task.target?.date || ''}
          onChange={date => onUpdateTarget({ date })}
          placeholder="목표 날짜"
        />
      </div>

      <div className="wtask-entries">
        {works.map((work, i) => (
          <WorkEntryRow
            key={work.id}
            work={work}
            index={i}
            canRemove={works.length > 1}
            onChange={patch => onUpdateWorkEntry(work.id, patch)}
            onRemove={() => onRemoveWorkEntry(work.id)}
          />
        ))}
        <button type="button" className="btn-add-dashed" onClick={onAddWork}>
          + 작업 추가
        </button>
      </div>
    </div>
  )
}
