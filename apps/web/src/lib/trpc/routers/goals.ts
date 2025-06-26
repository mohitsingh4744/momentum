import { z } from 'zod'
import { router, protectedProcedure } from '../server'

// Zod schemas for validation
const createGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  target_date: z.string().datetime().optional(),
  category: z.string().optional(),
})

const archiveGoalSchema = z.object({
  goal_id: z.string().uuid('Invalid goal ID'),
})

export const goalsRouter = router({
  createGoal: protectedProcedure
    .input(createGoalSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('goals')
        .insert({
          user_id: ctx.user!.id,
          title: input.title,
          description: input.description,
          target_date: input.target_date,
          category: input.category,
          status: 'active',
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create goal: ${error.message}`)
      }

      return data
    }),

  listGoals: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('goals')
        .select('*')
        .eq('user_id', ctx.user!.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch goals: ${error.message}`)
      }

      return data
    }),

  archiveGoal: protectedProcedure
    .input(archiveGoalSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('goals')
        .update({ status: 'archived' })
        .eq('id', input.goal_id)
        .eq('user_id', ctx.user!.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to archive goal: ${error.message}`)
      }

      return data
    }),
}) 