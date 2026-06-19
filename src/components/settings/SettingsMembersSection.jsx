import { useState, useEffect } from 'react'
import {
  fetchMembers,
  insertMember,
  deleteMember,
  updateMemberLabel,
  updateMemberColor,
  checkMembersSchema,
  membersSchemaMigrationMessages,
} from '../../utils/storage'
import {
  MEMBER_LABELS,
  MEMBER_COLORS,
  memberUid,
  labelClass,
  nextMemberColor,
  normalizeMemberColor,
} from '../../utils/members'
import {
  employeeIdValidationError,
  normalizeEmployeeId,
} from '../../utils/employeeId'
import { memberEmployeeIds, isTeamLeader } from '../../utils/teamAccess'
import { useTeamAccess } from '../../context/TeamAccessContext'
import AlertModal from '../AlertModal'
import ConfirmModal from '../ConfirmModal'

export default function SettingsMembersSection() {
  const { refreshMembers } = useTeamAccess()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [labelSchemaOk, setLabelSchemaOk] = useState(true)
  const [newName, setNewName] = useState('')
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [newLabel, setNewLabel] = useState(MEMBER_LABELS[0])
  const [toast, setToast] = useState('')
  const [alert, setAlert] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [colorEditId, setColorEditId] = useState(null)

  const showToast = (msg, isErr = false) => {
    setToast({ msg, err: isErr })
    setTimeout(() => setToast(''), 3000)
  }

  const load = () => {
    setLoading(true)
    fetchMembers()
      .then(data => {
        setMembers(data)
        refreshMembers()
      })
      .catch(e => showToast('팀원 로드 실패: ' + e.message, true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    checkMembersSchema()
      .then(ok => {
        setLabelSchemaOk(ok)
        if (!ok) {
          setAlert({
            title: 'DB 업데이트가 필요합니다',
            messages: membersSchemaMigrationMessages(),
          })
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const showLabelSchemaAlert = () => {
    setAlert({
      title: 'DB 업데이트가 필요합니다',
      messages: membersSchemaMigrationMessages(),
    })
  }

  const addMember = () => {
    const name = newName.trim()
    if (!name) return

    const idErr = employeeIdValidationError(newEmployeeId)
    if (idErr) {
      showToast(idErr, true)
      return
    }

    const employeeId = normalizeEmployeeId(newEmployeeId)
    if (isTeamLeader({ name, employee_id: employeeId })) {
      showToast('팀장은 팀원 관리 목록에 추가하지 않습니다.', true)
      return
    }
    const duplicate = members.some(m => normalizeEmployeeId(m.employee_id) === employeeId)
    if (duplicate) {
      showToast('이미 등록된 사번입니다.', true)
      return
    }

    const m = {
      id: memberUid(),
      name,
      employee_id: employeeId,
      color: nextMemberColor(members),
      label: newLabel,
    }
    setMembers(prev => [...prev, m])
    setNewName('')
    setNewEmployeeId('')
    insertMember(m)
      .then(() => {
        showToast('팀원이 추가되었습니다')
        refreshMembers()
      })
      .catch(e => {
        showToast('팀원 추가 실패: ' + e.message, true)
        setMembers(prev => prev.filter(x => x.id !== m.id))
      })
  }

  const changeLabel = (id, label) => {
    if (!labelSchemaOk) {
      showLabelSchemaAlert()
      return
    }
    const prev = members
    setMembers(ms => ms.map(m => m.id === id ? { ...m, label } : m))
    updateMemberLabel(id, label).catch(e => {
      showToast('레이블 변경 실패: ' + e.message, true)
      setMembers(prev)
      if (e.message.includes('migrate-members')) showLabelSchemaAlert()
    })
  }

  const changeColor = (id, color) => {
    const prev = members
    setMembers(ms => ms.map(m => m.id === id ? { ...m, color } : m))
    updateMemberColor(id, color).catch(e => {
      showToast('색상 변경 실패: ' + e.message, true)
      setMembers(prev)
    })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const prev = members
    setMembers(ms => ms.filter(m => m.id !== deleteTarget))
    deleteMember(deleteTarget)
      .then(() => {
        showToast('팀원이 삭제되었습니다')
        refreshMembers()
      })
      .catch(e => {
        showToast('삭제 실패: ' + e.message, true)
        setMembers(prev)
      })
    setDeleteTarget(null)
  }

  if (loading) {
    return (
      <div className="settings-tab-loading">
        <div className="spinner" />
        <p>팀원 목록을 불러오는 중...</p>
      </div>
    )
  }

  const manageableMembers = members.filter(m => !isTeamLeader(m))
  const teamLeaders = members.filter(isTeamLeader)
  const registeredIds = memberEmployeeIds(manageableMembers)

  return (
    <div className="settings-tab-panel settings-members-panel">
      <div className="members-add-card">
        <input
          type="text"
          className="members-add-input"
          placeholder="이름"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addMember()}
        />
        <input
          type="text"
          className="members-add-input members-add-input-employee"
          placeholder="사번 (N1234)"
          value={newEmployeeId}
          onChange={e => setNewEmployeeId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addMember()}
        />
        <select
          className="members-add-select"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          disabled={!labelSchemaOk}
          title={!labelSchemaOk ? 'DB 마이그레이션 후 사용 가능합니다' : undefined}
        >
          {MEMBER_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <button type="button" className="btn-primary-sm" onClick={addMember}>추가</button>
      </div>

      <p className="members-employee-summary">
        UI팀 총 {teamLeaders.length + registeredIds.length}명 - 팀장 {teamLeaders.length}명, 매니저 {registeredIds.length}명
      </p>

      <section className="members-leader-section">
        <div className="members-group-header">
          <span className="member-label-badge members-leader-badge">팀장</span>
          <span className="members-group-cnt">{teamLeaders.length}명</span>
        </div>
        {teamLeaders.length === 0 ? (
          <p className="members-leader-empty">
            등록된 팀장 정보가 없습니다. DB 시드(`migrate-member-employee-id.sql`)를 확인해 주세요.
          </p>
        ) : (
          <ul className="members-leader-list">
            {teamLeaders.map(leader => (
              <li key={leader.id} className="members-leader-item">
                <span
                  className="member-avatar members-leader-avatar"
                  style={{ background: normalizeMemberColor(leader.color) }}
                  aria-hidden
                >
                  {leader.name[0]}
                </span>
                <div className="members-list-identity">
                  <span className="members-list-name">{leader.name}</span>
                  {leader.employee_id && (
                    <span className="members-list-employee-id">
                      {normalizeEmployeeId(leader.employee_id)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {MEMBER_LABELS.map(label => {
        const group = manageableMembers.filter(m => (m.label || 'FE개발') === label)
        return (
          <section key={label} className="members-group">
            <div className="members-group-header">
              <span className={`member-label-badge ${labelClass(label)}`}>{label}</span>
              <span className="members-group-cnt">{group.length}명</span>
            </div>
            {group.length === 0 ? (
              <div className="members-empty">등록된 팀원이 없습니다</div>
            ) : (
              <ul className="members-list">
                {group.map(m => (
                  <li key={m.id} className="members-list-item">
                    <div className="members-list-row">
                      <button
                        type="button"
                        className={`member-avatar member-avatar-btn ${colorEditId === m.id ? 'editing' : ''}`}
                        style={{ background: normalizeMemberColor(m.color) }}
                        onClick={() => setColorEditId(colorEditId === m.id ? null : m.id)}
                        title="색상 변경"
                        aria-label={`${m.name} 색상 변경`}
                      >
                        {m.name[0]}
                      </button>
                      <div className="members-list-identity">
                        <span className="members-list-name">{m.name}</span>
                        {m.employee_id && (
                          <span className="members-list-employee-id">{normalizeEmployeeId(m.employee_id)}</span>
                        )}
                      </div>
                      <select
                        className="members-label-select"
                        value={m.label || 'FE개발'}
                        onChange={e => changeLabel(m.id, e.target.value)}
                        disabled={!labelSchemaOk}
                        title={!labelSchemaOk ? 'DB 마이그레이션 후 사용 가능합니다' : undefined}
                      >
                        {MEMBER_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <button
                        type="button"
                        className="btn-remove-task"
                        onClick={() => setDeleteTarget(m.id)}
                      >
                        삭제
                      </button>
                    </div>
                    {colorEditId === m.id && (
                      <div className="member-color-picker" role="listbox" aria-label="팀원 색상 선택">
                        {MEMBER_COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            role="option"
                            aria-selected={normalizeMemberColor(m.color) === c}
                            className={`member-color-swatch ${normalizeMemberColor(m.color) === c ? 'active' : ''}`}
                            style={{ background: c }}
                            title={c}
                            onClick={() => changeColor(m.id, c)}
                          />
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}

      {toast && (
        <div className={`toast show ${toast.err ? 'toast-error' : ''}`}>{toast.msg}</div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        message={'팀원을 목록에서 삭제할까요?\n일일·주간 업무 기록은 그대로 유지됩니다.'}
        confirmLabel="삭제"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <AlertModal
        open={!!alert}
        title={alert?.title}
        messages={alert?.messages ?? []}
        onClose={() => setAlert(null)}
      />
    </div>
  )
}
