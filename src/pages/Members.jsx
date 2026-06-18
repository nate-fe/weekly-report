import { useState, useEffect } from 'react'
import {
  fetchMembers,
  insertMember,
  deleteMember,
  updateMemberLabel,
  updateMemberColor,
  checkMembersSchema,
  membersSchemaMigrationMessages,
} from '../utils/storage'
import {
  MEMBER_LABELS,
  MEMBER_COLORS,
  memberUid,
  labelClass,
  nextMemberColor,
  normalizeMemberColor,
} from '../utils/members'
import {
  employeeIdValidationError,
  normalizeEmployeeId,
} from '../utils/employeeId'
import { memberEmployeeIds, isTeamLeader } from '../utils/teamAccess'
import { useTeamAccess } from '../context/TeamAccessContext'
import AlertModal from '../components/AlertModal'
import ConfirmModal from '../components/ConfirmModal'

export default function Members() {
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
      <div className="loading-screen">
        <div className="spinner" />
        <p>팀원 목록을 불러오는 중...</p>
      </div>
    )
  }

  const manageableMembers = members.filter(m => !isTeamLeader(m))
  const registeredIds = memberEmployeeIds(manageableMembers)

  return (
    <div className="members-page">
      <div className="members-header">
        <h2 className="members-title">팀원 관리</h2>
        <p className="members-desc">
          매니저 이름과 사번을 등록합니다. 팀장은 목록에서 제외됩니다.
          레이블(디자인 / FE개발)과 색상으로 구분하며, 아바타를 클릭해 색상을 변경할 수 있습니다.
        </p>
      </div>

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
        등록 사번 {registeredIds.length}개
      </p>

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
