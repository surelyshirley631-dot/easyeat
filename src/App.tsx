import { AnimatePresence, motion } from 'framer-motion'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Clock3,
  Flame,
  Leaf,
  Plus,
  Trash2,
  UserCircle2,
  Wheat,
  Sparkles,
  ArrowUp,
  Loader2,
  Dumbbell,
  Mic,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Cloud,
  CloudLightning,
  CloudOff,
  Database,
} from 'lucide-react'
import {
  buildFuelPlan,
  calculateTdee,
  type ActivityLevel,
  type BiologicalSex,
  type PopulationType,
} from './lib/fuelLogic'
import {
  type StrategyMode,
  type TrainingAnchor,
} from './store/profileStoreTypes'
import { useProfileStore } from './store/useProfileStore'
import { supabase } from './lib/supabase'

type DayMode = 'training' | 'rest'
type MealKey = '早餐' | '午餐' | '晚餐'
type NutrientKey = 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber'
type TrainingWindow = 'early' | 'noon' | 'afternoon' | 'night'
type Locale = 'zh' | 'en' | 'it' | 'es'
type IntakeEntry = Record<NutrientKey, number>
type IntakeMap = Record<MealKey, IntakeEntry>

type TrainingEntry = { plan: string; burnedKcal: number }

const LOCALE_STORAGE_KEY = 'easyeat_locale'
const detectBrowserLocale = (): Locale => {
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('en')) return 'en'
  if (lang.startsWith('it')) return 'it'
  if (lang.startsWith('es')) return 'es'
  return 'zh'
}

const localeLabels: Record<Locale, string> = {
  zh: '中文',
  en: 'English',
  it: 'Italiano',
  es: 'Espanol',
}

const i18n = {
  zh: {
    greeting: '你好',
    lockPrefix: '锁定时段',
    syncing: '同步中...',
    synced: '已保存至云端',
    offline: '离线状态',
    language: '语言',
    dayTraining: '训练日',
    dayRest: '休息日',
    fiber: '膳食纤维',
    consumed: '已摄入',
    target: '目标',
    remaining: '剩余',
    trainingRecord: '训练记录',
    trainingPlan: '训练计划',
    trainingPlanPlaceholder: '如：胸背超级组 / 跑步 5km',
    burnedKcal: '消耗热量 (kcal)',
    savedToLocal: '已保存到本地',
    profileNew: '新建档案',
    clearAll: '清除所有数据',
    uploadFoodDB: '上传自定义食物库 (CSV/JSON)',
    voiceNotSupported: '您的浏览器不支持语音输入',
    uploadSuccess: '成功导入',
    uploadRecordsSuffix: '条自定义食物数据',
    uploadFailed: '文件解析失败，请确保格式正确(支持 JSON 或 CSV。CSV列顺序为: 食物名称,热量,蛋白质,碳水,脂肪,纤维)',
    inputPlaceholder: '今天中午吃了一碗牛肉面...',
    unsupportedFileType: '不支持的文件格式',
    unknownFood: '未知食物',
    noFoodRecognized: '未识别到具体食物',
    preciseCalc: '精确计算',
    manualRecordHint: '点击手动记录',
    carbSuggestionPrefix: '建议碳水约',
    nutrientKcal: '热量',
    nutrientProtein: '蛋白',
    nutrientCarbs: '碳水',
    nutrientFat: '脂肪',
    nutrientFiber: '纤维',
    winEarly: '早起练',
    winNoon: '午间练',
    winAfternoon: '下午练',
    winNight: '晚后练',
    ringKcal: '热量',
    ringProtein: '蛋白质',
    ringCarbs: '碳水',
    ringFat: '脂肪',
    onboardingTitle: '开始你的精密减脂',
    onboardingSubForm: '输入基本信息以计算你的专属代谢模型',
    onboardingSubReview: '预览系统为你计算的动态碳水循环方案',
    fieldName: '姓名',
    fieldSex: '性别',
    fieldAge: '年龄',
    fieldHeight: '身高 (cm)',
    fieldWeight: '体重 (kg)',
    fieldActivity: '活动系数',
    fieldPopulation: '人群属性',
    fieldAnchor: '训练时机预设',
    fieldTrainOffset: '训练日热量偏移',
    fieldRestOffset: '休息日热量偏移',
    male: '男性',
    female: '女性',
    populationStrength: '力量训练者',
    populationGeneral: '普通人群',
    nextPlan: '生成我的代谢模型与方案',
  },
  en: {
    greeting: 'Hello',
    lockPrefix: 'Locked window',
    syncing: 'Syncing...',
    synced: 'Saved to cloud',
    offline: 'Offline',
    language: 'Language',
    dayTraining: 'Training',
    dayRest: 'Rest',
    fiber: 'Fiber',
    consumed: 'Consumed',
    target: 'Target',
    remaining: 'Remaining',
    trainingRecord: 'Workout Log',
    trainingPlan: 'Workout Plan',
    trainingPlanPlaceholder: 'e.g. Chest/Back superset or 5km run',
    burnedKcal: 'Calories Burned (kcal)',
    savedToLocal: 'Saved to local',
    profileNew: 'New Profile',
    clearAll: 'Clear All Data',
    uploadFoodDB: 'Upload custom food DB (CSV/JSON)',
    voiceNotSupported: 'Your browser does not support voice input',
    uploadSuccess: 'Imported',
    uploadRecordsSuffix: 'custom food records',
    uploadFailed: 'Failed to parse file. Use JSON or CSV (columns: food,kcal,protein,carbs,fat,fiber).',
    inputPlaceholder: 'I had beef noodles for lunch...',
    unsupportedFileType: 'Unsupported file type',
    unknownFood: 'Unknown food',
    noFoodRecognized: 'No food recognized',
    preciseCalc: 'Precise calc',
    manualRecordHint: 'Tap to record manually',
    carbSuggestionPrefix: 'Suggested carbs',
    nutrientKcal: 'Calories',
    nutrientProtein: 'Protein',
    nutrientCarbs: 'Carbs',
    nutrientFat: 'Fat',
    nutrientFiber: 'Fiber',
    winEarly: 'Early',
    winNoon: 'Noon',
    winAfternoon: 'Afternoon',
    winNight: 'Night',
    ringKcal: 'Calories',
    ringProtein: 'Protein',
    ringCarbs: 'Carbs',
    ringFat: 'Fat',
    onboardingTitle: 'Start Your Fat Loss Plan',
    onboardingSubForm: 'Enter basic info to build your metabolism model',
    onboardingSubReview: 'Preview your dynamic carb-cycling plan',
    fieldName: 'Name',
    fieldSex: 'Sex',
    fieldAge: 'Age',
    fieldHeight: 'Height (cm)',
    fieldWeight: 'Weight (kg)',
    fieldActivity: 'Activity Level',
    fieldPopulation: 'Population Type',
    fieldAnchor: 'Training Window',
    fieldTrainOffset: 'Training Day Calorie Offset',
    fieldRestOffset: 'Rest Day Calorie Offset',
    male: 'Male',
    female: 'Female',
    populationStrength: 'Strength Athlete',
    populationGeneral: 'General Population',
    nextPlan: 'Generate My Plan',
  },
  it: {
    greeting: 'Ciao',
    lockPrefix: 'Fascia bloccata',
    syncing: 'Sincronizzazione...',
    synced: 'Salvato nel cloud',
    offline: 'Offline',
    language: 'Lingua',
    dayTraining: 'Allenamento',
    dayRest: 'Riposo',
    fiber: 'Fibre',
    consumed: 'Assunto',
    target: 'Obiettivo',
    remaining: 'Rimanente',
    trainingRecord: 'Registro Allenamento',
    trainingPlan: 'Piano Allenamento',
    trainingPlanPlaceholder: 'es. Superset petto/schiena o corsa 5km',
    burnedKcal: 'Calorie Bruciate (kcal)',
    savedToLocal: 'Salvato in locale',
    profileNew: 'Nuovo Profilo',
    clearAll: 'Cancella Tutto',
    uploadFoodDB: 'Carica database cibi (CSV/JSON)',
    voiceNotSupported: 'Il browser non supporta l input vocale',
    uploadSuccess: 'Importati',
    uploadRecordsSuffix: 'record alimentari personalizzati',
    uploadFailed: 'Errore di parsing file. Usa JSON o CSV (colonne: cibo,kcal,proteine,carboidrati,grassi,fibre).',
    inputPlaceholder: 'Ho mangiato noodles di manzo a pranzo...',
    unsupportedFileType: 'Formato file non supportato',
    unknownFood: 'Cibo sconosciuto',
    noFoodRecognized: 'Nessun alimento riconosciuto',
    preciseCalc: 'Calcolo preciso',
    manualRecordHint: 'Tocca per inserire manualmente',
    carbSuggestionPrefix: 'Carboidrati consigliati',
    nutrientKcal: 'Calorie',
    nutrientProtein: 'Proteine',
    nutrientCarbs: 'Carboidrati',
    nutrientFat: 'Grassi',
    nutrientFiber: 'Fibre',
    winEarly: 'Mattina',
    winNoon: 'Mezzogiorno',
    winAfternoon: 'Pomeriggio',
    winNight: 'Sera',
    ringKcal: 'Calorie',
    ringProtein: 'Proteine',
    ringCarbs: 'Carboidrati',
    ringFat: 'Grassi',
    onboardingTitle: 'Inizia il tuo percorso',
    onboardingSubForm: 'Inserisci i dati base per il tuo modello metabolico',
    onboardingSubReview: 'Anteprima del piano dinamico di carboidrati',
    fieldName: 'Nome',
    fieldSex: 'Sesso',
    fieldAge: 'Eta',
    fieldHeight: 'Altezza (cm)',
    fieldWeight: 'Peso (kg)',
    fieldActivity: 'Livello Attivita',
    fieldPopulation: 'Tipo di Popolazione',
    fieldAnchor: 'Finestra Allenamento',
    fieldTrainOffset: 'Offset Calorie Giorno Allenamento',
    fieldRestOffset: 'Offset Calorie Giorno Riposo',
    male: 'Maschio',
    female: 'Femmina',
    populationStrength: 'Atleta di Forza',
    populationGeneral: 'Popolazione Generale',
    nextPlan: 'Genera il mio piano',
  },
  es: {
    greeting: 'Hola',
    lockPrefix: 'Franja bloqueada',
    syncing: 'Sincronizando...',
    synced: 'Guardado en la nube',
    offline: 'Sin conexion',
    language: 'Idioma',
    dayTraining: 'Entreno',
    dayRest: 'Descanso',
    fiber: 'Fibra',
    consumed: 'Consumido',
    target: 'Objetivo',
    remaining: 'Restante',
    trainingRecord: 'Registro de Entreno',
    trainingPlan: 'Plan de Entreno',
    trainingPlanPlaceholder: 'ej. Superserie pecho/espalda o correr 5km',
    burnedKcal: 'Calorias Quemadas (kcal)',
    savedToLocal: 'Guardado localmente',
    profileNew: 'Nuevo Perfil',
    clearAll: 'Borrar Todo',
    uploadFoodDB: 'Subir base de alimentos (CSV/JSON)',
    voiceNotSupported: 'Tu navegador no admite entrada de voz',
    uploadSuccess: 'Importados',
    uploadRecordsSuffix: 'registros de alimentos personalizados',
    uploadFailed: 'Error al analizar archivo. Usa JSON o CSV (columnas: alimento,kcal,proteina,carbohidratos,grasa,fibra).',
    inputPlaceholder: 'Comi fideos con carne al almuerzo...',
    unsupportedFileType: 'Tipo de archivo no compatible',
    unknownFood: 'Alimento desconocido',
    noFoodRecognized: 'No se reconocieron alimentos',
    preciseCalc: 'Calculo preciso',
    manualRecordHint: 'Toca para registrar manualmente',
    carbSuggestionPrefix: 'Carbohidratos sugeridos',
    nutrientKcal: 'Calorias',
    nutrientProtein: 'Proteina',
    nutrientCarbs: 'Carbohidratos',
    nutrientFat: 'Grasa',
    nutrientFiber: 'Fibra',
    winEarly: 'Temprano',
    winNoon: 'Mediodia',
    winAfternoon: 'Tarde',
    winNight: 'Noche',
    ringKcal: 'Calorias',
    ringProtein: 'Proteina',
    ringCarbs: 'Carbohidratos',
    ringFat: 'Grasa',
    onboardingTitle: 'Comienza tu plan',
    onboardingSubForm: 'Ingresa datos basicos para tu modelo metabolico',
    onboardingSubReview: 'Vista previa del plan dinamico de carbohidratos',
    fieldName: 'Nombre',
    fieldSex: 'Sexo',
    fieldAge: 'Edad',
    fieldHeight: 'Altura (cm)',
    fieldWeight: 'Peso (kg)',
    fieldActivity: 'Nivel de Actividad',
    fieldPopulation: 'Tipo de Poblacion',
    fieldAnchor: 'Franja de Entreno',
    fieldTrainOffset: 'Ajuste de Calorias Dia de Entreno',
    fieldRestOffset: 'Ajuste de Calorias Dia de Descanso',
    male: 'Hombre',
    female: 'Mujer',
    populationStrength: 'Atleta de Fuerza',
    populationGeneral: 'Poblacion General',
    nextPlan: 'Generar mi plan',
  },
} as const

const meals: MealKey[] = ['早餐', '午餐', '晚餐']

const defaultIntake: IntakeMap = {
  早餐: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  午餐: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  晚餐: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
}

const defaultTraining: TrainingEntry = { plan: '', burnedKcal: 0 }

const anchorToWindow = (anchor: TrainingAnchor): TrainingWindow => {
  if (anchor === '上午') {
    return 'early'
  }
  if (anchor === '中午') {
    return 'noon'
  }
  if (anchor === '下午') {
    return 'afternoon'
  }
  return 'night'
}

const windowToLabel = (window: TrainingWindow, locale: Locale) => {
  const key =
    window === 'early'
      ? 'winEarly'
      : window === 'noon'
      ? 'winNoon'
      : window === 'afternoon'
      ? 'winAfternoon'
      : 'winNight'
  return i18n[locale][key]
}

  const cardStyle =
  'rounded-[24px] border border-[#EEF0F4] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)]'

function App() {
  const {
    profiles,
    activeProfile,
    activeProfileId,
    hasProfiles,
    setActiveProfileId,
    createProfile,
    updateProfile,
    clearAllProfiles,
  } = useProfileStore()
  const [dayMode, setDayMode] = useState<DayMode>('training')
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle')
  const [intakeByContext, setIntakeByContext] = useState<Record<string, IntakeMap>>({})
  const [trainingByContext, setTrainingByContext] = useState<Record<string, TrainingEntry>>({})
  const [onboardingStep, setOnboardingStep] = useState<'form' | 'review'>('form')
  const [trainingWindowByProfile, setTrainingWindowByProfile] = useState<
    Record<string, TrainingWindow>
  >({})
  const [onboardingForm, setOnboardingForm] = useState({
    name: '',
    sex: 'female' as BiologicalSex,
    age: '28',
    heightCm: '170',
    weightKg: '65',
    activityLevel: 'moderate' as ActivityLevel,
    populationType: 'strength' as PopulationType,
    trainingAnchor: '下午' as TrainingAnchor,
    trainingDayOffset: '200',
    restDayOffset: '-1000',
    customTrainingKcal: '',
    customTrainingProtein: '',
    customTrainingCarbs: '',
    customTrainingFat: '',
    customRestKcal: '',
    customRestProtein: '',
    customRestCarbs: '',
    customRestFat: '',
  })
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null
    return saved && saved in i18n ? saved : detectBrowserLocale()
  })
  const t = i18n[locale]

  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  }, [locale])

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []) // Format: YYYY-MM-DD
  const contextKey = `${activeProfileId ?? 'none'}:${dayMode}`
  const intake = intakeByContext[contextKey] ?? defaultIntake
  const training = trainingByContext[contextKey] ?? defaultTraining
  const activeTrainingWindow =
    trainingWindowByProfile[activeProfileId ?? ''] ??
    anchorToWindow(activeProfile?.trainingAnchor ?? '下午')

  useEffect(() => {
    if (!activeProfileId) return

    supabase
      .from('DailyLog')
      .select('*, meals:MealIntake(*)')
      .eq('profileId', activeProfileId)
      .eq('date', todayStr)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to fetch daily log:', error)
          setSyncStatus('error')
          return
        }

        if (!data) return
        
        // Restore dayMode
        setDayMode(data.dayMode as DayMode)
        const ctxKey = `${activeProfileId}:${data.dayMode}`
        
        // Restore training
        setTrainingByContext((prev) => ({
          ...prev,
          [ctxKey]: { plan: data.trainingPlan || '', burnedKcal: data.burnedKcal || 0 },
        }))

        // Restore intake
        const newIntake = { ...defaultIntake }
        if (Array.isArray(data.meals)) {
          data.meals.forEach((m: any) => {
            if (newIntake[m.mealType as MealKey]) {
              newIntake[m.mealType as MealKey] = {
                kcal: m.kcal,
                protein: m.protein,
                carbs: m.carbs,
                fat: m.fat,
                fiber: m.fiber,
              }
            }
          })
        }
        setIntakeByContext((prev) => ({ ...prev, [ctxKey]: newIntake }))
        setSyncStatus('synced')
      })
  }, [activeProfileId, todayStr])

  useEffect(() => {
    if (!activeProfileId) return

    const currentIntake = intakeByContext[contextKey]
    const currentTraining = trainingByContext[contextKey]

    if (!currentIntake && !currentTraining) return

    setSyncStatus('syncing')
    const timeoutId = setTimeout(async () => {
      const mealsToSave = meals.map((m) => ({
        mealType: m,
        ...(currentIntake?.[m] || defaultIntake[m]),
      }))

      try {
        // 1. Get or create DailyLog
        let { data: dailyLog, error: fetchError } = await supabase
          .from('DailyLog')
          .select('id')
          .eq('profileId', activeProfileId)
          .eq('date', todayStr)
          .maybeSingle()

        if (fetchError) throw fetchError

        if (dailyLog) {
          const { error: updateError } = await supabase
            .from('DailyLog')
            .update({
              dayMode,
              trainingPlan: currentTraining?.plan || '',
              burnedKcal: currentTraining?.burnedKcal || 0,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', dailyLog.id)

          if (updateError) throw updateError
        } else {
          const { data: newLog, error: insertError } = await supabase
            .from('DailyLog')
            .insert({
              profileId: activeProfileId,
              date: todayStr,
              dayMode,
              trainingPlan: currentTraining?.plan || '',
              burnedKcal: currentTraining?.burnedKcal || 0,
            })
            .select('id')
            .single()

          if (insertError) throw insertError
          dailyLog = newLog
        }

        // 2. Upsert Meals
        if (dailyLog && dailyLog.id) {
          for (const meal of mealsToSave) {
            const { data: existingMeal, error: mealFetchError } = await supabase
              .from('MealIntake')
              .select('id')
              .eq('dailyLogId', dailyLog.id)
              .eq('mealType', meal.mealType)
              .maybeSingle()

            if (mealFetchError) throw mealFetchError

            if (existingMeal) {
              await supabase
                .from('MealIntake')
                .update({
                  kcal: meal.kcal,
                  protein: meal.protein,
                  carbs: meal.carbs,
                  fat: meal.fat,
                  fiber: meal.fiber,
                })
                .eq('id', existingMeal.id)
            } else {
              await supabase
                .from('MealIntake')
                .insert({
                  dailyLogId: dailyLog.id,
                  mealType: meal.mealType,
                  kcal: meal.kcal,
                  protein: meal.protein,
                  carbs: meal.carbs,
                  fat: meal.fat,
                  fiber: meal.fiber,
                })
            }
          }
        }
        
        setSyncStatus('synced')
      } catch (err) {
        console.error('Failed to sync log to Supabase:', err)
        setSyncStatus('error')
      }
    }, 1200)

    return () => clearTimeout(timeoutId)
  }, [intakeByContext, trainingByContext, dayMode, activeProfileId, todayStr, contextKey])

  const profileForEngine = useMemo(() => {
    if (!activeProfile) {
      return null
    }
    return {
      age: activeProfile.age,
      heightCm: activeProfile.heightCm,
      weightKg: activeProfile.weightKg,
      sex: activeProfile.sex,
      populationType: activeProfile.populationType,
      activityLevel: activeProfile.activityLevel,
    }
  }, [activeProfile])

  const tdee = useMemo(() => {
    if (!profileForEngine) {
      return 0
    }
    return Math.round(calculateTdee(profileForEngine))
  }, [profileForEngine])

  const plan = useMemo(() => {
    if (!profileForEngine || !activeProfile) {
      return null
    }
    const computedPlan = buildFuelPlan(
      profileForEngine,
      dayMode === 'training' ? 'strength_training' : 'rest',
      activeProfile.offsets,
    )

    // Override with custom targets if they exist
    if (activeProfile.customTargets) {
      const custom = dayMode === 'training' ? activeProfile.customTargets.training : activeProfile.customTargets.rest
      if (custom.kcal > 0) {
        computedPlan.calorieTarget = custom.kcal
        computedPlan.macroResult.proteinGrams = custom.protein || computedPlan.macroResult.proteinGrams
        computedPlan.macroResult.carbsGrams = custom.carbs || computedPlan.macroResult.carbsGrams
        computedPlan.macroResult.fatGrams = custom.fat || computedPlan.macroResult.fatGrams
      }
    }

    return computedPlan
  }, [activeProfile, dayMode, profileForEngine])

  const consumedTotals = useMemo(() => {
    return meals.reduce(
      (acc, meal) => ({
        kcal: acc.kcal + intake[meal].kcal,
        protein: acc.protein + intake[meal].protein,
        carbs: acc.carbs + intake[meal].carbs,
        fat: acc.fat + intake[meal].fat,
        fiber: acc.fiber + intake[meal].fiber,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    )
  }, [intake])

  const fiberTarget = useMemo(() => {
    if (!plan) {
      return 0
    }
    return Math.max(20, Math.round(plan.calorieTarget * 0.014))
  }, [plan])

  const remaining = useMemo(() => {
    if (!plan) {
      return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    }
    return {
      kcal: Math.round(plan.calorieTarget - consumedTotals.kcal),
      protein: Math.round(plan.macroResult.proteinGrams - consumedTotals.protein),
      carbs: Math.round(plan.macroResult.carbsGrams - consumedTotals.carbs),
      fat: Math.round(plan.macroResult.fatGrams - consumedTotals.fat),
      fiber: Math.round(fiberTarget - consumedTotals.fiber),
    }
  }, [consumedTotals, fiberTarget, plan])

  const ringStats = useMemo(() => {
    if (!plan) {
      return []
    }
    return [
      {
        label: t.ringKcal,
        color: '#FF3B30',
        consumed: consumedTotals.kcal,
        target: plan.calorieTarget,
        remain: remaining.kcal,
        unit: 'kcal',
      },
      {
        label: t.ringProtein,
        color: '#FF9500',
        consumed: consumedTotals.protein,
        target: Math.round(plan.macroResult.proteinGrams),
        remain: remaining.protein,
        unit: 'g',
      },
      {
        label: t.ringCarbs,
        color: '#FFCC00',
        consumed: consumedTotals.carbs,
        target: Math.round(plan.macroResult.carbsGrams),
        remain: remaining.carbs,
        unit: 'g',
      },
      {
        label: t.ringFat,
        color: '#007AFF',
        consumed: consumedTotals.fat,
        target: Math.round(plan.macroResult.fatGrams),
        remain: remaining.fat,
        unit: 'g',
      },
    ]
  }, [consumedTotals, plan, remaining, t])

  const carbDistribution = useMemo(() => {
    if (!plan || !activeProfile) {
      return defaultIntake
    }
    const ratios =
      dayMode === 'rest'
        ? [0.34, 0.33, 0.33]
        : activeTrainingWindow === 'early'
          ? [0.45, 0.35, 0.2]
          : activeTrainingWindow === 'noon'
            ? [0.38, 0.4, 0.22]
            : activeTrainingWindow === 'afternoon'
            ? [0.3, 0.45, 0.25]
            : [0.25, 0.35, 0.4]
    const total = plan.macroResult.carbsGrams
    return {
      早餐: { ...defaultIntake.早餐, carbs: Math.round(total * ratios[0]) },
      午餐: { ...defaultIntake.午餐, carbs: Math.round(total * ratios[1]) },
      晚餐: { ...defaultIntake.晚餐, carbs: Math.round(total * ratios[2]) },
    }
  }, [activeProfile, activeTrainingWindow, dayMode, plan])

  const openCreateFlow = () => {
    setOnboardingForm({
      name: '',
      sex: 'female',
      age: '28',
      heightCm: '170',
      weightKg: '65',
      activityLevel: 'moderate',
      populationType: 'strength',
      trainingAnchor: '下午',
      trainingDayOffset: '200',
      restDayOffset: '-1000',
      customTrainingKcal: '',
      customTrainingProtein: '',
      customTrainingCarbs: '',
      customTrainingFat: '',
      customRestKcal: '',
      customRestProtein: '',
      customRestCarbs: '',
      customRestFat: '',
    })
    setOnboardingStep('form')
    setEditingProfileId(null)
    setModalOpen(true)
  }

  // Removed old ProfileForm specific helpers

  const resetAll = () => {
    clearAllProfiles()
    openCreateFlow()
  }

  const setMealValue = (meal: MealKey, key: NutrientKey, value: string) => {
    const numeric = Number(value)
    setIntakeByContext((prev) => ({
      ...prev,
      [contextKey]: {
        早餐: { ...(prev[contextKey]?.早餐 ?? defaultIntake.早餐) },
        午餐: { ...(prev[contextKey]?.午餐 ?? defaultIntake.午餐) },
        晚餐: { ...(prev[contextKey]?.晚餐 ?? defaultIntake.晚餐) },
        [meal]: {
          ...(prev[contextKey]?.[meal] ?? defaultIntake[meal]),
          [key]: Number.isNaN(numeric) ? 0 : numeric,
        },
      },
    }))
  }

  const addMealIntake = (meal: MealKey, added: IntakeEntry) => {
    setIntakeByContext((prev) => {
      const currentContext = prev[contextKey] ?? defaultIntake
      const currentMeal = currentContext[meal] ?? defaultIntake[meal]
      return {
        ...prev,
        [contextKey]: {
          ...currentContext,
          [meal]: {
            kcal: currentMeal.kcal + added.kcal,
            protein: currentMeal.protein + added.protein,
            carbs: currentMeal.carbs + added.carbs,
            fat: currentMeal.fat + added.fat,
            fiber: currentMeal.fiber + added.fiber,
          },
        },
      }
    })
  }

  const setTrainingValue = (key: keyof TrainingEntry, value: string | number) => {
    setTrainingByContext((prev) => ({
      ...prev,
      [contextKey]: {
        ...(prev[contextKey] ?? defaultTraining),
        [key]: value,
      },
    }))
  }

  const createOrUpdateProfile = () => {
    const age = Math.round(Number(onboardingForm.age))
    const heightCm = Number(onboardingForm.heightCm)
    const weightKg = Number(onboardingForm.weightKg)
    const trainingDayOffset = Number(onboardingForm.trainingDayOffset)
    const restDayOffset = Number(onboardingForm.restDayOffset)

    if (
      !onboardingForm.name.trim() ||
      Number.isNaN(age) ||
      Number.isNaN(heightCm) ||
      Number.isNaN(weightKg) ||
      Number.isNaN(trainingDayOffset) ||
      Number.isNaN(restDayOffset)
    ) {
      return
    }

    const tKcal = Number(onboardingForm.customTrainingKcal)
    const tPro = Number(onboardingForm.customTrainingProtein)
    const tCarb = Number(onboardingForm.customTrainingCarbs)
    const tFat = Number(onboardingForm.customTrainingFat)
    
    const rKcal = Number(onboardingForm.customRestKcal)
    const rPro = Number(onboardingForm.customRestProtein)
    const rCarb = Number(onboardingForm.customRestCarbs)
    const rFat = Number(onboardingForm.customRestFat)

    const hasCustom = tKcal > 0 || rKcal > 0

    const profileData = {
      name: onboardingForm.name.trim(),
      sex: onboardingForm.sex,
      age,
      heightCm,
      weightKg,
      populationType: onboardingForm.populationType,
      activityLevel: onboardingForm.activityLevel,
      strategyMode: 'custom' as StrategyMode,
      trainingAnchor: onboardingForm.trainingAnchor,
      offsets: {
        trainingDayOffset,
        restDayOffset,
      },
      customTargets: hasCustom ? {
        training: {
          kcal: tKcal,
          protein: tPro,
          carbs: tCarb,
          fat: tFat
        },
        rest: {
          kcal: rKcal,
          protein: rPro,
          carbs: rCarb,
          fat: rFat
        }
      } : undefined
    }

    setOnboardingSubmitting(true)
    window.setTimeout(() => {
      if (editingProfileId) {
        updateProfile(editingProfileId, profileData)
        setModalOpen(false)
        setShowSaved(true)
        setTimeout(() => setShowSaved(false), 1400)
      } else {
        createProfile(profileData)
      }
      setOnboardingSubmitting(false)
    }, 260)
  }

  const reviewPlanData = useMemo(() => {
    const profile = {
      age: Number(onboardingForm.age) || 28,
      heightCm: Number(onboardingForm.heightCm) || 170,
      weightKg: Number(onboardingForm.weightKg) || 65,
      sex: onboardingForm.sex,
      populationType: onboardingForm.populationType,
      activityLevel: onboardingForm.activityLevel,
    }
    const bmr = Math.round(
      10 * profile.weightKg +
        6.25 * profile.heightCm -
        5 * profile.age +
        (profile.sex === 'male' ? 5 : -161),
    )
    const tdee = Math.round(calculateTdee(profile))
    
    const offsets = {
      trainingDayOffset: Number(onboardingForm.trainingDayOffset) || 0,
      restDayOffset: Number(onboardingForm.restDayOffset) || 0,
    }
    const trainingPlan = buildFuelPlan(profile, 'strength_training', offsets)
    const restPlan = buildFuelPlan(profile, 'rest', offsets)
    
    return { bmr, tdee, trainingPlan, restPlan }
  }, [onboardingForm])

  if (!hasProfiles) {
    return (
      <AnimatePresence mode="wait">
        <motion.main
          key="onboarding"
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 1, scale: onboardingSubmitting ? 0.985 : 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="min-h-screen bg-white px-4 py-10 text-[#1C1C1E]"
        >
          <div className="mx-auto max-w-3xl">
            <div className={`${cardStyle} p-8`}>
              <div className="mb-4 flex justify-end">
                <label className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs text-[#8E8E93] shadow-[0_4px_15px_rgba(0,0,0,0.05)]">
                  <span>{t.language}</span>
                  <select
                    value={locale}
                    onChange={(event) => setLocale(event.target.value as Locale)}
                    className="bg-transparent text-[#1C1C1E] outline-none"
                  >
                    {(Object.keys(localeLabels) as Locale[]).map((key) => (
                      <option key={key} value={key}>
                        {localeLabels[key]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF2F0]">
                  <Flame className="h-11 w-11 text-[#FF9500]" />
                </div>
                <h1 className="text-3xl font-semibold">{t.onboardingTitle}</h1>
                <p className="mt-2 text-sm text-[#8E8E93]">
                  {onboardingStep === 'form' ? t.onboardingSubForm : t.onboardingSubReview}
                </p>
              </div>

              {onboardingStep === 'form' ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <OnboardingInput
                      label={t.fieldName}
                      value={onboardingForm.name}
                      onChange={(value) =>
                        setOnboardingForm((prev) => ({ ...prev, name: value }))
                      }
                    />
                    <label className="space-y-2">
                      <span className="text-sm text-[#8E8E93]">{t.fieldSex}</span>
                      <select
                        value={onboardingForm.sex}
                        onChange={(event) =>
                          setOnboardingForm((prev) => ({
                            ...prev,
                            sex: event.target.value as BiologicalSex,
                          }))
                        }
                        className="w-full rounded-xl border border-[#E6E6EA] px-3 py-2 outline-none focus:border-[#007AFF]"
                      >
                        <option value="male">{t.male}</option>
                        <option value="female">{t.female}</option>
                      </select>
                    </label>
                    <OnboardingInput
                      label={t.fieldAge}
                      value={onboardingForm.age}
                      onChange={(value) =>
                        setOnboardingForm((prev) => ({ ...prev, age: value }))
                      }
                      numeric
                    />
                    <OnboardingInput
                      label={t.fieldHeight}
                      value={onboardingForm.heightCm}
                      onChange={(value) =>
                        setOnboardingForm((prev) => ({ ...prev, heightCm: value }))
                      }
                      numeric
                    />
                    <OnboardingInput
                      label={t.fieldWeight}
                      value={onboardingForm.weightKg}
                      onChange={(value) =>
                        setOnboardingForm((prev) => ({ ...prev, weightKg: value }))
                      }
                      numeric
                    />
                    <label className="space-y-2">
                      <span className="text-sm text-[#8E8E93]">{t.fieldActivity}</span>
                      <select
                        value={onboardingForm.activityLevel}
                        onChange={(event) =>
                          setOnboardingForm((prev) => ({
                            ...prev,
                            activityLevel: event.target.value as ActivityLevel,
                          }))
                        }
                        className="w-full rounded-xl border border-[#E6E6EA] px-3 py-2 outline-none focus:border-[#007AFF]"
                      >
                        <option value="sedentary">久坐 1.2</option>
                        <option value="light">轻度活动 1.375</option>
                        <option value="moderate">中度活动 1.55</option>
                        <option value="high">高强度活动 1.725</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-[#8E8E93]">{t.fieldPopulation}</span>
                      <select
                        value={onboardingForm.populationType}
                        onChange={(event) =>
                          setOnboardingForm((prev) => ({
                            ...prev,
                            populationType: event.target.value as PopulationType,
                          }))
                        }
                        className="w-full rounded-xl border border-[#E6E6EA] px-3 py-2 outline-none focus:border-[#007AFF]"
                      >
                        <option value="strength">{t.populationStrength}</option>
                        <option value="general">{t.populationGeneral}</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-[#8E8E93]">{t.fieldAnchor}</span>
                      <select
                        value={onboardingForm.trainingAnchor}
                        onChange={(event) =>
                          setOnboardingForm((prev) => ({
                            ...prev,
                            trainingAnchor: event.target.value as TrainingAnchor,
                          }))
                        }
                        className="w-full rounded-xl border border-[#E6E6EA] px-3 py-2 outline-none focus:border-[#007AFF]"
                      >
                        <option value="上午">早起练</option>
                        <option value="中午">午间练</option>
                        <option value="下午">下午练</option>
                        <option value="晚后">晚后练</option>
                      </select>
                    </label>
                    <OnboardingInput
                      label={t.fieldTrainOffset}
                      value={onboardingForm.trainingDayOffset}
                      onChange={(value) =>
                        setOnboardingForm((prev) => ({ ...prev, trainingDayOffset: value }))
                      }
                      numeric
                    />
                    <OnboardingInput
                      label={t.fieldRestOffset}
                      value={onboardingForm.restDayOffset}
                      onChange={(value) =>
                        setOnboardingForm((prev) => ({ ...prev, restDayOffset: value }))
                      }
                      numeric
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (onboardingForm.name.trim()) setOnboardingStep('review')
                    }}
                    className="mt-7 w-full rounded-xl bg-[#007AFF] py-3 text-sm font-medium text-white disabled:opacity-50"
                    disabled={!onboardingForm.name.trim()}
                  >
                    {t.nextPlan}
                  </button>
                </>
              ) : (
                <div className="space-y-6">
                  {/* Explanation Card */}
                  <div className="rounded-xl bg-[#F9FAFD] p-5">
                    <h3 className="mb-3 text-[15px] font-medium text-[#1C1C1E]">1. 你的基础代谢与消耗</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#8E8E93]">基础代谢 (BMR)</span>
                        <span className="font-medium">{reviewPlanData.bmr} kcal</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8E8E93]">每日总消耗 (TDEE) = BMR × 活动系数</span>
                        <span className="font-medium">{reviewPlanData.tdee} kcal</span>
                      </div>
                    </div>
                  </div>

                  {/* Plan Review */}
                  <div>
                    <h3 className="mb-3 text-[15px] font-medium text-[#1C1C1E]">2. 系统推荐营养素方案</h3>
                    <p className="mb-4 text-xs text-[#8E8E93]">基于动态碳水循环算法，系统为你计算了以下目标。如果不需要修改，直接点击完成即可。</p>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Training Day Box */}
                      <div className="rounded-xl border border-[#EEF0F4] p-4">
                        <p className="mb-3 font-medium text-[#1C1C1E]">训练日 (TDEE + {onboardingForm.trainingDayOffset})</p>
                        <div className="space-y-3">
                          <OverrideInput 
                            label="总热量" 
                            val={onboardingForm.customTrainingKcal} 
                            placeholder={String(Math.round(reviewPlanData.trainingPlan.calorieTarget))}
                            onChange={(val) => setOnboardingForm(p => ({ ...p, customTrainingKcal: val }))}
                          />
                          <OverrideInput 
                            label="蛋白(g)" 
                            val={onboardingForm.customTrainingProtein} 
                            placeholder={String(Math.round(reviewPlanData.trainingPlan.macroResult.proteinGrams))}
                            onChange={(val) => setOnboardingForm(p => ({ ...p, customTrainingProtein: val }))}
                          />
                          <OverrideInput 
                            label="碳水(g)" 
                            val={onboardingForm.customTrainingCarbs} 
                            placeholder={String(Math.round(reviewPlanData.trainingPlan.macroResult.carbsGrams))}
                            onChange={(val) => setOnboardingForm(p => ({ ...p, customTrainingCarbs: val }))}
                          />
                          <OverrideInput 
                            label="脂肪(g)" 
                            val={onboardingForm.customTrainingFat} 
                            placeholder={String(Math.round(reviewPlanData.trainingPlan.macroResult.fatGrams))}
                            onChange={(val) => setOnboardingForm(p => ({ ...p, customTrainingFat: val }))}
                          />
                        </div>
                      </div>

                      {/* Rest Day Box */}
                      <div className="rounded-xl border border-[#EEF0F4] p-4">
                        <p className="mb-3 font-medium text-[#1C1C1E]">休息日 (TDEE {onboardingForm.restDayOffset})</p>
                        <div className="space-y-3">
                          <OverrideInput 
                            label="总热量" 
                            val={onboardingForm.customRestKcal} 
                            placeholder={String(Math.round(reviewPlanData.restPlan.calorieTarget))}
                            onChange={(val) => setOnboardingForm(p => ({ ...p, customRestKcal: val }))}
                          />
                          <OverrideInput 
                            label="蛋白(g)" 
                            val={onboardingForm.customRestProtein} 
                            placeholder={String(Math.round(reviewPlanData.restPlan.macroResult.proteinGrams))}
                            onChange={(val) => setOnboardingForm(p => ({ ...p, customRestProtein: val }))}
                          />
                          <OverrideInput 
                            label="碳水(g)" 
                            val={onboardingForm.customRestCarbs} 
                            placeholder={String(Math.round(reviewPlanData.restPlan.macroResult.carbsGrams))}
                            onChange={(val) => setOnboardingForm(p => ({ ...p, customRestCarbs: val }))}
                          />
                          <OverrideInput 
                            label="脂肪(g)" 
                            val={onboardingForm.customRestFat} 
                            placeholder={String(Math.round(reviewPlanData.restPlan.macroResult.fatGrams))}
                            onChange={(val) => setOnboardingForm(p => ({ ...p, customRestFat: val }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setOnboardingStep('form')}
                      className="flex-1 rounded-xl bg-[#F2F2F7] py-3 text-sm font-medium text-[#1C1C1E]"
                    >
                      返回修改
                    </button>
                    <button
                      onClick={createOrUpdateProfile}
                      className="flex-1 rounded-xl bg-[#007AFF] py-3 text-sm font-medium text-white"
                    >
                      {editingProfileId ? '保存更改' : '确认无误，进入应用'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.main>
      </AnimatePresence>
    )
  }

  if (!activeProfile || !plan) {
    return null
  }

  return (
    <main className="min-h-screen bg-[#F4F6FB] px-4 py-8 text-[#1C1C1E]">
      <div className="mx-auto max-w-[1000px]">
        <header className="mb-6 flex items-center justify-between px-2">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight">{t.greeting}，{activeProfile.name}</h1>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[14px] text-[#8E8E93]">
              <Clock3 className="h-4 w-4 text-[#007AFF]" />
              {t.lockPrefix}: {windowToLabel(anchorToWindow(activeProfile.trainingAnchor), locale)} · BMR {plan.bmr} · TDEE {tdee}
              <span className="ml-2 inline-flex items-center gap-1 text-[12px] font-medium">
                {syncStatus === 'syncing' ? (
                  <span className="text-[#007AFF] animate-pulse inline-flex items-center gap-1"><CloudLightning className="h-3 w-3" /> {t.syncing}</span>
                ) : syncStatus === 'synced' ? (
                  <span className="text-[#34C759] inline-flex items-center gap-1"><Cloud className="h-3 w-3" /> {t.synced}</span>
                ) : syncStatus === 'error' ? (
                  <span className="text-[#FF3B30] inline-flex items-center gap-1"><CloudOff className="h-3 w-3" /> {t.offline}</span>
                ) : null}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs text-[#8E8E93] shadow-[0_4px_15px_rgba(0,0,0,0.05)]">
              <span>{t.language}</span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
                className="bg-transparent text-[#1C1C1E] outline-none"
              >
                {(Object.keys(localeLabels) as Locale[]).map((key) => (
                  <option key={key} value={key}>
                    {localeLabels[key]}
                  </option>
                ))}
              </select>
            </label>
            <button
            onClick={() => {
              setEditingProfileId(activeProfile.id)
              setOnboardingForm({
                name: activeProfile.name,
                sex: activeProfile.sex,
                age: String(activeProfile.age),
                heightCm: String(activeProfile.heightCm),
                weightKg: String(activeProfile.weightKg),
                populationType: activeProfile.populationType,
                activityLevel: activeProfile.activityLevel,
                trainingAnchor: activeProfile.trainingAnchor,
                trainingDayOffset: String(activeProfile.offsets.trainingDayOffset),
                restDayOffset: String(activeProfile.offsets.restDayOffset),
                customTrainingKcal: activeProfile.customTargets?.training.kcal ? String(activeProfile.customTargets.training.kcal) : '',
                customTrainingProtein: activeProfile.customTargets?.training.protein ? String(activeProfile.customTargets.training.protein) : '',
                customTrainingCarbs: activeProfile.customTargets?.training.carbs ? String(activeProfile.customTargets.training.carbs) : '',
                customTrainingFat: activeProfile.customTargets?.training.fat ? String(activeProfile.customTargets.training.fat) : '',
                customRestKcal: activeProfile.customTargets?.rest.kcal ? String(activeProfile.customTargets.rest.kcal) : '',
                customRestProtein: activeProfile.customTargets?.rest.protein ? String(activeProfile.customTargets.rest.protein) : '',
                customRestCarbs: activeProfile.customTargets?.rest.carbs ? String(activeProfile.customTargets.rest.carbs) : '',
                customRestFat: activeProfile.customTargets?.rest.fat ? String(activeProfile.customTargets.rest.fat) : '',
              })
              setOnboardingStep('form')
              setModalOpen(true)
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#007AFF] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-transform hover:scale-105"
          >
            <UserCircle2 className="h-6 w-6" />
            </button>
          </div>
        </header>

        <section className={`${cardStyle} mb-6 p-6`}>
          <div className="mb-4 inline-flex rounded-full bg-[#F4F7FB] p-1 text-sm">
            <button
              onClick={() => setDayMode('training')}
              className={`rounded-full px-4 py-1.5 ${
                dayMode === 'training' ? 'bg-[#007AFF] text-white' : 'text-[#8E8E93]'
              }`}
            >
              {t.dayTraining}
            </button>
            <button
              onClick={() => setDayMode('rest')}
              className={`rounded-full px-4 py-1.5 ${
                dayMode === 'rest' ? 'bg-[#007AFF] text-white' : 'text-[#8E8E93]'
              }`}
            >
              {t.dayRest}
            </button>
          </div>
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            {[
              { key: 'early', label: t.winEarly },
              { key: 'noon', label: t.winNoon },
              { key: 'afternoon', label: t.winAfternoon },
              { key: 'night', label: t.winNight },
            ].map((item) => {
              const selected = activeTrainingWindow === item.key
              return (
                <button
                  key={item.key}
                  onClick={() =>
                    setTrainingWindowByProfile((prev) => ({
                      ...prev,
                      [activeProfile.id]: item.key as TrainingWindow,
                    }))
                  }
                  className={`rounded-full px-3 py-1.5 ${
                    selected ? 'bg-[#007AFF] text-white' : 'bg-[#F2F2F7] text-[#8E8E93]'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {ringStats.map((ring) => (
              <MacroRingCard
                key={ring.label}
                label={ring.label}
                color={ring.color}
                consumed={ring.consumed}
                target={ring.target}
                remain={ring.remain}
                unit={ring.unit}
                consumedLabel={t.consumed}
              />
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-[#F7FAF8] p-3">
            <p className="mb-2 inline-flex items-center gap-1 text-sm text-[#8E8E93]">
              <Leaf className="h-4 w-4 text-[#34C759]" />
              {t.fiber}
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5F5EA]">
              <motion.div
                className="h-full rounded-full bg-[#34C759]"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min((consumedTotals.fiber / Math.max(fiberTarget, 1)) * 100, 100)}%`,
                }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-2 text-xs text-[#8E8E93]">
              {t.consumed} {consumedTotals.fiber}g / {t.target} {fiberTarget}g · {t.remaining} {remaining.fiber}g
            </p>
          </div>
        </section>

        <section className="mb-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-1">
              <AIFoodInput
                locale={locale}
                onAddFood={(meal, added) => {
                  addMealIntake(meal, added)
                }}
              />
            </div>
            <div className="md:col-span-1">
              <div className={`${cardStyle} flex h-full flex-col p-4`}>
                <p className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-[#1C1C1E]">
                  <Dumbbell className="h-4 w-4 text-[#007AFF]" />
                  {t.trainingRecord}
                </p>
                <div className="grid flex-1 gap-3 md:grid-cols-2">
                  <label className="flex flex-col space-y-1.5">
                    <span className="text-xs text-[#8E8E93]">{t.trainingPlan}</span>
                    <input
                      type="text"
                      value={training.plan}
                      placeholder={t.trainingPlanPlaceholder}
                      onChange={(e) => setTrainingValue('plan', e.target.value)}
                      className="w-full flex-1 rounded-xl border border-[#E6E6EA] px-3 py-2 text-[13px] outline-none focus:border-[#007AFF]"
                    />
                  </label>
                  <label className="flex flex-col space-y-1.5">
                    <span className="text-xs text-[#8E8E93]">{t.burnedKcal}</span>
                    <input
                      type="number"
                      value={training.burnedKcal || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setTrainingValue('burnedKcal', isNaN(val) ? 0 : val)
                      }}
                      className="w-full flex-1 rounded-xl border border-[#E6E6EA] px-3 py-2 text-[13px] outline-none focus:border-[#007AFF]"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {meals.map((meal) => (
            <MealCard
              key={meal}
              meal={meal}
              intake={intake[meal]}
              carbSuggestion={carbDistribution[meal].carbs}
              windowLabel={windowToLabel(activeTrainingWindow, locale)}
              locale={locale}
              onChange={(key, value) => setMealValue(meal, key, value)}
            />
          ))}
        </section>

        <AnimatePresence>
          {showSaved && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="fixed right-5 top-5 rounded-full bg-[#007AFF] px-3 py-1 text-xs text-white"
            >
              ✓ {t.savedToLocal}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {modalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/25 px-4 py-6"
              onClick={() => setModalOpen(false)}
            >
              <motion.div
                initial={{ y: 22, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 16, opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={(event) => event.stopPropagation()}
                className="mx-auto h-full w-full max-w-4xl overflow-y-auto rounded-[20px] bg-white p-6 shadow-[0_10px_25px_rgba(0,0,0,0.04)]"
              >
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <select
                    value={activeProfileId ?? ''}
                    onChange={(event) => setActiveProfileId(event.target.value)}
                    className="rounded-lg border border-[#E6E6EA] px-3 py-1.5 text-sm"
                  >
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={openCreateFlow}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#E6E6EA] px-3 py-1.5 text-sm text-[#007AFF]"
                  >
                    <Plus className="h-4 w-4" />
                    {t.profileNew}
                  </button>
                  <button
                    onClick={resetAll}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#E6E6EA] px-3 py-1.5 text-sm text-[#8E8E93]"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t.clearAll}
                  </button>
                </div>
                
                {/* Embedded Onboarding Form for Editing */}
                <div className="space-y-6">
                  {onboardingStep === 'form' ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <OnboardingInput
                          label="姓名"
                          value={onboardingForm.name}
                          onChange={(value) =>
                            setOnboardingForm((prev) => ({ ...prev, name: value }))
                          }
                        />
                        <label className="space-y-2">
                          <span className="text-sm text-[#8E8E93]">性别</span>
                          <select
                            value={onboardingForm.sex}
                            onChange={(event) =>
                              setOnboardingForm((prev) => ({
                                ...prev,
                                sex: event.target.value as BiologicalSex,
                              }))
                            }
                            className="w-full rounded-xl border border-[#E6E6EA] px-3 py-2 outline-none focus:border-[#007AFF]"
                          >
                            <option value="male">男性</option>
                            <option value="female">女性</option>
                          </select>
                        </label>
                        <OnboardingInput
                          label="年龄"
                          value={onboardingForm.age}
                          onChange={(value) =>
                            setOnboardingForm((prev) => ({ ...prev, age: value }))
                          }
                          numeric
                        />
                        <OnboardingInput
                          label="身高 (cm)"
                          value={onboardingForm.heightCm}
                          onChange={(value) =>
                            setOnboardingForm((prev) => ({ ...prev, heightCm: value }))
                          }
                          numeric
                        />
                        <OnboardingInput
                          label="体重 (kg)"
                          value={onboardingForm.weightKg}
                          onChange={(value) =>
                            setOnboardingForm((prev) => ({ ...prev, weightKg: value }))
                          }
                          numeric
                        />
                        <label className="space-y-2">
                          <span className="text-sm text-[#8E8E93]">活动系数</span>
                          <select
                            value={onboardingForm.activityLevel}
                            onChange={(event) =>
                              setOnboardingForm((prev) => ({
                                ...prev,
                                activityLevel: event.target.value as ActivityLevel,
                              }))
                            }
                            className="w-full rounded-xl border border-[#E6E6EA] px-3 py-2 outline-none focus:border-[#007AFF]"
                          >
                            <option value="sedentary">久坐 1.2</option>
                            <option value="light">轻度活动 1.375</option>
                            <option value="moderate">中度活动 1.55</option>
                            <option value="high">高强度活动 1.725</option>
                          </select>
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm text-[#8E8E93]">人群属性</span>
                          <select
                            value={onboardingForm.populationType}
                            onChange={(event) =>
                              setOnboardingForm((prev) => ({
                                ...prev,
                                populationType: event.target.value as PopulationType,
                              }))
                            }
                            className="w-full rounded-xl border border-[#E6E6EA] px-3 py-2 outline-none focus:border-[#007AFF]"
                          >
                            <option value="strength">力量训练者</option>
                            <option value="general">普通人群</option>
                          </select>
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm text-[#8E8E93]">训练时机预设</span>
                          <select
                            value={onboardingForm.trainingAnchor}
                            onChange={(event) =>
                              setOnboardingForm((prev) => ({
                                ...prev,
                                trainingAnchor: event.target.value as TrainingAnchor,
                              }))
                            }
                            className="w-full rounded-xl border border-[#E6E6EA] px-3 py-2 outline-none focus:border-[#007AFF]"
                          >
                            <option value="上午">早起练</option>
                            <option value="中午">午间练</option>
                            <option value="下午">下午练</option>
                            <option value="晚后">晚后练</option>
                          </select>
                        </label>
                        <OnboardingInput
                          label="训练日热量偏移"
                          value={onboardingForm.trainingDayOffset}
                          onChange={(value) =>
                            setOnboardingForm((prev) => ({ ...prev, trainingDayOffset: value }))
                          }
                          numeric
                        />
                        <OnboardingInput
                          label="休息日热量偏移"
                          value={onboardingForm.restDayOffset}
                          onChange={(value) =>
                            setOnboardingForm((prev) => ({ ...prev, restDayOffset: value }))
                          }
                          numeric
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (onboardingForm.name.trim()) setOnboardingStep('review')
                        }}
                        className="mt-7 w-full rounded-xl bg-[#007AFF] py-3 text-sm font-medium text-white disabled:opacity-50"
                        disabled={!onboardingForm.name.trim()}
                      >
                        下一步：配置与预览宏量营养素
                      </button>
                    </>
                  ) : (
                    <div>
                      {/* Plan Review */}
                      <h3 className="mb-3 text-[15px] font-medium text-[#1C1C1E]">自定义营养素方案</h3>
                      <p className="mb-4 text-xs text-[#8E8E93]">你可以根据系统推荐值，手动覆盖训练日和休息日的具体热量与宏量营养素。</p>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Training Day Box */}
                        <div className="rounded-xl border border-[#EEF0F4] p-4">
                          <p className="mb-3 font-medium text-[#1C1C1E]">训练日 (TDEE + {onboardingForm.trainingDayOffset})</p>
                          <div className="space-y-3">
                            <OverrideInput 
                              label="总热量" 
                              val={onboardingForm.customTrainingKcal} 
                              placeholder={String(Math.round(reviewPlanData.trainingPlan.calorieTarget))}
                              onChange={(val) => setOnboardingForm(p => ({ ...p, customTrainingKcal: val }))}
                            />
                            <OverrideInput 
                              label="蛋白(g)" 
                              val={onboardingForm.customTrainingProtein} 
                              placeholder={String(Math.round(reviewPlanData.trainingPlan.macroResult.proteinGrams))}
                              onChange={(val) => setOnboardingForm(p => ({ ...p, customTrainingProtein: val }))}
                            />
                            <OverrideInput 
                              label="碳水(g)" 
                              val={onboardingForm.customTrainingCarbs} 
                              placeholder={String(Math.round(reviewPlanData.trainingPlan.macroResult.carbsGrams))}
                              onChange={(val) => setOnboardingForm(p => ({ ...p, customTrainingCarbs: val }))}
                            />
                            <OverrideInput 
                              label="脂肪(g)" 
                              val={onboardingForm.customTrainingFat} 
                              placeholder={String(Math.round(reviewPlanData.trainingPlan.macroResult.fatGrams))}
                              onChange={(val) => setOnboardingForm(p => ({ ...p, customTrainingFat: val }))}
                            />
                          </div>
                        </div>

                        {/* Rest Day Box */}
                        <div className="rounded-xl border border-[#EEF0F4] p-4">
                          <p className="mb-3 font-medium text-[#1C1C1E]">休息日 (TDEE {onboardingForm.restDayOffset})</p>
                          <div className="space-y-3">
                            <OverrideInput 
                              label="总热量" 
                              val={onboardingForm.customRestKcal} 
                              placeholder={String(Math.round(reviewPlanData.restPlan.calorieTarget))}
                              onChange={(val) => setOnboardingForm(p => ({ ...p, customRestKcal: val }))}
                            />
                            <OverrideInput 
                              label="蛋白(g)" 
                              val={onboardingForm.customRestProtein} 
                              placeholder={String(Math.round(reviewPlanData.restPlan.macroResult.proteinGrams))}
                              onChange={(val) => setOnboardingForm(p => ({ ...p, customRestProtein: val }))}
                            />
                            <OverrideInput 
                              label="碳水(g)" 
                              val={onboardingForm.customRestCarbs} 
                              placeholder={String(Math.round(reviewPlanData.restPlan.macroResult.carbsGrams))}
                              onChange={(val) => setOnboardingForm(p => ({ ...p, customRestCarbs: val }))}
                            />
                            <OverrideInput 
                              label="脂肪(g)" 
                              val={onboardingForm.customRestFat} 
                              placeholder={String(Math.round(reviewPlanData.restPlan.macroResult.fatGrams))}
                              onChange={(val) => setOnboardingForm(p => ({ ...p, customRestFat: val }))}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-6">
                        <button
                          onClick={() => setOnboardingStep('form')}
                          className="flex-1 rounded-xl bg-[#F2F2F7] py-3 text-sm font-medium text-[#1C1C1E]"
                        >
                          返回修改
                        </button>
                        <button
                          onClick={createOrUpdateProfile}
                          disabled={onboardingSubmitting}
                          className="flex-1 rounded-xl bg-[#007AFF] py-3 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {editingProfileId ? '保存更改' : '确认创建'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}

function MacroRingCard({
  label,
  color,
  consumed,
  target,
  remain,
  unit,
  consumedLabel,
}: {
  label: string
  color: string
  consumed: number
  target: number
  remain: number
  unit: string
  consumedLabel: string
}) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(consumed / Math.max(target, 1), 1)
  const dash = circumference * progress
  const isCompleted = remain <= 0

  return (
    <div
      className={`rounded-[18px] p-4 transition-all duration-500 ${
        isCompleted ? 'bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]' : 'bg-[#F9FAFD]'
      }`}
      style={{
        boxShadow: isCompleted ? `0 8px 30px ${color}20` : undefined,
      }}
    >
      <div className="relative mx-auto h-[120px] w-[120px]">
        <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
          <circle cx="55" cy="55" r={radius} stroke="#ECEEF3" strokeWidth="8" fill="none" />
          <motion.circle
            cx="55"
            cy="55"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${dash} ${circumference}` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[11px] font-medium text-[#8E8E93]">{label}</p>
          <motion.p
            animate={{ scale: isCompleted ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 0.4 }}
            className="mt-0.5 flex items-center gap-1 text-xl font-bold"
            style={{ color: isCompleted ? '#34C759' : color }}
          >
            {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : remain}
          </motion.p>
          {!isCompleted && <p className="mt-0.5 text-[10px] text-[#8E8E93]">{unit}</p>}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-[#8E8E93]">{consumedLabel} {consumed}</span>
        <span className="font-medium text-[#1C1C1E]">/ {target}</span>
      </div>
    </div>
  )
}

function MealCard({
  meal,
  intake,
  carbSuggestion,
  windowLabel,
  locale,
  onChange,
}: {
  meal: MealKey
  intake: IntakeEntry
  carbSuggestion: number
  windowLabel: string
  locale: Locale
  onChange: (key: NutrientKey, value: string) => void
}) {
  const text = i18n[locale]
  const [expanded, setExpanded] = useState(false)
  const hasData = intake.kcal > 0 || intake.protein > 0 || intake.carbs > 0 || intake.fat > 0

  return (
    <div className={`${cardStyle} flex flex-col overflow-hidden`}>
      {/* Summary Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between bg-white px-5 py-4 transition-colors hover:bg-[#F9FAFD]"
      >
        <div className="flex flex-col items-start">
          <p className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[#1C1C1E]">
            <Flame className={`h-4 w-4 ${hasData ? 'text-[#FF3B30]' : 'text-[#C7C7CC]'}`} />
            {meal}
          </p>
          {hasData ? (
            <p className="mt-1 text-xs text-[#8E8E93]">
              {intake.kcal} kcal · {intake.protein}g {text.nutrientProtein} · {intake.carbs}g {text.nutrientCarbs} · {intake.fat}g {text.nutrientFat}
            </p>
          ) : (
            <p className="mt-1 text-xs text-[#C7C7CC]">{text.manualRecordHint}</p>
          )}
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F7] text-[#8E8E93]">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded Inputs */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[#F2F2F7] bg-[#F9FAFD]"
          >
            <div className="space-y-3 p-5">
              <NutrientInput label={text.nutrientKcal} color="#FF3B30" value={intake.kcal} onChange={(val) => onChange('kcal', val)} />
              <NutrientInput label={text.nutrientProtein} color="#FF9500" value={intake.protein} onChange={(val) => onChange('protein', val)} />
              <NutrientInput label={text.nutrientCarbs} color="#FFCC00" value={intake.carbs} onChange={(val) => onChange('carbs', val)} />
              <NutrientInput label={text.nutrientFat} color="#007AFF" value={intake.fat} onChange={(val) => onChange('fat', val)} />
              <NutrientInput label={text.nutrientFiber} color="#34C759" value={intake.fiber} onChange={(val) => onChange('fiber', val)} />
              <div className="mt-4 rounded-xl bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <p className="inline-flex items-center gap-1 text-xs text-[#8E8E93]">
                  <Wheat className="h-3.5 w-3.5 text-[#FFCC00]" />
                  {windowLabel} {text.carbSuggestionPrefix} <span className="font-medium text-[#1C1C1E]">{carbSuggestion}g</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NutrientInput({
  label,
  color,
  value,
  onChange,
}: {
  label: string
  color: string
  value: number
  onChange: (value: string) => void
}) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-xs" style={{ color }}>
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-20 rounded-lg border border-[#E6E6EA] px-2 py-1 text-right text-xs outline-none focus:border-[#007AFF]"
      />
    </label>
  )
}

function OverrideInput({ label, val, placeholder, onChange }: { label: string, val: string, placeholder: string, onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-[13px] text-[#8E8E93]">{label}</span>
      <input
        type="number"
        value={val}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 rounded-lg border border-[#E6E6EA] bg-transparent px-3 py-1.5 text-right text-[14px] outline-none focus:border-[#007AFF] focus:bg-white"
      />
    </label>
  )
}

function OnboardingInput({
  label,
  value,
  onChange,
  numeric,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  numeric?: boolean
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-[#8E8E93]">{label}</span>
      <input
        type={numeric ? 'text' : 'text'}
        value={value}
        placeholder={numeric ? '0' : ''}
        onChange={(event) => {
          const next = event.target.value
          if (!numeric) {
            onChange(next)
            return
          }
          if (/^-?\d*\.?\d*$/.test(next)) {
            onChange(next)
          }
        }}
        onFocus={(event) => event.currentTarget.select()}
        className="w-full rounded-xl border border-[#E6E6EA] px-3 py-2 outline-none focus:border-[#007AFF]"
      />
    </label>
  )
}

  // Clean up unused ProfileForm component from previous versions

export default App

function AIFoodInput({
  locale,
  onAddFood,
}: {
  locale: Locale
  onAddFood: (meal: MealKey, added: IntakeEntry) => void
}) {
  const t = i18n[locale]
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ text: string; meal: MealKey | string } | null>(null)
  
  const [customFoodDB, setCustomFoodDB] = useState<Record<string, IntakeEntry>>(() => {
    const saved = localStorage.getItem('easyeat_custom_food_db')
    return saved ? JSON.parse(saved) : {}
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        let newDB: Record<string, IntakeEntry> = {}
        
        if (file.name.endsWith('.json')) {
          newDB = JSON.parse(content)
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split(/\r?\n/).filter(line => line.trim())
          // 检查是否有表头，如果第二列不是数字，说明是表头，跳过第一行
          const startIdx = isNaN(parseFloat(lines[0].split(',')[1])) ? 1 : 0
          
          for (let i = startIdx; i < lines.length; i++) {
            const cols = lines[i].split(',')
            if (cols.length >= 5) {
              const name = cols[0].trim()
              newDB[name] = {
                kcal: parseFloat(cols[1]) || 0,
                protein: parseFloat(cols[2]) || 0,
                carbs: parseFloat(cols[3]) || 0,
                fat: parseFloat(cols[4]) || 0,
                fiber: parseFloat(cols[5]) || 0,
              }
            }
          }
        } else {
          throw new Error(t.unsupportedFileType)
        }

        const merged = { ...customFoodDB, ...newDB }
        setCustomFoodDB(merged)
        localStorage.setItem('easyeat_custom_food_db', JSON.stringify(merged))
        
        setToastMsg({ text: `${t.uploadSuccess} ${Object.keys(newDB).length} ${t.uploadRecordsSuffix}`, meal: 'system' })
        window.setTimeout(() => setToastMsg(null), 3000)
      } catch (err) {
        alert(t.uploadFailed)
      }
      
      // 清空 input 值，允许重复上传同一文件
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsText(file)
  }

  const toggleListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert(t.voiceNotSupported)
      return
    }

    if (isListening) {
      // 实际上，这里需要保持 recognition 实例来 stop。为了简化，我们仅使用一次性监听。
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'cmn-Hans-CN' // 支持中文，但多数现代浏览器也会混合识别英文
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setText((prev) => prev + transcript)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || loading) return
    setLoading(true)

    // Simulate AI parsing delay
    window.setTimeout(() => {
      const isMorning = text.includes('早') || text.toLowerCase().includes('morning') || text.toLowerCase().includes('breakfast')
      const isEvening = text.includes('晚') || text.toLowerCase().includes('evening') || text.toLowerCase().includes('dinner')
      const targetMeal: MealKey = isMorning ? '早餐' : isEvening ? '晚餐' : '午餐'

      // 1. 模拟 AI 实体提取，并支持 "克" 和 "个" 等单位
      const extractedItems: Array<{food: string, weight: number}> = []
      
      // 匹配: "100克鸡蛋", "200g豆腐"
      const gramRegex = /(\d+)(?:克|g|gram)(?:的)?([\u4e00-\u9fa5]+)/g
      let match
      while ((match = gramRegex.exec(text)) !== null) {
        extractedItems.push({ weight: parseInt(match[1], 10), food: match[2] })
      }

      // 匹配: "2个鸡蛋", "1个苹果"
      const pieceRegex = /(\d+)(?:个)(?:的)?([\u4e00-\u9fa5]+)/g
      while ((match = pieceRegex.exec(text)) !== null) {
        const count = parseInt(match[1], 10)
        let weightPerPiece = 100 // 默认一个100克
        if (match[2].includes('鸡蛋')) weightPerPiece = 50
        if (match[2].includes('苹果')) weightPerPiece = 150
        if (match[2].includes('香蕉')) weightPerPiece = 150
        extractedItems.push({ weight: count * weightPerPiece, food: match[2] })
      }

      // 如果没带单位，尝试直接捕捉关键字
      if (extractedItems.length === 0) {
        const fallbackMatch = text.match(/(吃了|一份|一碗|一些)?([\u4e00-\u9fa5]+)/)
        if (fallbackMatch && fallbackMatch[2].length > 1) {
          const foodName = fallbackMatch[2]
          let defaultWeight = 200
          if (foodName.includes('鸡蛋')) defaultWeight = 50 // 没说几个，默认算1个 (50g)
          if (foodName.includes('米饭')) defaultWeight = 150 // 一碗米饭默认 150g
          extractedItems.push({ food: foodName, weight: defaultWeight })
        } else {
          extractedItems.push({ food: t.unknownFood, weight: 100 })
        }
      }

      // 2. 本地食物热量数据库 (每 100g 营养素) 与 用户自定义数据库合并
      const BASE_FOOD_DB: Record<string, IntakeEntry> = {
        '鸡蛋': { kcal: 143, protein: 12.5, carbs: 0.8, fat: 9.5, fiber: 0 },
        '蛋白': { kcal: 52, protein: 11.6, carbs: 0, fat: 0.2, fiber: 0 },
        '豆腐': { kcal: 82, protein: 8.1, carbs: 4.2, fat: 3.7, fiber: 0.4 }, 
        '老豆腐': { kcal: 122, protein: 12.2, carbs: 3.0, fat: 8.0, fiber: 1.0 },
        '嫩豆腐': { kcal: 50, protein: 4.5, carbs: 2.0, fat: 2.5, fiber: 0 },
        '乌冬面': { kcal: 105, protein: 2.6, carbs: 21.6, fat: 0.6, fiber: 0.8 },
        '蔬菜': { kcal: 25, protein: 2.0, carbs: 4.0, fat: 0.2, fiber: 2.5 },
        '青菜': { kcal: 25, protein: 2.0, carbs: 4.0, fat: 0.2, fiber: 2.5 },
        '米饭': { kcal: 130, protein: 2.6, carbs: 28.6,  fat: 0.3, fiber: 0.3 },
        '鸡胸肉': { kcal: 133, protein: 22.5, carbs: 0, fat: 4.0, fiber: 0 },
        '牛肉': { kcal: 106, protein: 20.2, carbs: 0, fat: 2.3, fiber: 0 },
        '猪肉': { kcal: 143, protein: 20.3, carbs: 0, fat: 6.2, fiber: 0 },
        '苹果': { kcal: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4 },
        '香蕉': { kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 },
        '牛奶': { kcal: 54, protein: 3.0, carbs: 4.8, fat: 3.2, fiber: 0 },
      }
      const FOOD_DB = { ...BASE_FOOD_DB, ...customFoodDB }

      const calculated: IntakeEntry = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
      const matchedLogs: string[] = []

      // 3. 严格计算
      extractedItems.forEach(item => {
        let dbEntry = FOOD_DB[item.food]
        if (!dbEntry) {
          const foundKey = Object.keys(FOOD_DB).find(k => item.food.includes(k) || k.includes(item.food))
          if (foundKey) dbEntry = FOOD_DB[foundKey]
        }
        
        const ratio = item.weight / 100
        if (dbEntry) {
          calculated.kcal += dbEntry.kcal * ratio
          calculated.protein += dbEntry.protein * ratio
          calculated.carbs += dbEntry.carbs * ratio
          calculated.fat += dbEntry.fat * ratio
          calculated.fiber += dbEntry.fiber * ratio
          matchedLogs.push(`${item.food}(${item.weight}g)=${Math.round(dbEntry.kcal * ratio)}`)
        } else {
          // 未知食物按大约 120kcal/100g 盲估
          calculated.kcal += 120 * ratio
          calculated.protein += 5 * ratio
          calculated.carbs += 15 * ratio
          calculated.fat += 4 * ratio
          matchedLogs.push(`${item.food}(未知估算${item.weight}g)=${Math.round(120 * ratio)}`)
        }
      })

      // 4. 数据格式化
      calculated.kcal = Math.round(calculated.kcal)
      calculated.protein = Math.round(calculated.protein * 10) / 10
      calculated.carbs = Math.round(calculated.carbs * 10) / 10
      calculated.fat = Math.round(calculated.fat * 10) / 10
      calculated.fiber = Math.round(calculated.fiber * 10) / 10

      onAddFood(targetMeal, calculated)
      setLoading(false)
      setText('')
      
      const logStr = matchedLogs.length > 0 ? matchedLogs.join(', ') : t.noFoodRecognized
      setToastMsg({ text: `${t.preciseCalc} ${calculated.kcal}kcal [${logStr}]`, meal: targetMeal })
      window.setTimeout(() => setToastMsg(null), 5000)
    }, 800)
  }

  return (
    <div className={`${cardStyle} relative flex h-full flex-col justify-center bg-gradient-to-br from-[#F4F6FB] to-[#FFFFFF] p-[2px]`}>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-[18px] bg-white px-3 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.01)]"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5856D6] to-[#007AFF]">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.inputPlaceholder}
          className="w-0 flex-1 bg-transparent text-[14px] text-[#1C1C1E] outline-none placeholder:text-[#8E8E93]"
          disabled={loading}
        />
        
        {/* 隐藏的文件上传 Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv,.json"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        <button
          type="button"
          title={t.uploadFoodDB}
          onClick={() => fileInputRef.current?.click()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2F2F7] text-[#8E8E93] transition-colors hover:bg-[#E5E5EA] hover:text-[#007AFF]"
        >
          <Database className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggleListening}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
            isListening ? 'bg-[#FF3B30]/10 text-[#FF3B30] animate-pulse' : 'bg-[#F2F2F7] text-[#8E8E93] hover:bg-[#E5E5EA]'
          }`}
        >
          <Mic className="h-4 w-4" />
        </button>
        <button
          type="submit"
          disabled={!text.trim() || loading}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2F2F7] text-[#007AFF] transition-colors hover:bg-[#E5E5EA] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>
      </form>
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="flex items-center justify-center px-4 pb-2"
          >
            <p className="text-xs font-medium text-[#34C759]">
              ✓ {toastMsg.text} ({toastMsg.meal})
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
