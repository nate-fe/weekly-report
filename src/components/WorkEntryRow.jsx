import DateRangePicker from './DateRangePicker'
import { WORK_STATUSES } from '../utils/weeklyTask'

export default function WorkEntryRow({
  work,
  index,
  onChange,
  onRemove,
  canRemove = true,
}) {
  return (
    <div className="wtask-entry">
      <div className="wtask-entry-header">
        <span className="wtask-entry-label">작업 {index + 1}</span>
        {canRemove && (
          <button type="button" className="btn-remove-task sm" onClick={onRemove}>
            삭제
          </button>
        )}
      </div>
      <div className="wtask-entry-tools">
        <DateRangePicker
          from={work.from}
          to={work.to}
          onChange={({ from, to }) => onChange({ from, to })}
        />
        <div className="status-group">
          {WORK_STATUSES.map(s => (
            <button
              key={s}
              type="button"
              className={`status-btn status-${s} ${work.status === s ? 'active' : ''}`}
              onClick={() => onChange({ status: s })}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <textarea
        placeholder="작업 내용"
        value={work.content}
        onChange={e => onChange({ content: e.target.value })}
      />
    </div>
  )
}
