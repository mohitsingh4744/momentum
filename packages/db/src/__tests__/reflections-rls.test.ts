import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

describe('Reflections RLS Policies', () => {
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const timestamp = Date.now()

  beforeAll(async () => {
    // Wait a moment for database to be ready (pre-check script handles setup)
    await new Promise(resolve => setTimeout(resolve, 2000))
  })

  afterAll(async () => {
    // Clean up test data
    await supabase.from('reflections').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  })

  async function createAndConfirmUser(email: string, password: string) {
    const { data: user, error } = await supabase.auth.admin.createUser({
      email,
      password,
    })
    expect(error).toBeNull()
    expect(user.user).toBeDefined()
    // Confirm the user
    const { error: confirmError } = await supabase.auth.admin.updateUserById(user.user!.id, {
      email_confirm: true,
    })
    expect(confirmError).toBeNull()
    return user.user!
  }

  it('should allow users to insert their own reflections', async () => {
    // Create and confirm a test user
    const user = await createAndConfirmUser(`test-${timestamp}@example.com`, 'password123')

    // Get user's JWT token
    const { data: { session }, error: sessionError } = await supabase.auth.signInWithPassword({
      email: `test-${timestamp}@example.com`,
      password: 'password123',
    })

    expect(sessionError).toBeNull()
    expect(session).toBeDefined()

    // Create client with user's JWT
    const userClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0', {
      global: {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      },
    })

    // Insert reflection as the user
    const { data: reflection, error } = await userClient
      .from('reflections')
      .insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
        prompts: { question1: 'What did you accomplish today?' },
        answers: { question1: 'answer1' },
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(reflection).toBeDefined()
    expect(reflection.user_id).toBe(user.id)
  })

  it('should prevent users from inserting reflections for other users', async () => {
    // Create and confirm two test users
    const user2 = await createAndConfirmUser(`user2-${timestamp}@example.com`, 'password123')
    await createAndConfirmUser(`user1-${timestamp}@example.com`, 'password123')

    // Get user1's JWT token
    const { data: { session } } = await supabase.auth.signInWithPassword({
      email: `user1-${timestamp}@example.com`,
      password: 'password123',
    })

    // Create client with user1's JWT
    const userClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0', {
      global: {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      },
    })

    // Try to insert reflection for user2 (should fail due to RLS)
    const { data: reflection, error } = await userClient
      .from('reflections')
      .insert({
        user_id: user2.id, // Different user ID
        date: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
        prompts: { question1: 'What did you accomplish today?' },
        answers: { question1: 'answer1' },
      })
      .select()
      .single()

    expect(error).toBeDefined()
    expect(reflection).toBeNull()
  })

  it('should allow users to read only their own reflections', async () => {
    // Create and confirm two test users
    const user1 = await createAndConfirmUser(`reader1-${timestamp}@example.com`, 'password123')
    const user2 = await createAndConfirmUser(`reader2-${timestamp}@example.com`, 'password123')

    // Get user1's JWT token
    const { data: { session: session1 } } = await supabase.auth.signInWithPassword({
      email: `reader1-${timestamp}@example.com`,
      password: 'password123',
    })
    // Get user2's JWT token
    const { data: { session: session2 } } = await supabase.auth.signInWithPassword({
      email: `reader2-${timestamp}@example.com`,
      password: 'password123',
    })

    // Create clients with each user's JWT
    const user1Client = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0', {
      global: {
        headers: {
          Authorization: `Bearer ${session1!.access_token}`,
        },
      },
    })
    const user2Client = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0', {
      global: {
        headers: {
          Authorization: `Bearer ${session2!.access_token}`,
        },
      },
    })

    // Each user inserts their own reflection
    const { data: reflection1, error: error1 } = await user1Client
      .from('reflections')
      .insert({
        user_id: user1.id,
        date: new Date().toISOString().split('T')[0],
        prompts: { question1: 'What did you accomplish today?' },
        answers: { question1: 'user1 answer' },
      })
      .select()
      .single()
    expect(error1).toBeNull()
    expect(reflection1).toBeDefined()
    expect(reflection1.user_id).toBe(user1.id)

    const { data: reflection2, error: error2 } = await user2Client
      .from('reflections')
      .insert({
        user_id: user2.id,
        date: new Date().toISOString().split('T')[0],
        prompts: { question1: 'What did you accomplish today?' },
        answers: { question1: 'user2 answer' },
      })
      .select()
      .single()
    expect(error2).toBeNull()
    expect(reflection2).toBeDefined()
    expect(reflection2.user_id).toBe(user2.id)

    // User1 should only see their own reflection
    const { data: reflections1, error: readError1 } = await user1Client
      .from('reflections')
      .select('*')
    expect(readError1).toBeNull()
    expect(reflections1).toBeDefined()
    expect(reflections1!.length).toBe(1)
    expect(reflections1![0].user_id).toBe(user1.id)

    // User2 should only see their own reflection
    const { data: reflections2, error: readError2 } = await user2Client
      .from('reflections')
      .select('*')
    expect(readError2).toBeNull()
    expect(reflections2).toBeDefined()
    expect(reflections2!.length).toBe(1)
    expect(reflections2![0].user_id).toBe(user2.id)
  })
}) 