"""Regenerate records.json from Grand_Canyon_Death_Register.xlsx (Records sheet only).
Run:  python3 build-records.py
The Review sheet (outside-park / uncertain-boundary / possible duplicates) is intentionally excluded."""
import json, re, openpyxl

SRC = "Grand_Canyon_Death_Register.xlsx"
MONTHS = ["January","February","March","April","May","June","July","August",
          "September","October","November","December"]
CAUSE_SHORT = {
    "Aircraft/automobile": "Aircraft / vehicle",
    "Fall (accident)": "Fall",
    "Intentional (murder / suicide)": "Intentional",
    "Cardiac (heat, exhaustion)": "Cardiac / heat",
    "Drowned": "Drowning",
    "Other medical": "Other medical",
    "Unknown": "Unknown",
    "Natural Disaster (flood)": "Flash flood",
    "Exposure": "Exposure",
    "Rockfall / falling object": "Rockfall",
    "Lightning": "Lightning",
}  # anything else -> "Other"
STATUS_SHORT = {
    "Historical source; needs independent verification": "Historical",
    "Anonymous NPS record; identity unresolved": "NPS record",
    "Park/news report; cause as reported": "Park / news",
}
BANDS = ["0-14","15-24","25-34","35-44","45-54","55-64","65+"]
PLACEHOLDER = re.compile(r"^name (withheld|not listed|not released)", re.I)

def band(age, rng):
    if isinstance(age, (int, float)):
        a = int(age)
        for b, hi in zip(BANDS, [14,24,34,44,54,64,999]):
            if a <= hi: return b
    if rng and "candidate" not in rng and rng.strip() in BANDS:
        return rng.strip()
    return None

# The historical source replaced apostrophes, quotes and accents with "?".
# Exact repairs only, so a real "?" (e.g. "Incident report #74-?") is left alone.
TEXT_FIXES = [
    ("?Jack?", "\u201cJack\u201d"),
    ("?Maverick?", "\u201cMaverick\u201d"),
    ("?Duck on the Rock,?", "\u201cDuck on the Rock,\u201d"),
    ("O?Neil?s", "O\u2019Neil\u2019s"),
    ("Bennet?s", "Bennet\u2019s"),
    ("O?Brien", "O\u2019Brien"),
    ("O?Keeffe", "O\u2019Keeffe"),
    ("Pe?a", "Pe\u00f1a"),
]

def clean(v):
    if v is None: return None
    v = str(v).strip()
    for bad, good in TEXT_FIXES:
        v = v.replace(bad, good)
    return v or None

wb = openpyxl.load_workbook(SRC, data_only=True)
rows = list(wb["Records"].iter_rows(values_only=True))
head = rows[0]
out = []
for i, r in enumerate(rows[1:], 1):
    x = dict(zip(head, r))
    if not x["Record ID"]: continue
    name = clean(x["Name"])
    cat = clean(x["Cause category"]) or "Unknown"
    sex = {"Male": "M", "Female": "F"}.get(x["Sex"], "U")
    out.append({
        "id": i,
        "recordId": x["Record ID"],
        "incidentId": clean(x["Incident ID"]) or x["Record ID"],
        "year": str(x["Year"]) if x["Year"] else "",
        "month": MONTHS[x["Month"] - 1] if x["Month"] else None,
        "day": x["Day"] or None,
        "name": None if (not name or PLACEHOLDER.match(name)) else name,
        "nameNote": name if (name and PLACEHOLDER.match(name)) else None,
        "ageExact": int(x["Age"]) if isinstance(x["Age"], (int, float)) else None,
        "ageRange": clean(x["Age range"]),
        "age": band(x["Age"], clean(x["Age range"])),
        "gender": sex,
        "cause": CAUSE_SHORT.get(cat, "Other"),
        "causeCategory": cat,
        "mechanism": clean(x["Reported cause / mechanism"]),
        "summary": clean(x["Summary of events"]),
        "location": clean(x["Location"]),
        "dateBasis": clean(x["Date basis"]),
        "status": STATUS_SHORT.get(x["Record status"], "Other"),
        "statusFull": clean(x["Record status"]),
        "scope": clean(x["Park scope"]),
        "sourceUrl": clean(x["Source URL"]),
        "sourceUrl2": clean(x["Additional source URL"]),
        "sourceRef": clean(x["Source reference"]),
        "notes": clean(x["Research notes"]),
    })
    out[-1]["decade"] = (out[-1]["year"][:3] + "0s") if out[-1]["year"] else ""

with open("records.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
print(len(out), "records written")
