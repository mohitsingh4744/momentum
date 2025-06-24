# Momentum — Bolt Prompt Series for Test‑Driven Supabase Implementation

This file contains **15 incremental prompts** for a code‑generation LLM in Bolt.  
Each prompt enforces best practices: **start with tests, small steps, no dangling code**. Copy‑paste them into Bolt in order.

---

## Prompt 1 – Bootstrap the repo & CI

```bolt
# Goal
Create an empty monorepo (pnpm workspaces) for:
• /apps/web       – Next.js 14 + TypeScript
• /apps/edge      – Supabase Edge Functions (Deno 1.40)
• /packages/db    – SQL migrations + generated Supabase types

# Tasks
1. Scaffold the workspace with pnpm + eslint @next/core-web-vitals.
2. Add a GitHub Actions workflow that runs `pnpm install`, lint, type-check and Vitest.
3. Provide a passing “hello world” Vitest in /apps/web.

# Deliverables
* All package.json/workspace files.
* The CI YAML.
* The single passing test.
```

---

## Prompt 2 – Supabase project & migration chain

```bolt
# Pre-existing code
From Prompt 1.

# Goal
Introduce Supabase in /packages/db.

# Tasks
1. Add Supabase CLI config (supabase/config.toml) pointing to local dev.
2. Write the first migration 0001_init.sql that:
   • enables pgcrypto
   • creates tables goals, reflections, weekly_reports (columns per spec)
3. Add npm script: "db:migrate:dev": "supabase db reset --linked"

# Tests
* Use Vitest + @supabase/supabase-js with `SUPABASE_ANON_KEY` from local dev.
* Write an integration test that:
  - Runs migration,
  - Inserts a sample goal row with the anon key,
  - Selects it back.

# Deliverables
* Migration SQL.
* Updated scripts.
* Passing integration test.
```

---

## Prompt 3 – Row-Level-Security policies

```bolt
# Pre-existing code
Migrations & test harness from Prompt 2.

# Goal
Add RLS so every row is owner-scoped.

# Tasks
1. New migration 0002_rls.sql enabling RLS on all three tables and adding policy “owner”.
2. Adjust the integration test:
   • Insert as user A (anon key).
   • Attempt read as user B (second service key) and assert denial (403).

# Deliverables
* Migration.
* Updated test (now covers both success + fail).
```

---

## Prompt 4 – `bootstrap_new_user` Edge Function

```bolt
# Pre-existing code
Repo + DB + RLS.

# Goal
First serverless function that seeds default quota rows on signup.

# Tasks
1. In /apps/edge create `bootstrap_new_user/index.ts`.  
   • Expect Supabase Auth webhook payload.  
   • Insert into gpt_token_usage (month_start = first of month).  
2. Add unit test with Deno.test + fresh connection string (supabase-js for Deno).

# Deliverables
* Edge function source.
* Passing Deno unit test.
* Update CI to run `supabase functions test` stage.
```

---

## Prompt 5 – Web auth scaffolding

```bolt
# Pre-existing code
Edge function live, tests pass.

# Goal
Minimal Next.js auth flow.

# Tasks
1. Install @supabase/auth-helpers-nextjs.
2. Create /apps/web/src/pages/login.tsx with magic-link login.
3. Protect /dashboard route using withPageAuth.
4. Add Vitest React test rendering <LoginPage /> and asserting the form exists.

# Deliverables
* Login & protected pages.
* Passing component test.
```

---

## Prompt 6 – Goal CRUD API (tRPC) + client hooks

```bolt
# Pre-existing code
Auth ready.

# Goal
Expose secure goal endpoints.

# Tasks
1. Add tRPC router `/api/trpc/goals` with procedures: createGoal, listGoals, archiveGoal.
2. Each procedure must:
   • validate zod schema,
   • call Supabase from server side with user session JWT (no service key!).
3. Write Vitest tests using createServerSideHelpers to call each procedure.

# Deliverables
* tRPC router & server helpers.
* Passing procedure tests.
```

---

## Prompt 7 – Daily Prompt generator cron

```bolt
# Pre-existing code
Goal CRUD finished.

# Goal
Edge function that runs hourly, finds users crossing 20:00 local, and inserts daily prompts.

# Tasks
1. Implement /apps/edge/daily_prompt_job/index.ts:
   • Query `select * from auth.users` where NOW AT TIME ZONE(user_tz) = '20:00'.
   • Insert reflection row with generated prompts (stub array for now).
2. Add Deno test with mocked `supabase.from('auth.users')` returning two users in different TZs.
3. Update supabase/functions.toml schedule: cron “0 * * * *”.

# Deliverables
* Edge function.
* Passing mock test.
```

---

## Prompt 8 – Reflection submission flow

```bolt
# Pre-existing code
Prompt generator exists.

# Goal
Let users answer prompts & update streak in realtime.

# Tasks
1. Extend tRPC router with saveReflection procedure that:
   • writes answers JSON,
   • emits Supabase Realtime broadcast “new_reflection”.
2. Add RLS test ensuring only owner can write the row.
3. Write React hook `useRealtimeStreak` subscribing to the channel.
4. Component test with Vitest & @testing-library: submit answers → expect streak UI update.

# Deliverables
* Procedure, RLS test, hook, component test all green.
```

---

## Prompt 9 – Token guardrail & OpenAI proxy

```bolt
# Pre-existing code
Reflection flow.

# Goal
Edge function fronting GPT with quota check.

# Tasks
1. `token_guard/index.ts` (Edge) receives prompt & max_tokens.
2. Reads row gpt_token_usage, aborts if over monthly limit.
3. On success, forwards to OpenAI, records usage inside Postgres in same transaction (rpc call).
4. Deno tests:
   • success path,
   • rejection when over limit.

# Deliverables
* Edge function + tests.
```

---

## Prompt 10 – Stripe subscription webhooks

```bolt
# Pre-existing code
Quota logic finished.

# Goal
Handle paid tiers.

# Tasks
1. Create Edge function `stripe_webhook/index.ts`.
2. Verify signature, parse event types: customer.subscription.created|updated|deleted.
3. Update `stripe_subscriptions` & `auth.users.role`.
4. Deno tests with fixture events.

# Deliverables
* Webhook handler & passing tests.
```

---

## Prompt 11 – Weekly report builder & PDF

```bolt
# Pre-existing code
Payment done.

# Goal
Generate PDF summary.

# Tasks
1. Edge function `weekly_report_job/index.ts` (cron Sun 03:00 UTC):
   • Aggregate reflections of past 7 days,
   • Render HTML template (react-email) → pdf-lib → store in Supabase Storage,
   • Insert weekly_reports row with pdf_url.
2. Add Deno test mocking Storage upload.

# Deliverables
* Job function & test.
```

---

## Prompt 12 – Dashboard wiring

```bolt
# Pre-existing code
All back-end pieces ready.

# Goal
Put it all together in /dashboard.

# Tasks
1. Fetch goals, streak, latest weekly report URL via parallel tRPC queries.
2. Render cards: Active Goals, Today’s Prompts (or answers), Streak, Latest Report.
3. Add e2e test with Playwright:
   • login,
   • create goal,
   • submit reflection,
   • observe streak increment.

# Deliverables
* React dashboard page.
* Passing Playwright e2e.
```

---

## Prompt 13 – Deployment pipeline

```bolt
# Pre-existing code
Full app compiled locally.

# Goal
Complete CI → Prod CD.

# Tasks
1. Finalise GitHub Actions:
   • On merge to main: supabase db push, supabase functions deploy, Vercel prod.
2. Add status badge to README.
3. Provide sample .env.example with all required keys.

# Deliverables
* Updated workflow YAML.
* README badge & env template.
```

---

## Prompt 14 – Clean‑up & docs

```bolt
# Pre-existing code
Pipeline live.

# Goal
Tie loose ends.

# Tasks
1. Ensure no TODOs remain; replace stubs (e.g., fake prompt generator).
2. Add JSDoc to every exported function.
3. Generate API reference via tRPC OpenAPI plugin & commit to /docs/openapi.json.

# Deliverables
* Zero lint-errors run.
* Committed openapi.json.
```

---

## Prompt 15 – Release checklist (manual)

```bolt
Provide a release checklist covering:
• Supabase project passwords rotated.
• Stripe webhooks point to prod URL.
• OpenAI billing cap set.
• Sentry DSNs validated.
• GDPR export endpoints reviewed.
```

---

*End of prompt series.*
