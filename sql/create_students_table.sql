-- Students table required for Attendance Management
-- Run this in Supabase SQL Editor

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  roll_number text not null,
  name text not null,
  phone text,
  batch_name text not null default '2026 Batch',
  course text not null default 'Dhol Tasha Training',
  status text not null default 'Active',
  avatar_url text,
  created_at timestamptz default now()
);

-- Disable RLS for development (same pattern as other tables in this project)
alter table public.students disable row level security;

-- Grant access to anon and authenticated (if needed)
grant all on public.students to anon;
grant all on public.students to authenticated;
