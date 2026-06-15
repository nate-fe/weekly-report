import DateRangePicker from './DateRangePicker'
import { WORK_STATUSES } from '../utils/weeklyTask'

export default function WorkSection({ label, colorClass, work, onChange }) {
  return (
    <div className={`wtask-col ${colorClass}`}>
      <div className="wtask-col-label">{label}</div>
      <div className="wtask-col-tools">
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
        placeholder={`${label} 내용`}
        value={work.content}
        onChange={e => onChange({ content: e.target.value })}
      />
    </div>
  )
}
