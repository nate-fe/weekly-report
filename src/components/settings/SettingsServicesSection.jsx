import { useState, useEffect } from 'react'
import {
  checkTeamSettingsSchema,
  teamSettingsSchemaMigrationMessages,
} from '../../utils/storage'
import { normalizeTeamMeetingSettings } from '../../utils/teamMeeting'
import { useTeamSettings } from '../../context/TeamSettingsContext'
import AlertModal from '../AlertModal'

export default function SettingsServicesSection() {
  const { settings, loading, saveSettings } = useTeamSettings()
  const [localSettings, setLocalSettings] = useState(() => normalizeTeamMeetingSettings({}))
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [alert, setAlert] = useState(null)
  const [newServiceName, setNewServiceName] = useState('')

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const showToast = (msg, isErr = false) => {
    setToast({ msg, err: isErr })
    setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    checkTeamSettingsSchema()
      .then(ok => {
        if (!ok) {
          setAlert({
            title: 'DB 업데이트가 필요합니다',
            messages: teamSettingsSchemaMigrationMessages(),
          })
        }
      })
      .catch(() => {})
  }, [])

  const persist = async (next, successMsg = '저장되었습니다') => {
    setSaving(true)
    try {
      const saved = await saveSettings(next)
      setLocalSettings(saved)
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

  const addService = async () => {
    const name = newServiceName.trim()
    if (!name) return
    if (localSettings.services.includes(name)) {
      showToast('이미 등록된 서비스입니다', true)
      return
    }
    const next = normalizeTeamMeetingSettings({
      ...localSettings,
      services: [...localSettings.services, name],
    })
    const ok = await persist(next, '서비스가 추가되었습니다')
    if (ok) setNewServiceName('')
  }

  const removeService = async (name) => {
    if (localSettings.services.length <= 1) {
      showToast('최소 1개의 서비스는 유지해야 합니다', true)
      return
    }
    const next = normalizeTeamMeetingSettings({
      ...localSettings,
      services: localSettings.services.filter(s => s !== name),
    })
    await persist(next, '서비스가 삭제되었습니다')
  }

  if (loading) {
    return (
      <div className="settings-tab-loading">
        <div className="spinner" />
        <p>설정을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="settings-tab-panel">
      <section className="settings-card">
        <h3 className="settings-card-title">서비스 목록</h3>
        <p className="settings-card-desc">
          주간 업무·업무 검색에서 선택할 서비스명을 관리합니다.
        </p>

        <ul className="settings-service-list">
          {localSettings.services.map(name => (
            <li key={name} className="settings-service-item">
              <span className="settings-service-name">{name}</span>
              <button
                type="button"
                className="btn-remove-task"
                onClick={() => removeService(name)}
                disabled={saving || localSettings.services.length <= 1}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>

        <div className="settings-service-add">
          <input
            type="text"
            className="settings-service-input"
            placeholder="새 서비스명"
            value={newServiceName}
            onChange={e => setNewServiceName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addService() }}
          />
          <button
            type="button"
            className="btn-outline-sm"
            onClick={addService}
            disabled={saving || !newServiceName.trim()}
          >
            추가
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
