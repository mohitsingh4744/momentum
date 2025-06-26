import { z } from 'zod'
import { router, protectedProcedure } from '../server'

// Zod schema for reflection submission
const saveReflectionSchema = z.object({
  answers: z.record(z.string(), z.any()), // JSON object of question-answer pairs
  date: z.string().datetime().optional(), // Optional date, defaults to today
})

export const reflectionsRouter = router({
  saveReflection: protectedProcedure
    .input(saveReflectionSchema)
    .mutation(async ({ ctx, input }) => {
      const { data: reflection, error } = await ctx.supabase
        .from('reflections')
        .insert({
          user_id: ctx.user!.id,
          answers: input.answers,
          date: input.date || new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to save reflection: ${error.message}`)
      }

      // Emit Supabase Realtime broadcast
      try {
        await ctx.supabase
          .channel('reflections')
          .send({
            type: 'broadcast',
            event: 'new_reflection',
            payload: {
              user_id: ctx.user!.id,
              reflection_id: reflection.id,
              date: reflection.date,
            },
          })
      } catch (broadcastError) {
        console.error('Failed to broadcast reflection:', broadcastError)
        // Don't throw error here as the reflection was saved successfully
      }

      return reflection
    }),

  getReflections: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('reflections')
        .select('*')
        .eq('user_id', ctx.user!.id)
        .order('date', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (error) {
        throw new Error(`Failed to fetch reflections: ${error.message}`)
      }

      return data
    }),

  getCurrentStreak: protectedProcedure
    .query(async ({ ctx }) => {
      // Get the most recent reflection date
      const { data: latestReflection, error: latestError } = await ctx.supabase
        .from('reflections')
        .select('date')
        .eq('user_id', ctx.user!.id)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      if (latestError && latestError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch latest reflection: ${latestError.message}`)
      }

      if (!latestReflection) {
        return { streak: 0, lastReflectionDate: null }
      }

      const lastReflectionDate = new Date(latestReflection.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // If the last reflection was today, start counting from yesterday
      const startDate = lastReflectionDate.toDateString() === today.toDateString() 
        ? new Date(lastReflectionDate.getTime() - 24 * 60 * 60 * 1000)
        : lastReflectionDate

      // Count consecutive days with reflections
      let streak = 0
      let currentDate = new Date(startDate)
      currentDate.setHours(0, 0, 0, 0)
      let shouldContinue = true
      while (shouldContinue) {
        const { data: reflection, error } = await ctx.supabase
          .from('reflections')
          .select('id')
          .eq('user_id', ctx.user!.id)
          .gte('date', currentDate.toISOString())
          .lt('date', new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString())
          .limit(1)

        if (error) {
          throw new Error(`Failed to check reflection for date: ${error.message}`)
        }

        if (reflection && reflection.length > 0) {
          streak++
          currentDate.setDate(currentDate.getDate() - 1)
        } else {
          shouldContinue = false
        }
      }

      return { 
        streak, 
        lastReflectionDate: latestReflection.date 
      }
    }),
}) 