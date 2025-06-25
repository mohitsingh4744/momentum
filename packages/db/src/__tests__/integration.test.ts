import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import { describe, it, expect, beforeAll } from 'vitest'

const SUPABASE_URL = 'http://localhost:54321'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

describe('Supabase DB Integration', () => {
  let userAId: string
  let userBId: string

  beforeAll(async () => {
    // Run migration before tests
    execSync('supabase db reset', { stdio: 'inherit' })
    
    // Create two test users using service role
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Create User A
    const { data: userA, error: userAError } = await supabaseAdmin.auth.admin.createUser({
      email: 'user-a@test.com',
      password: 'password123',
      email_confirm: true
    })
    
    if (userAError) {
      console.error('Error creating user A:', userAError)
      throw userAError
    }
    userAId = userA.user.id
    
    // Create User B
    const { data: userB, error: userBError } = await supabaseAdmin.auth.admin.createUser({
      email: 'user-b@test.com',
      password: 'password123',
      email_confirm: true
    })
    
    if (userBError) {
      console.error('Error creating user B:', userBError)
      throw userBError
    }
    userBId = userB.user.id
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
  })

  it('tests Row-Level Security policies - user can access their own data', async () => {
    // Create client for User A
    const supabaseUserA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Sign in as User A
    const { data: signInData, error: signInError } = await supabaseUserA.auth.signInWithPassword({
      email: 'user-a@test.com',
      password: 'password123'
    })
    
    expect(signInError).toBeNull()
    expect(signInData.user?.id).toBe(userAId)
    
    // Insert a goal as User A
    const testGoal = {
      text: 'User A Goal',
      timeline: '2025',
      metrics: 'metric',
      archived: false,
      user_id: userAId
    }
    
    const { data: insertData, error: insertError } = await supabaseUserA
      .from('goals')
      .insert([testGoal])
      .select()
    
    expect(insertError).toBeNull()
    expect(insertData).toBeDefined()
    expect(insertData?.[0]?.text).toBe('User A Goal')
    
    // User A should be able to read their own goal
    const { data: readData, error: readError } = await supabaseUserA
      .from('goals')
      .select('*')
      .eq('user_id', userAId)
    
    expect(readError).toBeNull()
    expect(readData).toBeDefined()
    expect(readData?.length).toBeGreaterThan(0)
    expect(readData?.[0]?.text).toBe('User A Goal')
  })

  it('tests Row-Level Security policies - user cannot access other users data', async () => {
    // Create client for User B
    const supabaseUserB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Sign in as User B
    const { data: signInData, error: signInError } = await supabaseUserB.auth.signInWithPassword({
      email: 'user-b@test.com',
      password: 'password123'
    })
    
    expect(signInError).toBeNull()
    expect(signInData.user?.id).toBe(userBId)
    
    // User B should NOT be able to read User A's goal
    const { data: readData, error: readError } = await supabaseUserB
      .from('goals')
      .select('*')
      .eq('user_id', userAId)
    
    // Should return empty array due to RLS, not an error
    expect(readError).toBeNull()
    expect(readData).toBeDefined()
    expect(readData?.length).toBe(0) // No data returned due to RLS
    
    // User B should be able to read their own data (empty initially)
    const { data: ownData, error: ownError } = await supabaseUserB
      .from('goals')
      .select('*')
      .eq('user_id', userBId)
    
    expect(ownError).toBeNull()
    expect(ownData).toBeDefined()
    expect(ownData?.length).toBe(0) // User B has no goals yet
  })

  it('tests Row-Level Security policies - service role can bypass RLS', async () => {
    // Service role should be able to see all data (bypasses RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const { data: allGoals, error: allGoalsError } = await supabaseAdmin
      .from('goals')
      .select('*')
    
    expect(allGoalsError).toBeNull()
    expect(allGoals).toBeDefined()
    expect(allGoals?.length).toBeGreaterThan(0) // Should see User A's goal
  })
}) 