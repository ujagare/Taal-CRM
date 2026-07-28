# 🥁 Dhol Sizes Update Instructions

## 🎯 Goal: Update Dhol Size Mapping

### **New Size Distribution:**

- **Dhol #1-10**: 30 inches (10 dhols)
- **Dhol #11-52**: 28 inches (42 dhols)
- **Dhol #53-54**: 26 inches (2 dhols)

### **Old Distribution (Incorrect):**

- ~~Dhol #1-25: 30 inches~~
- ~~Dhol #26-52: 28 inches~~
- ~~Dhol #53-54: 26 inches~~

---

## ✅ Changes Made

### 1. **Frontend Code Updated** ✅

`src/components/DholMaintenance.jsx`:

```javascript
// Size Rule: #1-#10 = 30", #11-#52 = 28", #53-#54 = 26"
function getDholSize(num) {
  if (num <= 10) return 30;
  if (num >= 53) return 26;
  return 28;
}
```

This ensures:

- Dhol cards show correct sizes
- New maintenance logs assign correct sizes
- PDF exports show correct sizes

---

## 🚀 Database Update Required

### **Option 1: Supabase SQL Editor (Recommended)** ⭐

1. **Open Supabase Dashboard:**

   ```
   https://supabase.com/dashboard/project/rnpsuwkkafxufuqucikz
   ```

2. **Go to SQL Editor** (left sidebar)

3. **Click "New Query"**

4. **Copy-paste this SQL:**

```sql
-- Update dhol sizes as per new requirement

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
  size as "Dhol Size",
  COUNT(*) as "Count",
  MIN(dhol_number) as "First Dhol #",
  MAX(dhol_number) as "Last Dhol #"
FROM dhols
GROUP BY size
ORDER BY size DESC;
```

5. **Click Run (F5)**

6. **Expected Result:**

```
Dhol Size | Count | First Dhol # | Last Dhol #
30        | 10    | 1            | 10
28        | 42    | 11           | 52
26        | 2     | 53           | 54
```

---

### **Option 2: Run Seed Script**

Terminal mein run karo:

```bash
node scripts/seed_dhols_correct_sizes.mjs
```

Ye script:

- ✅ Automatically 54 dhols create/update karega
- ✅ Correct sizes assign karega
- ✅ Verification bhi karega
- ✅ Summary report dikhayega

---

### **Option 3: Supabase Table Editor (Manual)**

1. Go to **Table Editor** → `dhols` table
2. Har dhol row edit karo:
   - Dhol #1-10: size = 30
   - Dhol #11-52: size = 28
   - Dhol #53-54: size = 26

_(Ye tedious hai, SQL script prefer karo)_

---

## 📊 Impact on Application

### **Dhol Maintenance Page:**

Cards ab correct order mein dikhenge:

```
🥁 Dhol Cards Layout:

[Dhol #1 - 30"]  [Dhol #2 - 30"]  [Dhol #3 - 30"]  ...  [Dhol #10 - 30"]
                         ↑
                  First 10 cards: 30"

[Dhol #11 - 28"] [Dhol #12 - 28"] [Dhol #13 - 28"] ... [Dhol #52 - 28"]
                         ↑
                  Cards 11-52: 28"

[Dhol #53 - 26"] [Dhol #54 - 26"]
                         ↑
                  Last 2 cards: 26"
```

### **Maintenance Logs:**

- New logs will automatically use correct sizes
- Old logs remain unchanged (historical data)
- Filters will work correctly

### **PDF Exports:**

- Reports will show correct dhol sizes
- Size-wise grouping will be accurate

### **Daily Reports:**

- Dhol status counts will reflect correct sizes
- Inventory tracking will be accurate

---

## 🔍 Verification Steps

### 1. **Verify Database:**

```sql
SELECT
  dhol_number,
  size,
  CASE
    WHEN dhol_number <= 10 THEN '30" ✅'
    WHEN dhol_number >= 53 THEN '26" ✅'
    ELSE '28" ✅'
  END as should_be
FROM dhols
ORDER BY dhol_number;
```

### 2. **Verify in Application:**

1. Open Dhol Maintenance page
2. Check cards:
   - First 10 cards show 30"
   - Cards 11-52 show 28"
   - Last 2 cards show 26"
3. Add a new maintenance log
4. Verify correct size is auto-selected

### 3. **Test Filters:**

- Filter by 30" → Should show Dhol #1-10
- Filter by 28" → Should show Dhol #11-52
- Filter by 26" → Should show Dhol #53-54

---

## 📱 Mobile View

Ab mobile mein bhi cards correct order aur sizes ke saath dikhenge:

- Responsive grid maintained
- Correct size badges
- Proper filtering

---

## 🎨 Visual Changes

### **Before:**

```
Dhol #1-25: Purple badge (30")
Dhol #26-52: Blue badge (28")
Dhol #53-54: Green badge (26")
```

### **After:**

```
Dhol #1-10: Purple badge (30")    ← Updated!
Dhol #11-52: Blue badge (28")     ← Updated!
Dhol #53-54: Green badge (26")    ✓ Same
```

---

## ⚠️ Important Notes

### **Historical Data:**

- Existing maintenance logs won't be affected
- Only new logs will use updated sizes
- If you want to update old logs, run separate SQL:

```sql
-- Optional: Update historical logs (use with caution)
UPDATE dhol_maintenance
SET dhol_size = '30"'
WHERE dhol_number >= 1 AND dhol_number <= 10;

UPDATE dhol_maintenance
SET dhol_size = '28"'
WHERE dhol_number >= 11 AND dhol_number <= 52;

UPDATE dhol_maintenance
SET dhol_size = '26"'
WHERE dhol_number >= 53 AND dhol_number <= 54;
```

### **Data Consistency:**

Ensure dhols table update karne ke baad:

1. Browser cache clear karo (Ctrl + Shift + R)
2. Check karo all pages properly load ho rahe hain
3. Test karo filters kaam kar rahe hain

---

## ✅ Success Checklist

After update:

- [ ] SQL script successfully run ho gayi
- [ ] Verification query mein correct counts dikhe
- [ ] Dhol Maintenance page reload kiya
- [ ] First 10 cards 30" show kar rahe hain
- [ ] Cards 11-52 28" show kar rahe hain
- [ ] Last 2 cards 26" show kar rahe hain
- [ ] New maintenance log add karke test kiya
- [ ] Filters properly kaam kar rahe hain
- [ ] PDF export test kiya (optional)

---

## 🎉 Final Result

**54 Dhols organized as:**

- 🟣 **10x 30"** dhols (Dhol #1-10)
- 🔵 **42x 28"** dhols (Dhol #11-52)
- 🟢 **2x 26"** dhols (Dhol #53-54)

**Total: 54 dhols perfectly organized by size! 🥁**

---

**Ab SQL run kar lo - 2 minute ka kaam hai! 😊**
