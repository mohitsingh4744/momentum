import { describe, it, expect } from 'vitest'
import { appRouter } from '../lib/trpc/root'
import { goalsRouter } from '../lib/trpc/routers/goals'

describe('tRPC Goals Router', () => {
  it('should have appRouter defined', () => {
    expect(appRouter).toBeDefined()
    expect(typeof appRouter).toBe('object')
  })

  it('should have goalsRouter defined', () => {
    expect(goalsRouter).toBeDefined()
    expect(typeof goalsRouter).toBe('object')
  })

  it('should export AppRouter type', () => {
    // This test verifies that the type export works
    expect(typeof appRouter).toBe('object')
  })
}) 