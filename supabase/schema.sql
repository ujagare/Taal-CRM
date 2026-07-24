-- Meridian CRM schema
create extension if not exists "pgcrypto";

create table if not exists kpis (
  id text primary key,
  label text not null,
  value numeric not null,
  prefix text,
  suffix text,
  delta numeric,
  trend text check (trend in ('up', 'down'))
);

create table if not exists revenue (
  month text primary key,
  value numeric not null
);

create table if not exists pipeline_stages (
  id text primary key,
  label text not null,
  count int not null,
  value numeric not null,
  color text not null
);

create table if not exists deals (
  id bigint primary key generated always as identity,
  company text not null,
  owner text not null,
  stage text not null check (stage in ('Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  value numeric not null default 0,
  close date
);

create table if not exists tasks (
  id bigint primary key generated always as identity,
  title text not null,
  due text,
  done boolean default false,
  owner text
);

create table if not exists activities (
  id bigint primary key generated always as identity,
  type text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists metrics (
  id bigint primary key generated always as identity,
  month text,
  revenue numeric not null default 0,
  target numeric not null default 0
);

-- TAAL Assets inventory table
create table if not exists taal_assets (
  id bigint primary key generated always as identity,
  item text not null,
  qty text not null,
  custodian text not null,
  category text not null,
  location text not null,
  note text,
  created_at timestamptz default now()
);

-- Dhol Pan inventory
create table if not exists dhol_pan (
  id bigint primary key generated always as identity,
  pane_type text not null default 'old',
  size text not null,
  thapi int not null default 0,
  dhoom int not null default 0,
  arrived_at timestamptz,
  brought_at timestamptz,
  brought_by text,
  created_at timestamptz default now(),
  unique(pane_type, size)
);

-- Add new columns if table already exists (safe to run)
-- alter table dhol_pan add column if not exists pane_type text not null default 'old';
-- alter table dhol_pan add column if not exists arrived_at timestamptz;
alter table dhol_pan add column if not exists brought_at timestamptz;
alter table dhol_pan add column if not exists brought_by text;
-- alter table dhol_pan drop constraint if exists dhol_pan_size_key;
-- alter table dhol_pan add constraint dhol_pan_pane_type_size_key unique(pane_type, size);

insert into dhol_pan (pane_type, size, thapi, dhoom) values
  ('old', '२६"', 3, 3),
  ('old', '२८"', 39, 51),
  ('old', '३०"', 8, 9),
  ('new', '२६"', 0, 0),
  ('new', '२८"', 0, 0),
  ('new', '३०"', 0, 0)
on conflict (pane_type, size) do nothing;

-- New Member Registration table (from Google Forms)
create table if not exists new_members (
  id bigint primary key generated always as identity,
  timestamp text,
  full_name text not null,
  email text unique,
  gender text,
  whatsapp text,
  parent_contact text,
  dob text,
  address text,
  profession text,
  injury_info text,
  previous_pathak text,
  instruments_played text,
  experience text,
  flag_dancing text,
  other_instruments text,
  hobbies text,
  reference text,
  exam_status text not null default 'pending' check (exam_status in ('passed', 'failed', 'pending')),
  exam_score text,
  exam_notes text,
  created_at timestamptz default now()
);

-- Dhol Master List (54 dhols)
create table if not exists dhols (
  id bigint primary key generated always as identity,
  dhol_number integer unique not null,
  size integer not null check (size in (26, 28, 30)),
  maker_name text,
  notes text,
  created_at timestamptz default now()
);

-- Dhol Maintenance Log
create table if not exists dhol_maintenance (
  id bigint primary key generated always as identity,
  dhol_id bigint not null references dhols(id) on delete cascade,
  dhol_number integer,
  dhol_size text,
  maintenance_date date not null default now(),
  description text not null default 'Normal Dhol',
  done_by text,
  done_by_2 text,
  created_at timestamptz default now()
);

-- Add columns if table already exists (safe to run multiple times)
alter table dhol_maintenance add column if not exists done_by_2 text;
alter table dhol_maintenance add column if not exists dhol_number integer;
alter table dhol_maintenance add column if not exists dhol_size text;

create index if not exists idx_dhol_maintenance_dhol_id on dhol_maintenance(dhol_id);
create index if not exists idx_dhol_maintenance_date on dhol_maintenance(maintenance_date desc);
create index if not exists idx_dhols_size on dhols(size);

-- Disable RLS for dhol tables (auth not enabled yet)
alter table dhols disable row level security;
alter table dhol_maintenance disable row level security;

-- Row Level Security (enable once auth is wired up)
-- alter table deals enable row level security;

-- Seed sample data
insert into kpis (id, label, value, prefix, suffix, delta, trend) values
  ('revenue', 'Pipeline Revenue', 1284500, '$', null, 12.4, 'up'),
  ('deals', 'Open Deals', 248, null, null, 4.1, 'up'),
  ('win', 'Win Rate', 63.2, null, '%', -2.3, 'down'),
  ('tasks', 'Tasks Due', 37, null, null, 8.0, 'up')
on conflict (id) do nothing;

insert into revenue (month, value) values
  ('Jan', 42000), ('Feb', 51000), ('Mar', 47000), ('Apr', 63000),
  ('May', 58000), ('Jun', 72000), ('Jul', 69000), ('Aug', 81000),
  ('Sep', 76000), ('Oct', 92000), ('Nov', 88000), ('Dec', 104000)
on conflict (month) do nothing;

insert into pipeline_stages (id, label, count, value, color) values
  ('lead', 'Lead', 42, 184000, '#598dff'),
  ('qualified', 'Qualified', 31, 246000, '#3366ff'),
  ('proposal', 'Proposal', 24, 312000, '#1f47f5'),
  ('negotiation', 'Negotiation', 18, 286000, '#1735e1'),
  ('won', 'Won', 15, 256500, '#10b981')
on conflict (id) do nothing;

-- Expense Tracker table
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  payer_name text not null,
  item_description text not null,
  amount numeric not null default 0,
  category text not null default 'other',
  bill_date date not null,
  payment_method text not null check (payment_method in ('cash', 'online')),
  image_url text,
  notes text,
  created_at timestamptz default now()
);

-- Add columns if table already exists (safe to run multiple times)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amount numeric NOT NULL DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

-- Disable RLS on expenses and new_members for development access
alter table expenses disable row level security;
alter table new_members disable row level security;

-- Daily Report table
create table if not exists daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  dhol_number text,
  dhol_size text,
  work_type text,
  broken_part text,
  broken_by text,
  made_by text,
  repair_status text default 'Pending',
  dori_status text default 'Available',
  pan_main_status text default 'Available',
  toolbox_status text default 'OK',
  new_dori_added text default 'No',
  dori_added_by text,
  yesterday_breaker text,
  repaired_by_same_person text,
  ready_count integer default 0,
  notes text,
  report_type text not null,
  created_at timestamptz default now()
);

-- Enable RLS on daily_reports table (can be enabled when auth is set up)
alter table daily_reports enable row level security;

-- Indexes for better query performance
create index if not exists idx_expenses_date on expenses(bill_date);
create index if not exists idx_expenses_payment_method on expenses(payment_method);
create index if not exists idx_daily_reports_date on daily_reports(report_date);
create index if not exists idx_daily_reports_report_type on daily_reports(report_type);

-- =====================================================
-- ATTENDANCE MANAGEMENT MODULE TABLES
-- =====================================================

-- Batches Master Table
create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year integer not null default 2026,
  course text not null default 'Dhol Tasha Training',
  trainer_name text,
  created_at timestamptz default now()
);

-- Students Master Table
create table if not exists students (
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

-- Attendance Records Table
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  student_name text not null,
  roll_number text,
  batch_name text not null default '2026 Batch',
  attendance_date date not null default current_date,
  check_in time,
  check_out time,
  total_minutes integer default 0,
  status text not null default 'Present',
  device_name text default 'Biometric Gate 1',
  created_at timestamptz default now()
);

-- Biometric Devices Table
create table if not exists biometric_devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null default 'ZKTeco',
  ip_address text,
  location text default 'Main Gate',
  status text not null default 'Online',
  last_sync timestamptz default now(),
  created_at timestamptz default now()
);

-- Attendance Logs Table
create table if not exists attendance_logs (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  event_type text not null,
  log_time timestamptz default now(),
  device_name text default 'ZKTeco K40'
);

-- Disable RLS for Attendance tables (development & CRM access)
alter table batches disable row level security;
alter table students disable row level security;
alter table attendance disable row level security;
alter table biometric_devices disable row level security;
alter table attendance_logs disable row level security;


-- =====================================================
-- AUTH ACTIVITY LOGS (Login / Logout Tracking)
-- =====================================================
create table if not exists auth_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_name text not null,
  user_email text,
  event_type text not null check (event_type in ('login', 'logout')),
  device_info text,
  logged_at timestamptz default now()
);

alter table auth_activity_logs disable row level security;
create index if not exists idx_auth_activity_logs_time on auth_activity_logs(logged_at desc);
create index if not exists idx_auth_activity_logs_event on auth_activity_logs(event_type);

-- Note: Storage bucket for expense bills needs to be created separately
-- In Supabase dashboard: Storage -> New Bucket -> Name: expense-bills -> Public access: Public
-- Or via Supabase CLI: supabase storage create expense-bills --public
