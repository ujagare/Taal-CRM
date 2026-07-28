-- ============================================
-- Dhol Pan Table Setup
-- ============================================
-- This creates the dhol_pan table with proper constraints

-- Create table if not exists
CREATE TABLE IF NOT EXISTS dhol_pan (
  id BIGSERIAL PRIMARY KEY,
  pane_type TEXT NOT NULL CHECK (pane_type IN ('old', 'new')),
  size TEXT NOT NULL,
  thapi INTEGER DEFAULT 0,
  dhoom INTEGER DEFAULT 0,
  arrived_at TIMESTAMPTZ DEFAULT NOW(),
  brought_by TEXT,
  brought_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: each (pane_type, size) combination should be unique
  CONSTRAINT unique_pane_type_size UNIQUE (pane_type, size)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_dhol_pan_pane_type ON dhol_pan(pane_type);
CREATE INDEX IF NOT EXISTS idx_dhol_pan_size ON dhol_pan(size);

-- Enable Row Level Security (RLS) if needed
ALTER TABLE dhol_pan ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth requirements)
CREATE POLICY IF NOT EXISTS "Allow all operations on dhol_pan" 
ON dhol_pan 
FOR ALL 
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE dhol_pan IS 'Stores dhol pane inventory for old and new panes in different sizes (26", 28", 30")';
