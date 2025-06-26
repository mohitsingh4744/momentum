import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { trpc } from '@/lib/trpc/client'

interface StreakData {
  streak: number
  lastReflectionDate: string | null
}

export function useRealtimeStreak() {
  const [streak, setStreak] = useState<StreakData>({ streak: 0, lastReflectionDate: null })
  const [isLoading, setIsLoading] = useState(true)

  // tRPC query for initial streak data
  const { data: initialStreak, refetch, isLoading: queryLoading } = trpc.reflections.getCurrentStreak.useQuery()

  useEffect(() => {
    if (initialStreak) {
      setStreak(initialStreak)
      setIsLoading(false)
    } else if (!queryLoading) {
      setIsLoading(false)
    }
  }, [initialStreak, queryLoading])

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Subscribe to reflections channel
    const channel = supabase
      .channel('reflections')
      .on(
        'broadcast',
        { event: 'new_reflection' },
        (payload) => {
          console.log('Received new reflection broadcast:', payload)
          // Refetch streak data when a new reflection is submitted
          refetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetch])

  return {
    streak: streak.streak,
    lastReflectionDate: streak.lastReflectionDate,
    isLoading,
    refetch,
  }
} 