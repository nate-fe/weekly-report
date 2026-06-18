import { useState } from 'react'
import AlertModal from './AlertModal'
import { useTeamAccess } from '../context/TeamAccessContext'
import { findMemberByEmployeeId } from '../utils/teamAccess'

export default function TeamAccessGate({ children }) {
  const { loading, employeeId, members, grantAccess } = useTeamAccess()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [alert, setAlert] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await grantAccess(input)
      if (!result.ok) {
        if (result.message?.includes('등록된 팀원 사번이 아닙니다')) {
          setAlert({
            title: '이용할 수 없습니다',
            messages: [
              '입력한 사번은 UI팀 등록 팀원이 아닙니다.',
              '등록된 팀원 사번으로만 이 서비스를 이용할 수 있습니다.',
            ],
          })
        } else {
          setError(result.message || '사번을 확인해 주세요.')
        }
      }
    } catch (err) {
      setError(err.message || '팀원 목록을 확인하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen loading-screen-full">
        <div className="spinner" />
        <p>불러오는 중...</p>
      </div>
    )
  }

  if (!employeeId) {
    return (
      <div className="team-access-page">
        <div className="team-access-card">
          <div className="team-access-brand">
            <span className="header-icon">📋</span>
            <h1 className="team-access-title">NATE UI팀 업무 보고</h1>
          </div>
          <p className="team-access-desc">
            UI팀 등록된 팀원만 이용할 수 있습니다. 사번을 입력해 주세요.
          </p>
          <form className="team-access-form" onSubmit={handleSubmit}>
            <label className="memo-field">
              <span className="field-label">사번</span>
              <input
                type="text"
                className="memo-input memo-input-wide memo-input-employee"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="N1234"
                autoComplete="username"
                required
                autoFocus
              />
            </label>
            {error && <p className="memo-error">{error}</p>}
            <button type="submit" className="btn-primary-sm" disabled={busy}>
              {busy ? '확인 중...' : '입장'}
            </button>
          </form>
        </div>

        <AlertModal
          open={!!alert}
          title={alert?.title}
          messages={alert?.messages ?? []}
          onClose={() => setAlert(null)}
        />
      </div>
    )
  }

  const member = findMemberByEmployeeId(members, employeeId)
  return (
    <>
      {member && (
        <span className="sr-only">접속 사번 {employeeId}, {member.name}</span>
      )}
      {children}
    </>
  )
}
