import { useState, useEffect } from 'react'
import {
  fetchTeamSettings,
  upsertTeamSettings,
  checkTeamSettingsSchema,
  teamSettingsSchemaMigrationMessages,
} from '../utils/storage'
import {
  WEEKDAY_OPTIONS,
  normalizeTeamMeetingSettings,
  meetingExceptionUid,
  weekdayLabel,
} from '../utils/teamMeeting'
import { fmtKo } from '../utils/dates'
import DatePicker from '../components/DatePicker'
import AlertModal from '../components/AlertModal'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schemaOk, setSchemaOk] = useState(true)
  const [settings, setSettings] = useState(() => normalizeTeamMeetingSettings({}))
  const [toast, setToast] = useState('')
  const [alert, setAlert] = useState(null)
  const [exceptionDate, setExceptionDate] = useState('')
  const [exceptionTime, setExceptionTime] = useState('')

  const showToast = (msg, isErr = false) => {
    setToast({ msg, err: isErr })
    setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    Promise.all([fetchTeamSettings(), checkTeamSettingsSchema()])
      .then(([data, ok]) => {
        setSettings(data)
        setSchemaOk(ok)
        if (!ok) {
          setAlert({
            title: 'DB 업데이트가 필요합니다',
            messages: teamSettingsSchemaMigrationMessages(),
          })
        }
      })
      .catch(e => showToast('설정 로드 실패: ' + e.message, true))
      .finally(() => setLoading(false))
  }, [])

  const persist = async (next, successMsg = '저장되었습니다') => {
    setSaving(true)
    try {
      const saved = await upsertTeamSettings(next)
      setSettings(saved)
      showToast(successMsg)
      return true
    } catch (e) {
      if (e.message?.includes('migrate-team-settings')) {
        setAlert({
          title: 'DB 업데이트가 필요합니다',
          messages: teamSettingsSchemaMigrationMessages(),
        })
      } else {
        showToast('저장 실패: ' + e.message, true)
      }
      return false
    } finally {
      setSaving(false)
    }
  }

  const saveBase = () => {
    persist(settings)
  }

  const addException = async () => {
    if (!exceptionDate) return
    if (settings.exceptions.some(ex => ex.date === exceptionDate)) {
      showToast('이미 등록된 예외 일정입니다', true)
      return
    }
    const next = normalizeTeamMeetingSettings({
      ...settings,
      exceptions: [
        ...settings.exceptions,
        {
          id: meetingExceptionUid(),
          date: exceptionDate,
          time: exceptionTime.trim(),
        },
      ],
    })
    const ok = await persist(next, '예외 일정이 추가되었습니다')
    if (ok) {
      setExceptionDate('')
      setExceptionTime('')
    }
  }

  const removeException = async (id) => {
    const next = normalizeTeamMeetingSettings({
      ...settings,
      exceptions: settings.exceptions.filter(ex => ex.id !== id),
    })
    await persist(next, '예외 일정이 삭제되었습니다')
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>설정을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2 className="settings-title">설정</h2>
        <p className="settings-desc">
          주간회의 요일·시간을 설정합니다. 특정 주만 일정이 바뀌면 예외 일정을 추가하세요.
          달력 날짜에 ✓ 표시가 나타납니다.
        </p>
      </div>

      <section className="settings-card">
        <h3 className="settings-card-title">기본 주간회의</h3>
        <div className="settings-fields">
          <label className="settings-field">
            <span className="field-label">요일</span>
            <select
              className="settings-select"
              value={settings.meetingDay}
              onChange={e => setSettings(s => ({
                ...s,
                meetingDay: Number(e.target.value),
              }))}
            >
              {WEEKDAY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="settings-field">
            <span className="field-label">시간</span>
            <input
              type="time"
              className="settings-time-input"
              value={settings.meetingTime}
              onChange={e => setSettings(s => ({ ...s, meetingTime: e.target.value }))}
            />
          </label>
        </div>
        <p className="settings-hint">
          매주 {weekdayLabel(settings.meetingDay)} {settings.meetingTime}
        </p>
        <button
          type="button"
          className="btn-primary-sm"
          onClick={saveBase}
          disabled={saving}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        {!schemaOk && (
          <p className="settings-schema-warn">DB 마이그레이션 전에는 이 브라우저에만 저장됩니다.</p>
        )}
      </section>

      <section className="settings-card">
        <h3 className="settings-card-title">예외 주간회의</h3>
        <p className="settings-card-desc">
          해당 주에는 기본 요일({weekdayLabel(settings.meetingDay)}) 대신 아래 날짜에 회의가 표시됩니다.
        </p>

        {settings.exceptions.length === 0 ? (
          <p className="settings-empty">등록된 예외 일정이 없습니다.</p>
        ) : (
          <ul className="settings-exception-list">
            {settings.exceptions.map(ex => (
              <li key={ex.id} className="settings-exception-item">
                <div className="settings-exception-info">
                  <span className="settings-exception-date">{fmtKo(ex.date)}</span>
                  {ex.time && (
                    <span className="settings-exception-time">{ex.time}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-remove-task"
                  onClick={() => removeException(ex.id)}
                  disabled={saving}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="settings-exception-add">
          <DatePicker
            value={exceptionDate}
            onChange={setExceptionDate}
            placeholder="예외 회의 날짜"
          />
          <input
            type="time"
            className="settings-time-input"
            value={exceptionTime}
            onChange={e => setExceptionTime(e.target.value)}
            title="비우면 기본 시간 사용"
          />
          <button
            type="button"
            className="btn-outline-sm"
            onClick={addException}
            disabled={saving || !exceptionDate}
          >
            예외 추가
          </button>
        </div>
      </section>

      {toast && (
        <div className={`toast show ${toast.err ? 'toast-error' : ''}`}>
          {toast.msg}
        </div>
      )}

      <AlertModal
        open={!!alert}
        title={alert?.title}
        messages={alert?.messages ?? []}
        onClose={() => setAlert(null)}
      />
    </div>
  )
}
