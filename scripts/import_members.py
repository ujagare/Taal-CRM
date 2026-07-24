import openpyxl, json, sys

EXCEL_PATH = r"C:\Users\ujaga\OneDrive\Desktop\Dashboard\ताल वाद्यपथक, पुणे -  नवीन सदस्य नोंदणी  -  गणेशोत्सव   २०२६ (Responses).xlsx"

wb = openpyxl.load_workbook(EXCEL_PATH)
ws = wb["Form Responses 1"]

cols = [
    "timestamp", "full_name", "email", "gender", "whatsapp", "parent_contact",
    "dob", "address", "profession", "injury_info", "previous_pathak",
    "instruments_played", "experience", "flag_dancing", "other_instruments",
    "hobbies", "reference",
]

members = []
for row in ws.iter_rows(min_row=2, values_only=True):
    m = {}
    for i, c in enumerate(cols):
        v = row[i]
        val = str(v).strip() if v is not None else ""
        # Clean numeric fields (phone numbers)
        if c in ("whatsapp", "parent_contact"):
            if "." in val:
                val = val.rstrip("0").rstrip(".")
        # Clean date fields
        if c == "dob" and val and " " in val:
            val = val.split(" ")[0]
        if c == "timestamp" and val and " " in val:
            val = val.split(" ")[0]
        m[c] = val
    members.append(m)

# Generate SQL
sql_lines = []
for m in members:
    vals = []
    for c in cols:
        v = m[c]
        if v == "":
            vals.append("NULL")
        else:
            escaped = v.replace("'", "''")
            vals.append(f"'{escaped}'")
    sql_lines.append(
        f"  ({', '.join(vals)})"
    )

sql_header = f"""-- New Members data imported from Google Forms
-- Total: {len(members)} records

insert into new_members ({', '.join(cols)}) values
"""

full_sql = sql_header + ",\n".join(sql_lines) + "\non conflict (email) do nothing;\n"

with open("supabase/members_seed.sql", "w", encoding="utf-8") as f:
    f.write(full_sql)

print(f"Written {len(members)} member records to supabase/members_seed.sql")

# Also output a summary for verification
print(f"\nSample (first 3):")
for m in members[:3]:
    print(f"  - {m['full_name']} | {m['whatsapp']} | {m['experience']} | {m['instruments_played']}")
