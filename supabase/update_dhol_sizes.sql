-- =====================================================
-- UPDATE DHOL SIZES AS PER REQUIREMENT
-- =====================================================
-- Dhol #1-10: 30 inches
-- Dhol #11-52: 28 inches
-- Dhol #53-54: 26 inches
-- =====================================================

-- First, check current dhol data
SELECT 
  dhol_number, 
  size, 
  maker_name,
  CASE 
    WHEN dhol_number <= 10 THEN '30" (Should be)'
    WHEN dhol_number >= 53 THEN '26" (Should be)'
    ELSE '28" (Should be)'
  END as correct_size
FROM dhols
ORDER BY dhol_number;

-- Update dhols #1-10 to 30 inches
UPDATE dhols 
SET size = 30
WHERE dhol_number >= 1 AND dhol_number <= 10;

-- Update dhols #11-52 to 28 inches
UPDATE dhols 
SET size = 28
WHERE dhol_number >= 11 AND dhol_number <= 52;

-- Update dhols #53-54 to 26 inches
UPDATE dhols 
SET size = 26
WHERE dhol_number >= 53 AND dhol_number <= 54;

-- Verify the updates
SELECT 
  'After Update' as status,
  dhol_number, 
  size as "Current Size",
  maker_name,
  notes
FROM dhols
ORDER BY dhol_number;

-- Summary by size
SELECT 
  size as "Dhol Size",
  COUNT(*) as "Count",
  MIN(dhol_number) as "First Dhol",
  MAX(dhol_number) as "Last Dhol"
FROM dhols
GROUP BY size
ORDER BY size DESC;

-- Expected result:
-- Size 30: Count = 10, Range = #1-#10
-- Size 28: Count = 42, Range = #11-#52
-- Size 26: Count = 2, Range = #53-#54
