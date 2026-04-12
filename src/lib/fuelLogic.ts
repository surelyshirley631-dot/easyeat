export type BiologicalSex = 'male' | 'female'

export type PopulationType = 'strength' | 'general'

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high'

export type DayStatus = 'strength_training' | 'active' | 'rest'

export type FatLossPreset = 'strategy_a' | 'strategy_b' | 'strategy_c' | 'custom'

export interface UserProfile {
  age: number
  heightCm: number
  weightKg: number
  sex: BiologicalSex
  populationType: PopulationType
  activityLevel: ActivityLevel
}

export interface CaloricOffsets {
  trainingDayOffset: number
  restDayOffset: number
}

export interface MacroSplit {
  carbsPct: number
  fatPct: number
}

export interface MacroResult {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  proteinPct: number
  carbsPct: number
  fatPct: number
}

export interface ServingGuide {
  carbServings: number
  riceGrams: number
  sweetPotatoCount: number
  proteinServings: number
  chickenGrams: number
  eggCount: number
}

export interface FuelPlan {
  bmr: number
  tdee: number
  calorieTarget: number
  selectedOffset: number
  proteinFactor: number
  dayLabel: string
  macroResult: MacroResult
  servingGuide: ServingGuide
}

const activityFactors: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
}

const CARB_GRAMS_PER_SERVING = 36
const PROTEIN_GRAMS_PER_SERVING = 20

const round1 = (value: number) => Math.round(value * 10) / 10

const roundInt = (value: number) => Math.round(value)

export const calculateBmr = (profile: UserProfile): number => {
  // Mifflin-St Jeor Equation
  const sexOffset = profile.sex === 'male' ? 5 : -161
  return (
    10 * profile.weightKg +
    6.25 * profile.heightCm -
    5 * profile.age +
    sexOffset
  )
}

export const calculateTdee = (profile: UserProfile): number => {
  return calculateBmr(profile) * activityFactors[profile.activityLevel]
}

const getStrategy = (
  profile: UserProfile,
  dayStatus: DayStatus,
): {
  proteinFactor: number
  carbsFactor: number // g/kg
  fatFactor: number   // g/kg
  dayLabel: string
} => {
  if (profile.populationType === 'strength') {
    if (dayStatus === 'strength_training') {
      // 训练日：高碳水，低脂肪
      return {
        proteinFactor: 2.2,
        carbsFactor: 4.0,
        fatFactor: 0.8,
        dayLabel: '力量训练日',
      }
    }

    // 休息日：低碳水，适中脂肪
    return {
      proteinFactor: 2.0,
      carbsFactor: 1.5,
      fatFactor: 1.0,
      dayLabel: '休息日',
    }
  }

  // 普通人 (General)
  if (dayStatus === 'rest') {
    return {
      proteinFactor: 1.6,
      carbsFactor: 2.0,
      fatFactor: 1.0,
      dayLabel: '休息日',
    }
  }

  return {
    proteinFactor: 1.6,
    carbsFactor: 3.0,
    fatFactor: 1.0,
    dayLabel: '活动日',
  }
}

export const buildFuelPlan = (
  profile: UserProfile,
  dayStatus: DayStatus,
  offsets: CaloricOffsets,
): FuelPlan => {
  const bmr = calculateBmr(profile)
  const tdee = bmr * activityFactors[profile.activityLevel]
  const strategy = getStrategy(profile, dayStatus)
  const selectedOffset = dayStatus === 'rest' ? offsets.restDayOffset : offsets.trainingDayOffset
  const calorieTarget = tdee + selectedOffset

  // 1. 蛋白质总是优先固定 (体重 x 系数)
  const proteinGrams = profile.weightKg * strategy.proteinFactor
  const proteinCalories = proteinGrams * 4

  // 2. 根据目标热量计算剩余可用热量
  const remainingCalories = Math.max(calorieTarget - proteinCalories, 0)

  // 3. 计算理想碳水和脂肪的比例基准 (体重 x 系数)
  const idealCarbsCalories = profile.weightKg * strategy.carbsFactor * 4
  const idealFatCalories = profile.weightKg * strategy.fatFactor * 9
  const idealTotalRemaining = idealCarbsCalories + idealFatCalories

  // 4. 按比例分配真实的剩余热量
  let carbsGrams = 0
  let fatGrams = 0

  if (idealTotalRemaining > 0) {
    const carbsRatio = idealCarbsCalories / idealTotalRemaining
    const fatRatio = idealFatCalories / idealTotalRemaining
    
    carbsGrams = (remainingCalories * carbsRatio) / 4
    fatGrams = (remainingCalories * fatRatio) / 9
  }

  const computedTotalCalories = proteinCalories + carbsGrams * 4 + fatGrams * 9

  const proteinPct = (proteinCalories / computedTotalCalories) * 100
  const carbsPct = ((carbsGrams * 4) / computedTotalCalories) * 100
  const fatPct = ((fatGrams * 9) / computedTotalCalories) * 100

  const carbServings = carbsGrams / CARB_GRAMS_PER_SERVING
  const proteinServings = proteinGrams / PROTEIN_GRAMS_PER_SERVING

  return {
    bmr: roundInt(bmr),
    tdee: roundInt(tdee),
    calorieTarget: roundInt(calorieTarget),
    selectedOffset,
    proteinFactor: strategy.proteinFactor,
    dayLabel: strategy.dayLabel,
    macroResult: {
      calories: roundInt(computedTotalCalories),
      proteinGrams: round1(proteinGrams),
      carbsGrams: round1(carbsGrams),
      fatGrams: round1(fatGrams),
      proteinPct: round1(proteinPct),
      carbsPct: round1(carbsPct),
      fatPct: round1(fatPct),
    },
    servingGuide: {
      carbServings: round1(carbServings),
      riceGrams: roundInt(carbServings * 150),
      sweetPotatoCount: round1(carbServings),
      proteinServings: round1(proteinServings),
      chickenGrams: roundInt(proteinServings * 100),
      eggCount: roundInt(proteinServings * 2),
    },
  }
}
