import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock tRPC
vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    reflections: {
      saveReflection: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
          isError: false,
          isSuccess: false,
        }),
      },
      getCurrentStreak: {
        useQuery: () => ({
          data: { streak: 0, lastReflectionDate: null },
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
    },
  },
}))

// Mock the realtime streak hook
vi.mock('@/hooks/useRealtimeStreak', () => ({
  useRealtimeStreak: () => ({
    streak: 3,
    lastReflectionDate: '2024-01-01T00:00:00Z',
    isLoading: false,
    refetch: vi.fn(),
  }),
}))

import { ReflectionForm } from '../components/ReflectionForm'

describe('ReflectionForm', () => {
  it('renders reflection form with prompts and streak display', () => {
    render(<ReflectionForm />)

    // Check for form elements
    expect(screen.getByText('Daily Reflection')).toBeInTheDocument()
    expect(screen.getByText('Current Streak')).toBeInTheDocument()
    expect(screen.getByText('3 🔥')).toBeInTheDocument()

    // Check for sample prompts
    expect(screen.getByText('What was your biggest achievement today?')).toBeInTheDocument()
    expect(screen.getByText('What challenged you the most?')).toBeInTheDocument()
    expect(screen.getByText('What are you grateful for today?')).toBeInTheDocument()
    expect(screen.getByText('What would you like to improve tomorrow?')).toBeInTheDocument()

    // Check for submit button
    expect(screen.getByText('Submit Reflection')).toBeInTheDocument()
  })

  it('has proper form structure', () => {
    const { container } = render(<ReflectionForm />)

    // Check for form elements
    const form = container.querySelector('form')
    expect(form).toBeInTheDocument()

    // Check for textarea inputs
    const textareas = screen.getAllByRole('textbox')
    expect(textareas).toHaveLength(4) // 4 prompts

    // Check for submit button
    const submitButton = screen.getByRole('button', { name: /submit reflection/i })
    expect(submitButton).toBeInTheDocument()
  })

  it('displays streak information correctly', () => {
    render(<ReflectionForm />)

    // Check streak display
    expect(screen.getByText('Current Streak')).toBeInTheDocument()
    expect(screen.getByText('3 🔥')).toBeInTheDocument()
  })

  it('has proper styling classes', () => {
    const { container } = render(<ReflectionForm />)

    // Check for main container classes
    const mainContainer = container.querySelector('.bg-white')
    expect(mainContainer).toBeInTheDocument()

    // Check for form styling
    const form = container.querySelector('form')
    expect(form).toBeInTheDocument()
  })
}) 