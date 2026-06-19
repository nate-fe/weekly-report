import { NavLink, Navigate, useParams } from 'react-router-dom'
import SettingsMembersSection from '../components/settings/SettingsMembersSection'
import SettingsMeetingSection from '../components/settings/SettingsMeetingSection'
import SettingsServicesSection from '../components/settings/SettingsServicesSection'

const SETTINGS_TABS = [
  {
    id: 'members',
    label: '팀원',
    desc: '팀원 추가·삭제, 사번, 레이블, 달력 색상을 관리합니다.',
  },
  {
    id: 'meeting',
    label: '주간회의',
    desc: '주간회의 기본 일정과 예외 회의를 관리합니다.',
  },
  {
    id: 'services',
    label: '서비스',
    desc: '주간 업무·업무 검색에서 사용할 서비스명을 관리합니다.',
  },
]

const TAB_IDS = new Set(SETTINGS_TABS.map(t => t.id))

export default function Settings() {
  const { tab } = useParams()
  const activeTab = TAB_IDS.has(tab) ? tab : null

  if (!activeTab) {
    return <Navigate to="/settings/meeting" replace />
  }

  const meta = SETTINGS_TABS.find(t => t.id === activeTab)

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2 className="settings-title">설정</h2>
        <p className="settings-desc">{meta.desc}</p>
      </div>

      <nav className="settings-tabs" aria-label="설정 탭">
        {SETTINGS_TABS.map(t => (
          <NavLink
            key={t.id}
            to={`/settings/${t.id}`}
            className={({ isActive }) => `settings-tab ${isActive ? 'active' : ''}`}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      {activeTab === 'members' && <SettingsMembersSection />}
      {activeTab === 'meeting' && <SettingsMeetingSection />}
      {activeTab === 'services' && <SettingsServicesSection />}
    </div>
  )
}
