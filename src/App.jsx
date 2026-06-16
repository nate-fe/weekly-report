import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Weekly from './pages/Weekly'
import Members from './pages/Members'
import Settings from './pages/Settings'

export default function App() {
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
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/weekly" replace />} />
          <Route path="/daily" element={<Navigate to="/weekly" replace />} />
          <Route path="/weekly" element={<Weekly />} />
          <Route path="/members" element={<Members />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/weekly" replace />} />
        </Routes>
      </main>
    </div>
  )
}
