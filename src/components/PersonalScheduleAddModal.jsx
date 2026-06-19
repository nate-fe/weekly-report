import { useEffect, useState } from 'react'
import DatePicker from './DatePicker'
import { today } from '../utils/dates'
import { useDraggable } from '../hooks/useDraggable'
import {
  SCHEDULE_TYPES,
  createPersonalSchedule,
  patchPersonalSchedule,
} from '../utils/personalSchedule'

export default function PersonalScheduleAddModal({
  open,
  schedule = null,
  defaultDate = '',
  onClose,
  onSave,
  saving = false,
}) {
  const isEdit = !!schedule
  const [type, setType] = useState('meeting')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate || today())
  const [time, setTime] = useState('')
  const [memo, setMemo] = useState('')
  const [error, setError] = useState('')
  const { offset, onDragStart } = useDraggable(open ? (schedule?.id || 'add') : null)

  useEffect(() => {
    if (!open) return
    if (schedule) {
      setType(schedule.type)
      setTitle(schedule.title)
      setDate(schedule.date)
      setTime(schedule.time || '')
      setMemo(schedule.memo || '')
    } else {
      setType('meeting')
      setTitle('')
      setDate(defaultDate || today())
      setTime('')
      setMemo('')
    }
    setError('')
  }, [open, schedule, defaultDate])

  if (!open) return null

  const handleClose = () => {
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('제목을 입력해 주세요.')
      return
    }
    if (!date) {
      setError('날짜를 선택해 주세요.')
      return
    }
    setError('')
    const next = isEdit
      ? patchPersonalSchedule(schedule, { type, title: trimmedTitle, date, time, memo })
      : createPersonalSchedule({ type, title: trimmedTitle, date, time, memo })
    if (!next) {
      setError('일정을 저장할 수 없습니다.')
      return
    }
    await onSave(next)
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="personal-schedule-modal personal-schedule-modal-draggable"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="personal-schedule-form-title"
      >
        <div
          className="personal-schedule-modal-drag-handle"
          onMouseDown={onDragStart}
        >
          <h3 id="personal-schedule-form-title" className="personal-schedule-modal-title">
            {isEdit ? '일정 수정' : '일정 추가'}
          </h3>
          <p className="personal-schedule-modal-desc">
            팀 달력에 표시되는 회의·라이브 일정입니다.
          </p>
        </div>

        <form className="personal-schedule-form" onSubmit={handleSubmit}>
          <fieldset className="personal-schedule-type-field">
            <legend className="field-label">유형</legend>
            <div className="personal-schedule-type-group">
              {SCHEDULE_TYPES.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`personal-schedule-type-btn ${type === opt.value ? 'active' : ''} type-${opt.value}`}
                  onClick={() => setType(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="personal-schedule-field">
            <span className="field-label">제목</span>
            <input
              type="text"
              className="personal-schedule-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={type === 'live' ? '두근두근 라이브' : '끝나지 않는 회의'}
              autoFocus
            />
          </label>

          <div className="personal-schedule-row">
            <label className="personal-schedule-field">
              <span className="field-label">날짜</span>
              <DatePicker value={date} onChange={setDate} placeholder="날짜 선택" />
            </label>
            <label className="personal-schedule-field personal-schedule-field-time">
              <span className="field-label">시간 (선택)</span>
              <input
                type="time"
                className="personal-schedule-input"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </label>
          </div>

          <label className="personal-schedule-field">
            <span className="field-label">메모 (선택)</span>
            <textarea
              className="personal-schedule-textarea"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="장소, 참석자, 링크 등"
              rows={3}
            />
          </label>

          {error && <p className="personal-schedule-error">{error}</p>}

          <div className="personal-schedule-actions">
            <button type="button" className="btn-modal-cancel" onClick={handleClose} disabled={saving}>
              취소
            </button>
            <button type="submit" className="btn-primary-md" disabled={saving}>
              {saving ? '저장 중...' : isEdit ? '저장' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
