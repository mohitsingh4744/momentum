import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock the entire tRPC module
vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    goals: {
      listGoals: {
        useQuery: () => ({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      createGoal: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      archiveGoal: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
  },
}))

import GoalsPage from '../app/dashboard/goals/page'

describe('GoalsPage', () => {
  it('renders the goals page with correct structure', () => {
    render(<GoalsPage />)
    
    // Check main page elements
    expect(screen.getByText('Goals')).toBeInTheDocument()
    expect(screen.getByText('Manage your personal and professional goals')).toBeInTheDocument()
    expect(screen.getByText('Create New Goal')).toBeInTheDocument()
  })

  it('renders empty state when no goals exist', () => {
    render(<GoalsPage />)
    
    expect(screen.getByText('No active goals')).toBeInTheDocument()
    expect(screen.getByText('Get started by creating your first goal.')).toBeInTheDocument()
  })

  it('has proper page layout and styling classes', () => {
    const { container } = render(<GoalsPage />)
    
    // Check for main container classes
    const mainContainer = container.querySelector('.min-h-screen')
    expect(mainContainer).toBeInTheDocument()
    
    // Check for max width container
    const maxWidthContainer = container.querySelector('.max-w-6xl')
    expect(maxWidthContainer).toBeInTheDocument()
  })

  it('includes create goal button in header', () => {
    render(<GoalsPage />)
    
    const createButton = screen.getByText('Create New Goal')
    expect(createButton).toBeInTheDocument()
    expect(createButton).toHaveClass('bg-blue-600')
  })

  it('has proper section headers', () => {
    render(<GoalsPage />)
    
    expect(screen.getByText('Active Goals (0)')).toBeInTheDocument()
  })
}) 