import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Weekly from './pages/Weekly'
import Members from './pages/Members'
import Settings from './pages/Settings'
import PersonalMemo from './pages/PersonalMemo'
import WorkSearch from './pages/WorkSearch'
import TeamAccessGate from './components/TeamAccessGate'
import { TeamSettingsProvider } from './context/TeamSettingsContext'
import { useTeamAccess } from './context/TeamAccessContext'
import { findMemberByEmployeeId, memberGreeting } from './utils/teamAccess'

function AppShell() {
  const { employeeId, members } = useTeamAccess()
  const member = findMemberByEmployeeId(members, employeeId)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="header-icon">📋</span>
          <h1 className="header-title">NATE UI팀 업무 보고</h1>
        </div>
        <nav className="header-nav">
          <NavLink
            to="/weekly"
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            주간 업무
          </NavLink>
          <NavLink
            to="/search"
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            업무 검색
          </NavLink>
          <NavLink
            to="/members"
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            팀원 관리
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            설정
          </NavLink>
          <NavLink
            to="/memo"
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            개인 메모
          </NavLink>
          <div className="header-access">
            {memberGreeting(member)}
          </div>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/weekly" replace />} />
          <Route path="/daily" element={<Navigate to="/weekly" replace />} />
          <Route path="/weekly" element={<Weekly />} />
          <Route path="/search" element={<WorkSearch />} />
          <Route path="/members" element={<Members />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/memo" element={<PersonalMemo />} />
          <Route path="/memo/signup" element={<Navigate to="/memo" replace />} />
          <Route path="*" element={<Navigate to="/weekly" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <TeamAccessGate>
      <TeamSettingsProvider>
        <AppShell />
      </TeamSettingsProvider>
    </TeamAccessGate>
  )
}
