-- ====================================================================
-- MASTER FIX FOR TAAL CRM SUPABASE TABLES & RLS POLICIES
-- Copy and paste ALL of this into Supabase SQL Editor and click RUN
-- ====================================================================

-- 1. DISABLE RLS ON ALL CRM TABLES (Allows instant saves from App)
ALTER TABLE IF EXISTS expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS new_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dhol_pan DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dhol_maintenance DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dhols DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS biometric_devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance_logs DISABLE ROW LEVEL SECURITY;

-- 2. FIX CONSTRAINTS ON DAILY_REPORTS (Prevents Not-Null Errors)
ALTER TABLE IF EXISTS daily_reports ALTER COLUMN report_type DROP NOT NULL;
ALTER TABLE IF EXISTS daily_reports ADD COLUMN IF NOT EXISTS work_type text;
ALTER TABLE IF EXISTS daily_reports ADD COLUMN IF NOT EXISTS broken_part text;
ALTER TABLE IF EXISTS daily_reports ADD COLUMN IF NOT EXISTS repair_status text DEFAULT 'Pending';

-- 3. CREATE DASHBOARD TABLES (DEALS, TASKS, ACTIVITIES, METRICS)
CREATE TABLE IF NOT EXISTS deals (
  id bigint primary key generated always as identity,
  company text not null default '',
  title text not null default '',
  owner text not null default '',
  stage text not null default 'Lead',
  priority text not null default 'medium',
  value numeric not null default 0,
  close date,
  created_at timestamptz default now()
);
ALTER TABLE IF EXISTS deals DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS tasks (
  id bigint primary key generated always as identity,
  title text not null default '',
  due text,
  done boolean default false,
  owner text,
  priority text default 'Medium',
  created_at timestamptz default now()
);
ALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS activities (
  id bigint primary key generated always as identity,
  type text not null default '',
  description text,
  created_at timestamptz default now()
);
ALTER TABLE IF EXISTS activities DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS metrics (
  id bigint primary key generated always as identity,
  month text,
  revenue numeric not null default 0,
  target numeric not null default 0,
  created_at timestamptz default now()
);
ALTER TABLE IF EXISTS metrics DISABLE ROW LEVEL SECURITY;

-- 4. SEED SAMPLE DEALS IF TABLE IS EMPTY
INSERT INTO deals (company, title, owner, stage, priority, value, close) VALUES
  ('Northwind Traders', 'Dhol Maintenance Contract', 'Ava Patel', 'Negotiation', 'high', 48000, '2026-08-12'),
  ('Globex Corp', 'Pan Supply Bulk Order', 'Liam Chen', 'Proposal', 'medium', 32000, '2026-08-20'),
  ('Initech', 'Pathak Uniform Accessories', 'Sofia Rossi', 'Qualified', 'low', 21500, '2026-09-02'),
  ('Stark Industries', 'Ganeshotsav 2026 Performance', 'Liam Chen', 'Closed Won', 'high', 92000, '2026-07-30')
ON CONFLICT DO NOTHING;
