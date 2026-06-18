import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchMembers } from '../utils/storage'
import {
  clearTeamAccessEmployeeId,
  getStoredTeamAccessEmployeeId,
  isTeamEmployeeIdAllowed,
  storeTeamAccessEmployeeId,
  verifyTeamAccessInput,
} from '../utils/teamAccess'

const TeamAccessContext = createContext(null)

export function TeamAccessProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const [employeeId, setEmployeeId] = useState(() => getStoredTeamAccessEmployeeId())
  const [members, setMembers] = useState([])

  const refreshMembers = useCallback(async () => {
    const data = await fetchMembers()
    setMembers(data)
    return data
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const data = await refreshMembers()
        if (cancelled) return

        const stored = getStoredTeamAccessEmployeeId()
        if (stored && !isTeamEmployeeIdAllowed(stored, data)) {
          clearTeamAccessEmployeeId()
          setEmployeeId('')
        }
      } catch {
        if (!cancelled) setMembers([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [refreshMembers])

  const grantAccess = useCallback(async (input) => {
    const data = members.length ? members : await refreshMembers()
    const result = verifyTeamAccessInput(input, data)
    if (!result.ok) return result

    const stored = storeTeamAccessEmployeeId(result.employeeId)
    setEmployeeId(stored)
    return { ok: true, employeeId: stored }
  }, [members, refreshMembers])

  const value = useMemo(() => ({
    loading,
    employeeId,
    members,
    grantAccess,
    refreshMembers,
  }), [loading, employeeId, members, grantAccess, refreshMembers])

  return (
    <TeamAccessContext.Provider value={value}>
      {children}
    </TeamAccessContext.Provider>
  )
}

export function useTeamAccess() {
  const ctx = useContext(TeamAccessContext)
  if (!ctx) throw new Error('useTeamAccess must be used within TeamAccessProvider')
  return ctx
}
