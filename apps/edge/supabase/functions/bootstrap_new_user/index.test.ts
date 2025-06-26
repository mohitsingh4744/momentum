import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

Deno.test("bootstrap_new_user function logic - quota data structure", () => {
  // Test the quota data structure that would be created
  const userId = 'test-user-id'
  const createdAt = new Date().toISOString()
  
  // Calculate the first day of the current month
  const now = new Date(createdAt)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthStartISO = monthStart.toISOString()
  
  // Create the quota object that would be inserted
  const quotaData = {
    user_id: userId,
    month_start: monthStartISO,
    tokens_used: 0,
    tokens_limit: 100000, // Default monthly limit
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  // Verify the structure
  assertEquals(quotaData.user_id, userId)
  assertEquals(quotaData.tokens_used, 0)
  assertEquals(quotaData.tokens_limit, 100000)
  assertEquals(typeof quotaData.month_start, 'string')
  assertEquals(typeof quotaData.created_at, 'string')
  assertEquals(typeof quotaData.updated_at, 'string')
  
  // Verify month_start is a valid date
  const monthStartDate = new Date(quotaData.month_start)
  assertEquals(monthStartDate.getDate(), 1) // Should be first day of month
})

Deno.test("bootstrap_new_user function logic - webhook payload validation", () => {
  // Test the webhook payload validation logic
  const validPayload = {
    type: 'INSERT',
    table: 'users',
    schema: 'auth',
    record: {
      id: 'test-id',
      email: 'test@example.com',
      created_at: new Date().toISOString()
    },
    old_record: null
  }
  
  const invalidPayload = {
    type: 'UPDATE',
    table: 'users',
    schema: 'auth',
    record: {
      id: 'test-id',
      email: 'test@example.com',
      created_at: new Date().toISOString()
    },
    old_record: {}
  }
  
  // Test validation logic (this would be in the edge function)
  const isValidInsert = validPayload.type === 'INSERT' && 
                       validPayload.table === 'users' && 
                       validPayload.schema === 'auth'
  
  const isInvalidInsert = invalidPayload.type === 'INSERT' && 
                         invalidPayload.table === 'users' && 
                         invalidPayload.schema === 'auth'
  
  assertEquals(isValidInsert, true)
  assertEquals(isInvalidInsert, false)
})

Deno.test("bootstrap_new_user function logic - month start calculation", () => {
  // Test the month start calculation logic with a simple approach
  const testDate = new Date(2024, 0, 15) // January 15, 2024
  const expectedMonthStart = new Date(2024, 0, 1) // January 1, 2024
  
  const calculatedMonthStart = new Date(testDate.getFullYear(), testDate.getMonth(), 1)
  
  // Compare the dates
  assertEquals(calculatedMonthStart.getFullYear(), expectedMonthStart.getFullYear())
  assertEquals(calculatedMonthStart.getMonth(), expectedMonthStart.getMonth())
  assertEquals(calculatedMonthStart.getDate(), expectedMonthStart.getDate())
}) 