-- ================================================================
-- DHOL MAINTENANCE TABLE — SUPABASE SQL SETUP SCRIPT
-- Run this in Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. CREATE TABLE (if not already exists)
CREATE TABLE IF NOT EXISTS public.dhol_maintenance (
  id            BIGSERIAL PRIMARY KEY,
  dhol_id       INTEGER NOT NULL,
  dhol_number   INTEGER NOT NULL,
  dhol_size     TEXT NOT NULL DEFAULT '28',
  maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description   TEXT NOT NULL DEFAULT 'Normal Dhol',
  done_by       TEXT NOT NULL,
  done_by_2     TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CREATE INDEXES for fast queries
CREATE INDEX IF NOT EXISTS idx_dhol_maintenance_dhol_number
  ON public.dhol_maintenance(dhol_number);

CREATE INDEX IF NOT EXISTS idx_dhol_maintenance_date
  ON public.dhol_maintenance(maintenance_date DESC);

CREATE INDEX IF NOT EXISTS idx_dhol_maintenance_created_at
  ON public.dhol_maintenance(created_at DESC);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.dhol_maintenance ENABLE ROW LEVEL SECURITY;

-- 4. DROP OLD POLICIES (if any) — prevents conflicts
DROP POLICY IF EXISTS "Allow anon select" ON public.dhol_maintenance;
DROP POLICY IF EXISTS "Allow anon insert" ON public.dhol_maintenance;
DROP POLICY IF EXISTS "Allow anon update" ON public.dhol_maintenance;
DROP POLICY IF EXISTS "Allow anon delete" ON public.dhol_maintenance;
DROP POLICY IF EXISTS "Allow public select" ON public.dhol_maintenance;
DROP POLICY IF EXISTS "Allow public insert" ON public.dhol_maintenance;

-- 5. CREATE RLS POLICIES — allow anon key (browser) to read & write
-- SELECT: Anyone can read maintenance logs
CREATE POLICY "Allow anon select"
  ON public.dhol_maintenance
  FOR SELECT
  USING (true);

-- INSERT: Anyone can add a new maintenance log
CREATE POLICY "Allow anon insert"
  ON public.dhol_maintenance
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Anyone can update (optional, enable if needed)
CREATE POLICY "Allow anon update"
  ON public.dhol_maintenance
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- DELETE: Anyone can delete (optional, enable if needed)
CREATE POLICY "Allow anon delete"
  ON public.dhol_maintenance
  FOR DELETE
  USING (true);

-- 6. ENABLE REALTIME for live updates
-- (Go to Supabase Dashboard → Database → Replication → Enable for dhol_maintenance)
-- OR run:
ALTER PUBLICATION supabase_realtime ADD TABLE public.dhol_maintenance;

-- 7. VERIFY SETUP — run these to check:
-- SELECT * FROM public.dhol_maintenance ORDER BY created_at DESC LIMIT 10;
-- SELECT schemaname, tablename, policyname, cmd, qual FROM pg_policies WHERE tablename = 'dhol_maintenance';

-- ================================================================
-- DONE! Your dhol_maintenance table is ready.
-- Data will persist permanently in Supabase.
-- Refresh pe data gayab nahi hoga.
-- ================================================================
