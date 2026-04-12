import type { ActivityLevel, BiologicalSex, PopulationType } from '../lib/fuelLogic'

export type StrategyMode = 'hardcore' | 'steady' | 'custom'
export type TrainingAnchor = '上午' | '中午' | '下午' | '晚后' | '晚上'

export interface ProfileOffsets {
  trainingDayOffset: number
  restDayOffset: number
}

export interface MacroTargets {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface CustomTargets {
  training: MacroTargets
  rest: MacroTargets
}

export interface UserProfileRecord {
  id: string
  name: string
  sex: BiologicalSex
  age: number
  heightCm: number
  weightKg: number
  populationType: PopulationType
  activityLevel: ActivityLevel
  strategyMode: StrategyMode
  trainingAnchor: TrainingAnchor
  offsets: ProfileOffsets
  customTargets?: CustomTargets
}

export interface ProfileStorageSchema {
  profiles: UserProfileRecord[]
  activeProfileId: string | null
}

export interface ProfileStoreValue {
  profiles: UserProfileRecord[]
  activeProfileId: string | null
  activeProfile: UserProfileRecord | null
  hasProfiles: boolean
  createProfile: (profile: Omit<UserProfileRecord, 'id'>) => void
  updateProfile: (id: string, profile: Omit<UserProfileRecord, 'id'>) => void
  setActiveProfileId: (id: string) => void
  clearAllProfiles: () => void
}

export const getDefaultOffsetsByPopulation = (
  populationType: PopulationType,
): ProfileOffsets => {
  if (populationType === 'strength') {
    return {
      trainingDayOffset: 200,
      restDayOffset: -1000,
    }
  }

  return {
    trainingDayOffset: -200,
    restDayOffset: -500,
  }
}

export const getOffsetsByStrategyMode = (
  mode: StrategyMode,
  populationType: PopulationType,
): ProfileOffsets => {
  if (mode === 'hardcore') {
    return {
      trainingDayOffset: 200,
      restDayOffset: -1000,
    }
  }

  if (mode === 'steady') {
    return {
      trainingDayOffset: 0,
      restDayOffset: -500,
    }
  }

  return getDefaultOffsetsByPopulation(populationType)
}
