import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchMembers } from '../utils/storage'
import {
  clearTeamAccess,
  clearTeamAccessEmployeeId,
  clearGuestAccess,
  getStoredTeamAccessEmployeeId,
  isGuestAccessStored,
  isTeamEmployeeIdAllowed,
  storeGuestAccess,
  storeTeamAccessEmployeeId,
  verifyTeamAccessInput,
} from '../utils/teamAccess'

const TeamAccessContext = createContext(null)

export function TeamAccessProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(() => isGuestAccessStored())
  const [employeeId, setEmployeeId] = useState(() => (
    isGuestAccessStored() ? '' : getStoredTeamAccessEmployeeId()
  ))
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

        if (isGuestAccessStored()) {
          setIsGuest(true)
          setEmployeeId('')
        } else {
          const stored = getStoredTeamAccessEmployeeId()
          if (stored && !isTeamEmployeeIdAllowed(stored, data)) {
            clearTeamAccessEmployeeId()
            setEmployeeId('')
          }
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

    clearGuestAccess()
    const stored = storeTeamAccessEmployeeId(result.employeeId)
    setIsGuest(false)
    setEmployeeId(stored)
    return { ok: true, employeeId: stored }
  }, [members, refreshMembers])

  const grantGuestAccess = useCallback(() => {
    storeGuestAccess()
    setIsGuest(true)
    setEmployeeId('')
    return { ok: true }
  }, [])

  const clearAccess = useCallback(() => {
    clearTeamAccess()
    setIsGuest(false)
    setEmployeeId('')
  }, [])

  const value = useMemo(() => ({
    loading,
    isGuest,
    employeeId,
    members,
    grantAccess,
    grantGuestAccess,
    clearAccess,
    refreshMembers,
  }), [loading, isGuest, employeeId, members, grantAccess, grantGuestAccess, clearAccess, refreshMembers])

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
