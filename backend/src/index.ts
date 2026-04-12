import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() })
})

// --- PROFILES API ---

// Get all profiles
app.get('/api/profiles', async (req, res) => {
  try {
    const profiles = await prisma.profile.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json(profiles)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profiles' })
  }
})

// Create a new profile
app.post('/api/profiles', async (req, res) => {
  try {
    const data = req.body
    const profile = await prisma.profile.create({
      data: {
        name: data.name,
        sex: data.sex,
        age: data.age,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        populationType: data.populationType,
        activityLevel: data.activityLevel,
        strategyMode: data.strategyMode,
        trainingAnchor: data.trainingAnchor,
        trainingDayOffset: data.trainingDayOffset || 0,
        restDayOffset: data.restDayOffset || 0,
        customTrainingKcal: data.customTrainingKcal,
        customTrainingProtein: data.customTrainingProtein,
        customTrainingCarbs: data.customTrainingCarbs,
        customTrainingFat: data.customTrainingFat,
        customRestKcal: data.customRestKcal,
        customRestProtein: data.customRestProtein,
        customRestCarbs: data.customRestCarbs,
        customRestFat: data.customRestFat,
      }
    })
    res.status(201).json(profile)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create profile' })
  }
})

// Update a profile
app.put('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params
    const data = req.body
    const profile = await prisma.profile.update({
      where: { id },
      data: {
        name: data.name,
        sex: data.sex,
        age: data.age,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        populationType: data.populationType,
        activityLevel: data.activityLevel,
        strategyMode: data.strategyMode,
        trainingAnchor: data.trainingAnchor,
        trainingDayOffset: data.trainingDayOffset,
        restDayOffset: data.restDayOffset,
        customTrainingKcal: data.customTrainingKcal,
        customTrainingProtein: data.customTrainingProtein,
        customTrainingCarbs: data.customTrainingCarbs,
        customTrainingFat: data.customTrainingFat,
        customRestKcal: data.customRestKcal,
        customRestProtein: data.customRestProtein,
        customRestCarbs: data.customRestCarbs,
        customRestFat: data.customRestFat,
      }
    })
    res.json(profile)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// Delete all profiles (for dev reset)
app.delete('/api/profiles/all', async (req, res) => {
  try {
    await prisma.profile.deleteMany()
    res.json({ message: 'All profiles cleared' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear profiles' })
  }
})

// --- LOGS API ---

// Get daily log for a profile
app.get('/api/logs/:profileId/:date', async (req, res) => {
  const { profileId, date } = req.params
  try {
    const log = await prisma.dailyLog.findUnique({
      where: { profileId_date: { profileId, date } },
      include: { meals: true }
    })
    res.json(log)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch daily log' })
  }
})

// Upsert daily log (and meals)
app.post('/api/logs', async (req, res) => {
  const { profileId, date, dayMode, trainingPlan, burnedKcal, meals } = req.body
  try {
    // 1. Upsert DailyLog
    const dailyLog = await prisma.dailyLog.upsert({
      where: { profileId_date: { profileId, date } },
      update: { dayMode, trainingPlan, burnedKcal },
      create: { profileId, date, dayMode, trainingPlan, burnedKcal },
    })

    // 2. Upsert Meals if provided
    if (meals && Array.isArray(meals)) {
      for (const meal of meals) {
        await prisma.mealIntake.upsert({
          where: { dailyLogId_mealType: { dailyLogId: dailyLog.id, mealType: meal.mealType } },
          update: { kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, fiber: meal.fiber },
          create: { dailyLogId: dailyLog.id, mealType: meal.mealType, kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, fiber: meal.fiber },
        })
      }
    }
    res.json({ success: true, dailyLog })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to save daily log' })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Backend Server is running at http://localhost:${PORT}`)
})
