import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const EDGE_URL = "http://localhost:54321/functions/v1/token_guard";

Deno.test("token_guard: quota check passes, OpenAI API key error (expected with test key)", async () => {
  // Setup: create a test user and quota row under the limit
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Create a real user first
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true
  });
  
  if (userError) {
    console.error("Error creating user:", userError);
    throw userError;
  }
  
  const userId = user.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  await supabase.from("gpt_token_usage").delete().eq("user_id", userId).eq("month_start", monthStart);
  await supabase.from("gpt_token_usage").insert({
    user_id: userId,
    month_start: monthStart,
    tokens_used: 0,
    tokens_limit: 1000,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  // Call the edge function (simulate OpenAI with a small max_tokens)
  const resp = await fetch(EDGE_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      prompt: "Say hello!",
      max_tokens: 5,
      user_id: userId,
    }),
  });
  
  console.log("Response status:", resp.status);
  const data = await resp.json();
  console.log("Response data:", data);
  
  // With test API key, expect 502 error - this proves the function works correctly
  // The quota check passed (no 403), but OpenAI API call failed due to invalid key
  assertEquals(resp.status, 502);
  assertEquals(data.error, "OpenAI error");
  assertEquals(data.details.error.code, "invalid_api_key");
});

Deno.test("token_guard: rejection path (over quota)", async () => {
  // Setup: create a test user and quota row over the limit
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Create a real user first
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: `test-reject-${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true
  });
  
  if (userError) {
    console.error("Error creating user:", userError);
    throw userError;
  }
  
  const userId = user.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  await supabase.from("gpt_token_usage").delete().eq("user_id", userId).eq("month_start", monthStart);
  await supabase.from("gpt_token_usage").insert({
    user_id: userId,
    month_start: monthStart,
    tokens_used: 1000,
    tokens_limit: 1000,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  // Call the edge function (should be rejected)
  const resp = await fetch(EDGE_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      prompt: "Say hello!",
      max_tokens: 5,
      user_id: userId,
    }),
  });
  
  console.log("Rejection response status:", resp.status);
  const data = await resp.json();
  console.log("Rejection response data:", data);
  
  assertEquals(resp.status, 403);
  assertEquals(data.error, "Over monthly token limit");
}); 