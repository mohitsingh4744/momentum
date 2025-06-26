import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '../app/login/page'

// Mock the Supabase client
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      signInWithOtp: vi.fn()
    }
  }))
}))

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key')

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000'
  },
  writable: true
})

describe('LoginPage', () => {
  it('renders login form with email input', () => {
    render(<LoginPage />)
    
    // Check that the email input exists
    const emailInput = screen.getByPlaceholderText('Email address')
    expect(emailInput).toBeInTheDocument()
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('required')
    
    // Check that the submit button exists
    const submitButton = screen.getByRole('button', { name: /send magic link/i })
    expect(submitButton).toBeInTheDocument()
    expect(submitButton).toHaveAttribute('type', 'submit')
  })

  it('renders login page title and description', () => {
    render(<LoginPage />)
    
    // Check that the title exists
    const title = screen.getByText('Sign in to your account')
    expect(title).toBeInTheDocument()
    
    // Check that the description exists
    const description = screen.getByText('Enter your email to receive a magic link')
    expect(description).toBeInTheDocument()
  })

  it('renders email input with proper accessibility', () => {
    render(<LoginPage />)
    
    // Check that the email input has proper label
    const emailInput = screen.getByLabelText('Email address')
    expect(emailInput).toBeInTheDocument()
    
    // Check that the input has proper attributes
    expect(emailInput).toHaveAttribute('autoComplete', 'email')
    expect(emailInput).toHaveAttribute('name', 'email')
    expect(emailInput).toHaveAttribute('id', 'email')
  })
}) 