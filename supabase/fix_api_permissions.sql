-- =====================================================
-- FIX API PERMISSIONS & RLS FOR ALL TABLES
-- =====================================================
-- Run this in Supabase SQL Editor to ensure all tables
-- are accessible via REST API and RLS is properly disabled
-- =====================================================

-- Disable RLS on all application tables
ALTER TABLE IF EXISTS kpis DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS revenue DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pipeline_stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS metrics DISABLE ROW LEVEL SECURITY;

-- TAAL Pathak Tables
ALTER TABLE IF EXISTS taal_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dhol_pan DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS new_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dhols DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dhol_maintenance DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_reports DISABLE ROW LEVEL SECURITY;

-- Inventory Tables
ALTER TABLE IF EXISTS dori_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS main_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dori_size_inventory DISABLE ROW LEVEL SECURITY;

-- Attendance Module
ALTER TABLE IF EXISTS batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS biometric_devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance_logs DISABLE ROW LEVEL SECURITY;

-- Auth & Reports
ALTER TABLE IF EXISTS auth_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_summary_reports DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- GRANT PUBLIC ACCESS (for anon key to work)
-- =====================================================

-- Grant SELECT, INSERT, UPDATE, DELETE to anon role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Also grant to authenticated users (if you add auth later)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- VERIFY TABLE ACCESSIBILITY
-- =====================================================

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '🔒 RLS ENABLED' 
    ELSE '✅ RLS DISABLED' 
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'kpis', 'revenue', 'pipeline_stages', 'deals', 'tasks', 'activities', 'metrics',
    'taal_assets', 'dhol_pan', 'new_members', 'dhols', 'dhol_maintenance',
    'expenses', 'daily_reports', 'dori_inventory', 'main_inventory', 
    'dori_size_inventory', 'batches', 'students', 'attendance',
    'biometric_devices', 'attendance_logs', 'auth_activity_logs',
    'daily_summary_reports'
  )
ORDER BY tablename;

-- =====================================================
-- TEST API ACCESS
-- =====================================================

-- Test each critical table with a simple select
DO $$
DECLARE
  table_name text;
  query_text text;
BEGIN
  FOR table_name IN 
    SELECT unnest(ARRAY[
      'new_members', 'dhols', 'main_inventory', 
      'dori_size_inventory', 'daily_summary_reports'
    ])
  LOOP
    BEGIN
      query_text := format('SELECT COUNT(*) FROM %I', table_name);
      EXECUTE query_text;
      RAISE NOTICE '✅ % - API accessible', table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ % - ERROR: %', table_name, SQLERRM;
    END;
  END LOOP;
END $$;
