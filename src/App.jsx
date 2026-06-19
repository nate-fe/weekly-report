import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Weekly from './pages/Weekly'
import Settings from './pages/Settings'
import PersonalMemo from './pages/PersonalMemo'
import WorkSearch from './pages/WorkSearch'
import IdeaBoard from './pages/IdeaBoard'
import TeamAccessGate from './components/TeamAccessGate'
import { TeamSettingsProvider } from './context/TeamSettingsContext'
import { useTeamAccess } from './context/TeamAccessContext'
import { findMemberByEmployeeId, memberGreeting } from './utils/teamAccess'

function AppShell() {
  const { employeeId, members } = useTeamAccess()
  const member = findMemberByEmployeeId(members, employeeId)
  const location = useLocation()
  const settingsActive = location.pathname.startsWith('/settings')

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
            to="/settings/members"
            className={() => `nav-tab ${settingsActive ? 'active' : ''}`}
          >
            설정
          </NavLink>
          <NavLink
            to="/memo"
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            개인 메모
          </NavLink>
          <NavLink
            to="/ideas"
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            아이디어 게시판
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
          <Route path="/settings" element={<Navigate to="/settings/meeting" replace />} />
          <Route path="/settings/:tab" element={<Settings />} />
          <Route path="/members" element={<Navigate to="/settings/members" replace />} />
          <Route path="/memo" element={<PersonalMemo />} />
          <Route path="/memo/signup" element={<Navigate to="/memo" replace />} />
          <Route path="/ideas" element={<IdeaBoard />} />
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
