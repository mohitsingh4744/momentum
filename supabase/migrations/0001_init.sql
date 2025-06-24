-- Enable pgcrypto extension
create extension if not exists "pgcrypto";

-- Goals table
create table goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  text        text not null,
  timeline    text,
  metrics     text,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Reflections table
create table reflections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  date        date not null,
  prompts     jsonb not null,
  answers     jsonb not null,
  created_at  timestamptz not null default now()
);

-- Weekly reports table
create table weekly_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  week_start  date not null,
  summary     jsonb not null,
  pdf_url     text,
  created_at  timestamptz not null default now()
); 