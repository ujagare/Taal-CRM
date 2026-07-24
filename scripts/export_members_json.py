import openpyxl, json

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
        if c in ("whatsapp", "parent_contact"):
            if "." in val:
                val = val.rstrip("0").rstrip(".")
        if c == "dob" and val and " " in val:
            val = val.split(" ")[0]
        if c == "timestamp" and val and " " in val:
            val = val.split(" ")[0]
        m[c] = val if val else None
    members.append(m)

with open("scripts/members_data.json", "w", encoding="utf-8") as f:
    json.dump(members, f, ensure_ascii=False, indent=2)

print(f"Exported {len(members)} members to scripts/members_data.json")
