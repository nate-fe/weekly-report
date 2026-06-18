import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fetchTeamSettings, upsertTeamSettings } from '../utils/storage'
import { DEFAULT_TEAM_MEETING, normalizeTeamMeetingSettings } from '../utils/teamMeeting'
import { setServicesList } from '../utils/nateServices'

const TeamSettingsContext = createContext(null)

export function TeamSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => normalizeTeamMeetingSettings(DEFAULT_TEAM_MEETING))
  const [loading, setLoading] = useState(true)

  const applySettings = useCallback((next) => {
    const normalized = normalizeTeamMeetingSettings(next)
    setSettings(normalized)
    setServicesList(normalized.services)
    return normalized
  }, [])

  useEffect(() => {
    fetchTeamSettings()
      .then(applySettings)
      .catch(() => applySettings(DEFAULT_TEAM_MEETING))
      .finally(() => setLoading(false))
  }, [applySettings])

  const saveSettings = useCallback(async (next) => {
    const saved = await upsertTeamSettings(next)
    return applySettings(saved)
  }, [applySettings])

  return (
    <TeamSettingsContext.Provider value={{ settings, loading, saveSettings, applySettings }}>
      {children}
    </TeamSettingsContext.Provider>
  )
}

export function useTeamSettings() {
  const ctx = useContext(TeamSettingsContext)
  if (!ctx) throw new Error('useTeamSettings must be used within TeamSettingsProvider')
  return ctx
}
