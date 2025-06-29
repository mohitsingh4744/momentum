import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const EDGE_URL = "http://localhost:54321/functions/v1/weekly_report_job";

// Mock reflection data
const mockReflections = [
  {
    id: "reflection-1",
    user_id: "user-1",
    date: "2024-01-01",
    prompts: { q1: "How was your day?", q2: "What did you learn?" },
    answers: { q1: "It was great! I made good progress on my goals.", q2: "I learned that consistency is key to success." },
    created_at: "2024-01-01T10:00:00Z"
  },
  {
    id: "reflection-2", 
    user_id: "user-1",
    date: "2024-01-02",
    prompts: { q1: "How was your day?", q2: "What challenges did you face?" },
    answers: { q1: "Today was challenging but I stayed positive.", q2: "I struggled with time management but kept going." },
    created_at: "2024-01-02T10:00:00Z"
  },
  {
    id: "reflection-3",
    user_id: "user-1", 
    date: "2024-01-03",
    prompts: { q1: "How was your day?", q2: "What are you grateful for?" },
    answers: { q1: "Amazing day! I achieved my main goal.", q2: "I'm grateful for my supportive team and progress." },
    created_at: "2024-01-03T10:00:00Z"
  }
];

// Mock goals data
const mockGoals = [
  {
    id: "goal-1",
    user_id: "user-1",
    text: "Learn TypeScript",
    timeline: "3 months",
    metrics: "Complete 5 projects",
    archived: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "goal-2",
    user_id: "user-1", 
    text: "Exercise regularly",
    timeline: "Ongoing",
    metrics: "3 times per week",
    archived: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
];

Deno.test("weekly_report_job: generates report for user with reflections", async () => {
  // Setup: create a test user
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: `test-weekly-report-${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true
  });
  
  if (userError) {
    console.error("Error creating user:", userError);
    throw userError;
  }
  
  const userId = user.user.id;
  
  // Insert test reflections
  for (const reflection of mockReflections) {
    const { error: reflectionError } = await supabase
      .from('reflections')
      .insert({
        user_id: userId,
        date: reflection.date,
        prompts: reflection.prompts,
        answers: reflection.answers
      });
    
    if (reflectionError) {
      console.error("Error inserting reflection:", reflectionError);
      throw reflectionError;
    }
  }
  
  // Insert test goals
  for (const goal of mockGoals) {
    const { error: goalError } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        text: goal.text,
        timeline: goal.timeline,
        metrics: goal.metrics,
        archived: goal.archived
      });
    
    if (goalError) {
      console.error("Error inserting goal:", goalError);
      throw goalError;
    }
  }

  // Call the weekly report job
  const resp = await fetch(EDGE_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json"
    },
    body: JSON.stringify({}),
  });
  
  console.log("Weekly report job response status:", resp.status);
  const data = await resp.json();
  console.log("Weekly report job response data:", data);
  
  assertEquals(resp.status, 200);
  assertEquals(data.message, "Weekly reports generated successfully");
  assertEquals(data.users_processed, 1);
  assertEquals(data.results.length, 1);
  assertEquals(data.results[0].user_id, userId);
  assertEquals(data.results[0].reflections_count, 3);
  
  // Verify weekly report was created in database
  const { data: weeklyReport, error: reportError } = await supabase
    .from('weekly_reports')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  assertEquals(reportError, null);
  assertEquals(weeklyReport?.user_id, userId);
  assertEquals(weeklyReport?.summary.total_reflections, 3);
  assertEquals(weeklyReport?.summary.reflection_dates.length, 3);
  assertEquals(weeklyReport?.summary.goals_progress.total_goals, 2);
  assertEquals(weeklyReport?.summary.goals_progress.active_goals, 1);
  assertEquals(weeklyReport?.summary.goals_progress.completed_goals, 1);
  assertEquals(typeof weeklyReport?.pdf_url, 'string');
});

Deno.test("weekly_report_job: handles user with no reflections", async () => {
  // Setup: create a test user with no reflections
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: `test-no-reflections-${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true
  });
  
  if (userError) {
    console.error("Error creating user:", userError);
    throw userError;
  }
  
  const userId = user.user.id;

  // Call the weekly report job
  const resp = await fetch(EDGE_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json"
    },
    body: JSON.stringify({}),
  });
  
  console.log("Weekly report job (no reflections) response status:", resp.status);
  const data = await resp.json();
  console.log("Weekly report job (no reflections) response data:", data);
  
  assertEquals(resp.status, 200);
  assertEquals(data.message, "Weekly reports generated successfully");
  // Should process 0 users since no reflections exist
  assertEquals(data.users_processed, 0);
  assertEquals(data.results.length, 0);
});

Deno.test("weekly_report_job: aggregates multiple users", async () => {
  // Setup: create two test users with reflections
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const user1 = await supabase.auth.admin.createUser({
    email: `test-multi-user1-${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true
  });
  
  const user2 = await supabase.auth.admin.createUser({
    email: `test-multi-user2-${Date.now()}@example.com`, 
    password: 'password123',
    email_confirm: true
  });
  
  if (user1.error || user2.error) {
    console.error("Error creating users:", user1.error || user2.error);
    throw user1.error || user2.error;
  }
  
  // Insert reflections for both users
  for (const reflection of mockReflections) {
    await supabase.from('reflections').insert({
      user_id: user1.data.user.id,
      date: reflection.date,
      prompts: reflection.prompts,
      answers: reflection.answers
    });
    
    await supabase.from('reflections').insert({
      user_id: user2.data.user.id,
      date: reflection.date,
      prompts: reflection.prompts,
      answers: reflection.answers
    });
  }

  // Call the weekly report job
  const resp = await fetch(EDGE_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json"
    },
    body: JSON.stringify({}),
  });
  
  console.log("Weekly report job (multiple users) response status:", resp.status);
  const data = await resp.json();
  console.log("Weekly report job (multiple users) response data:", data);
  
  assertEquals(resp.status, 200);
  assertEquals(data.message, "Weekly reports generated successfully");
  assertEquals(data.users_processed, 2);
  assertEquals(data.results.length, 2);
  
  // Verify both users have reports
  const { data: reports, error: reportsError } = await supabase
    .from('weekly_reports')
    .select('*')
    .in('user_id', [user1.data.user.id, user2.data.user.id]);
  
  assertEquals(reportsError, null);
  assertEquals(reports?.length, 2);
});

Deno.test("weekly_report_job: handles invalid request method", async () => {
  const resp = await fetch(EDGE_URL, {
    method: "GET",
    headers: { 
      "Content-Type": "application/json"
    }
  });
  
  assertEquals(resp.status, 405);
  const data = await resp.text();
  assertEquals(data, "Method Not Allowed");
});

Deno.test("weekly_report_job: handles CORS preflight", async () => {
  const resp = await fetch(EDGE_URL, {
    method: "OPTIONS",
    headers: { 
      "Content-Type": "application/json"
    }
  });
  
  assertEquals(resp.status, 200);
  const data = await resp.text();
  assertEquals(data, "ok");
}); 