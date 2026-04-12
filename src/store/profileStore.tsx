import {
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { profileStoreContext } from './profileStoreContext'
import type { ProfileStorageSchema, ProfileStoreValue, UserProfileRecord } from './profileStoreTypes'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'fuel-logic-profiles-v2-active'

const normalizeProfile = (profile: any): UserProfileRecord => {
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
    supabase
      .from('Profile')
      .select('*')
      .order('createdAt', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to fetch profiles from Supabase:', error)
          setLoading(false)
          return
        }
        
        const profiles = (data || []).map(normalizeProfile)
        
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
        setLoading(false)
      })
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
      createProfile: async (profile) => {
        try {
          const { data, error } = await supabase
            .from('Profile')
            .insert(mapProfileToBackend({ ...profile, id: crypto.randomUUID() }))
            .select()
            .single()

          if (error) throw error

          if (data) {
            const savedProfile = normalizeProfile(data)
            setState((prev) => ({
              profiles: [savedProfile, ...prev.profiles],
              activeProfileId: savedProfile.id,
            }))
            localStorage.setItem(STORAGE_KEY, savedProfile.id)
          }
        } catch (error) {
          console.error('Failed to create profile:', error)
        }
      },
      updateProfile: async (id, profile) => {
        const updatedProfile = { ...profile, id }
        
        // Optimistic UI update
        setState((prev) => ({
          ...prev,
          profiles: prev.profiles.map((item) => (item.id === id ? updatedProfile : item)),
        }))

        // Background API call
        try {
          const { data, error } = await supabase
            .from('Profile')
            .update(mapProfileToBackend(updatedProfile))
            .eq('id', id)
            .select()
            .single()

          if (error) throw error

          if (data) {
            const realProfile = normalizeProfile(data)
            setState((prev) => ({
              ...prev,
              profiles: prev.profiles.map((item) => (item.id === realProfile.id ? realProfile : item)),
            }))
          }
        } catch (error) {
          console.error('Failed to update profile:', error)
        }
      },
      setActiveProfileId: (id) => {
        localStorage.setItem(STORAGE_KEY, id ?? '')
        setState((prev) => ({
          ...prev,
          activeProfileId: id,
        }))
      },
      clearAllProfiles: async () => {
        // Optimistic UI update
        setState({
          profiles: [],
          activeProfileId: null,
        })
        localStorage.removeItem(STORAGE_KEY)

        // Background API call
        try {
          const { error } = await supabase
            .from('Profile')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // Deletes all rows

          if (error) throw error
        } catch (error) {
          console.error('Failed to clear profiles:', error)
        }
      },
    }),
    [activeProfile, state.activeProfileId, state.profiles],
  )

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-sm text-[#8E8E93]">同步云端数据中...</div>
  }

  return <profileStoreContext.Provider value={value}>{children}</profileStoreContext.Provider>
}
