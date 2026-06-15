import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Daily from './pages/Daily'
import Weekly from './pages/Weekly'
import Members from './pages/Members'

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
            to="/daily"
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            일일 업무
          </NavLink>
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
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/daily" replace />} />
          <Route path="/daily" element={<Daily />} />
          <Route path="/weekly" element={<Weekly />} />
          <Route path="/members" element={<Members />} />
          <Route path="*" element={<Navigate to="/daily" replace />} />
        </Routes>
      </main>
    </div>
  )
}
