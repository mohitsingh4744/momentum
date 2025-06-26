import { router } from './server'
import { goalsRouter } from './routers/goals'
import { reflectionsRouter } from './routers/reflections'

export const appRouter = router({
  goals: goalsRouter,
  reflections: reflectionsRouter,
})

export type AppRouter = typeof appRouter 