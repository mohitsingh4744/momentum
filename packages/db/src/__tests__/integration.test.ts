import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import { describe, it, expect, beforeAll } from 'vitest'

const SUPABASE_URL = 'http://localhost:54321'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

describe('Supabase DB Integration', () => {
  beforeAll(async () => {
    // Run migration before tests
    execSync('supabase db reset', { stdio: 'inherit' })
  }, 60000)

  it('verifies migration created tables and can perform basic operations', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Test 1: Check if goals table exists by trying to select from it
    const { data: goalsData, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .limit(1)
    
    expect(goalsError).toBeNull()
    expect(goalsData).toBeDefined()
    
    // Test 2: Check if reflections table exists
    const { data: reflectionsData, error: reflectionsError } = await supabase
      .from('reflections')
      .select('*')
      .limit(1)
    
    expect(reflectionsError).toBeNull()
    expect(reflectionsData).toBeDefined()
    
    // Test 3: Check if weekly_reports table exists
    const { data: reportsData, error: reportsError } = await supabase
      .from('weekly_reports')
      .select('*')
      .limit(1)
    
    expect(reportsError).toBeNull()
    expect(reportsData).toBeDefined()
    
    // Test 4: Verify we can insert a goal (this will test the table structure)
    const testGoal = {
      text: 'Test Goal',
      timeline: '2025',
      metrics: 'metric',
      archived: false,
      user_id: '00000000-0000-0000-0000-000000000000' // Dummy UUID for testing
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('goals')
      .insert([testGoal])
      .select()
    
    if (insertError) {
      console.error('Insert error details:', JSON.stringify(insertError, null, 2))
    }
    
    // The insert should fail due to foreign key constraint (user doesn't exist)
    // This proves the migration worked and the table structure is correct
    expect(insertError).toBeDefined()
    expect(insertError?.message).toContain('violates foreign key constraint')
  })
}) 