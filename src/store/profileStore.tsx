import {
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { profileStoreContext } from './profileStoreContext'
import type { ProfileStorageSchema, ProfileStoreValue, UserProfileRecord } from './profileStoreTypes'
import { getDefaultOffsetsByPopulation } from './profileStoreTypes'

const API_BASE = 'http://localhost:3001/api'
const STORAGE_KEY = 'fuel-logic-profiles-v2-active'

const normalizeProfile = (profile: any): UserProfileRecord => {
  const normalizedPopulation = profile.populationType ?? 'strength'

  let customTargets: UserProfileRecord['customTargets'] = undefined
  if (profile.customTrainingKcal !== undefined && profile.customTrainingKcal !== null) {
    customTargets = {
      training: {
        kcal: profile.customTrainingKcal,
        protein: profile.customTrainingProtein || 0,
        carbs: profile.customTrainingCarbs || 0,
        fat: profile.customTrainingFat || 0,
      },
      rest: {
        kcal: profile.customRestKcal || 0,
        protein: profile.customRestProtein || 0,
        carbs: profile.customRestCarbs || 0,
        fat: profile.customRestFat || 0,
      }
    }
  }

  return {
    ...profile,
    strategyMode: profile.strategyMode ?? 'hardcore',
    trainingAnchor: profile.trainingAnchor ?? '下午',
    offsets: profile.offsets ?? {
      trainingDayOffset: profile.trainingDayOffset ?? 200,
      restDayOffset: profile.restDayOffset ?? -1000,
    },
    customTargets,
  }
}

const mapProfileToBackend = (profile: UserProfileRecord) => ({
  ...profile,
  trainingDayOffset: profile.offsets.trainingDayOffset,
  restDayOffset: profile.offsets.restDayOffset,
  customTrainingKcal: profile.customTargets?.training.kcal ?? null,
  customTrainingProtein: profile.customTargets?.training.protein ?? null,
  customTrainingCarbs: profile.customTargets?.training.carbs ?? null,
  customTrainingFat: profile.customTargets?.training.fat ?? null,
  customRestKcal: profile.customTargets?.rest.kcal ?? null,
  customRestProtein: profile.customTargets?.rest.protein ?? null,
  customRestCarbs: profile.customTargets?.rest.carbs ?? null,
  customRestFat: profile.customTargets?.rest.fat ?? null,
})

export function ProfileStoreProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<ProfileStorageSchema>({
    profiles: [],
    activeProfileId: localStorage.getItem(STORAGE_KEY),
  })
  const [loading, setLoading] = useState(true)

  // Fetch profiles from backend
  useEffect(() => {
    fetch(`${API_BASE}/profiles`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then((data: any[]) => {
        const profiles = data.map(normalizeProfile)
        
        setState((prev) => {
          let activeId = prev.activeProfileId
          if (!activeId || !profiles.find((p) => p.id === activeId)) {
            activeId = profiles.length > 0 ? profiles[0].id : null
          }
          if (activeId) {
            localStorage.setItem(STORAGE_KEY, activeId)
          }
          return { profiles, activeProfileId: activeId }
        })
      })
      .catch((err) => console.error('Failed to fetch profiles:', err))
      .finally(() => setLoading(false))
  }, [])

  const activeProfile = useMemo(() => {
    if (!state.activeProfileId) {
      return null
    }

    return state.profiles.find((profile) => profile.id === state.activeProfileId) ?? null
  }, [state.activeProfileId, state.profiles])

  const value = useMemo<ProfileStoreValue>(
    () => ({
      profiles: state.profiles,
      activeProfileId: state.activeProfileId,
      activeProfile,
      hasProfiles: state.profiles.length > 0,
      createProfile: (profile) => {
        const tempId = `temp-${Date.now()}`
        const nextProfile: UserProfileRecord = {
          ...profile,
          id: tempId,
        }
        
        // Optimistic UI update
        setState((prev) => ({
          profiles: [nextProfile, ...prev.profiles],
          activeProfileId: tempId,
        }))
        localStorage.setItem(STORAGE_KEY, tempId)

        // Background API call
        fetch(`${API_BASE}/profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mapProfileToBackend(nextProfile)),
        })
          .then(async (res) => {
            if (!res.ok) {
              throw new Error(await res.text())
            }
            return res.json()
          })
          .then((data) => {
            const realProfile = normalizeProfile(data)
            setState((prev) => {
              const newActiveId = prev.activeProfileId === tempId ? realProfile.id : prev.activeProfileId
              if (newActiveId === realProfile.id) {
                localStorage.setItem(STORAGE_KEY, realProfile.id)
              }
              return {
                profiles: prev.profiles.map((p) => (p.id === tempId ? realProfile : p)),
                activeProfileId: newActiveId,
              }
            })
          })
          .catch((err) => console.error('Failed to create profile:', err))
      },
      updateProfile: (id, profile) => {
        const updatedProfile = { ...profile, id }
        
        // Optimistic UI update
        setState((prev) => ({
          ...prev,
          profiles: prev.profiles.map((item) => (item.id === id ? updatedProfile : item)),
        }))

        // Background API call
        fetch(`${API_BASE}/profiles/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mapProfileToBackend(updatedProfile)),
        })
          .then(async (res) => {
            if (!res.ok) {
              throw new Error(await res.text())
            }
            return res.json()
          })
          .then((data) => {
            const realProfile = normalizeProfile(data)
            setState((prev) => ({
              ...prev,
              profiles: prev.profiles.map((item) => (item.id === realProfile.id ? realProfile : item)),
            }))
          })
          .catch((err) => console.error('Failed to update profile:', err))
      },
      setActiveProfileId: (id) => {
        localStorage.setItem(STORAGE_KEY, id ?? '')
        setState((prev) => ({
          ...prev,
          activeProfileId: id,
        }))
      },
      clearAllProfiles: () => {
        // Optimistic UI update
        setState({
          profiles: [],
          activeProfileId: null,
        })
        localStorage.removeItem(STORAGE_KEY)

        // Background API call
        fetch(`${API_BASE}/profiles/all`, { method: 'DELETE' }).catch((err) =>
          console.error('Failed to clear profiles:', err),
        )
      },
    }),
    [activeProfile, state.activeProfileId, state.profiles],
  )

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-sm text-[#8E8E93]">同步云端数据中...</div>
  }

  return <profileStoreContext.Provider value={value}>{children}</profileStoreContext.Provider>
}
