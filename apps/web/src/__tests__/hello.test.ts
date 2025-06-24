import { describe, it, expect } from 'vitest'

describe('Hello World Test', () => {
  it('should pass a simple test', () => {
    expect('hello world').toBe('hello world')
  })

  it('should handle basic math', () => {
    expect(1 + 1).toBe(2)
  })
}) 