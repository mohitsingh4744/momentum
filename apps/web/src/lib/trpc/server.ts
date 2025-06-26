import { initTRPC, TRPCError } from '@trpc/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

// Define context type
interface Context {
  supabase: SupabaseClient
  user?: User
}

const t = initTRPC.context<Context>().create()

// Create context with Supabase client
export const createContext = async (): Promise<Context> => {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  return { supabase }
}

// Middleware to check authentication
const isAuthed = t.middleware(async ({ ctx, next }) => {
  const { data: { user }, error } = await ctx.supabase.auth.getUser()
  
  if (error || !user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  
  return next({
    ctx: {
      ...ctx,
      user,
    },
  })
})

// Export procedures
export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(isAuthed) 