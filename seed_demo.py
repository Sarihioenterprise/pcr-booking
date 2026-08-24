#!/usr/bin/env python3
"""
Seed demo operator account for PCR Booking sales demos.
Target: Sterling Fleet Rentals, ~$47k/mo revenue, 34 vehicles, 72% utilization, 90-day history
"""

import json
import urllib.request
import urllib.parse
import uuid
import random
import math
from datetime import date, datetime, timedelta

SUPABASE_URL = "https://ulxweelmckbtsxyvsvkq.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseHdlZWxtY2tidHN4eXZzdmtxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1MjM4OSwiZXhwIjoyMDkwNTI4Mzg5fQ.2WeyX5E5bXe7Eq26N0KHaL8Kr204VSzlpSlKBNloohI"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseHdlZWxtY2tidHN4eXZzdmtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTIzODksImV4cCI6MjA5MDUyODM4OX0.BglkMY0Q8tOQ1H8BKHw8g7ff87nnwDZ7-tCZwX7ZcvE"

TODAY = date(2026, 8, 22)
WINDOW_START = TODAY - timedelta(days=90)  # 2026-05-24
DEMO_EMAIL = "demo@pcrbooking.com"
DEMO_PASSWORD = "PcrDemo2026!"

random.seed(42)

def http_request(method, url, data=None, headers=None):
    """Make an HTTP request and return (status, body_dict)."""
    if headers is None:
        headers = {}
    body = None
    if data is not None:
        body = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode('utf-8')
            return resp.status, json.loads(raw) if raw.strip() else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode('utf-8')
        return e.code, json.loads(raw) if raw.strip() else {}

def service_headers():
    return {
        "Authorization": f"Bearer {SERVICE_KEY}",
        "apikey": SERVICE_KEY,
    }

def rest_post(table, data):
    """Insert a single row, return the created row."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = service_headers()
    headers["Prefer"] = "return=representation"
    status, body = http_request("POST", url, data, headers)
    if status not in (200, 201):
        raise Exception(f"REST POST {table} failed {status}: {body}")
    return body

def rest_post_batch(table, rows):
    """Insert many rows with minimal return."""
    if not rows:
        return
    # Normalize all rows to have the same keys
    all_keys = set()
    for r in rows:
        all_keys |= set(r.keys())
    normalized = [{k: r.get(k, None) for k in all_keys} for r in rows]
    
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = service_headers()
    headers["Prefer"] = "return=minimal"
    status, body = http_request("POST", url, normalized, headers)
    if status not in (200, 201):
        raise Exception(f"REST POST batch {table} failed {status}: {body}")

def rest_get(table, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    headers = service_headers()
    headers["Prefer"] = "return=representation"
    status, body = http_request("GET", url, headers=headers)
    if status != 200:
        raise Exception(f"REST GET {table} failed {status}: {body}")
    return body

print("=" * 60)
print("PCR Booking Demo Account Seeder")
print("=" * 60)

# ─────────────────────────────────────────────────────────────
# STEP 1: Clean up any existing demo account
# ─────────────────────────────────────────────────────────────
print("\n[1] Checking for existing demo user...")
status, existing = http_request(
    "GET",
    f"{SUPABASE_URL}/auth/v1/admin/users?email={DEMO_EMAIL}",
    headers=service_headers()
)
if status == 200 and existing.get("users"):
    for u in existing["users"]:
        if u.get("email") == DEMO_EMAIL:
            existing_user_id = u["id"]
            print(f"  Found existing user: {existing_user_id} — deleting...")
            del_status, del_body = http_request(
                "DELETE",
                f"{SUPABASE_URL}/auth/v1/admin/users/{existing_user_id}",
                headers=service_headers()
            )
            print(f"  Delete status: {del_status}")
            break

# ─────────────────────────────────────────────────────────────
# STEP 2: Create auth user
# ─────────────────────────────────────────────────────────────
print("\n[2] Creating auth user...")
status, user_resp = http_request(
    "POST",
    f"{SUPABASE_URL}/auth/v1/admin/users",
    data={
        "email": DEMO_EMAIL,
        "password": DEMO_PASSWORD,
        "email_confirm": True,
        "user_metadata": {"full_name": "Marcus Sterling"}
    },
    headers=service_headers()
)
if status not in (200, 201):
    raise Exception(f"Create user failed {status}: {user_resp}")
USER_ID = user_resp["id"]
print(f"  Created user: {USER_ID}")

# ─────────────────────────────────────────────────────────────
# STEP 3: Create operator profile
# ─────────────────────────────────────────────────────────────
print("\n[3] Creating operator profile...")
operator_data = {
    "user_id": USER_ID,
    "business_name": "Sterling Fleet Rentals",
    "owner_name": "Marcus Sterling",
    "phone": "+1 (404) 555-0187",
    "city": "Atlanta",
    "state": "GA",
    "plan": "scale",
    "stripe_subscription_id": "owner_bypass",
    "stripe_customer_id": "cus_demo_sterling_2026",
    "widget_enabled": True,
    "brand_color": "#2EBD6B",
    "business_address": "2847 Peachtree Rd NE, Atlanta, GA 30305",
    "business_email": DEMO_EMAIL,
    "timezone": "America/New_York",
    "tax_rate": 8.90,
    "deposit_amount": 500.00,
    "deposit_auto_release_days": 3,
    "require_booking_approval": False,
    "booking_slug": "demo",
    "default_pickup_instructions": "Keys will be in the lockbox at the front office. Code sent via SMS 1 hour before pickup. Bring your license and proof of insurance.",
    "notification_preferences": json.dumps({
        "new_booking": True,
        "payment_received": True,
        "booking_cancelled": True,
        "maintenance_due": True
    }),
    "late_fee_enabled": True,
    "late_fee_per_day": 75.00,
    "included_miles_per_day": 150,
    "overage_rate_per_mile": 0.25,
}
op_result = rest_post("operators", operator_data)
OPERATOR_ID = op_result[0]["id"]
print(f"  Created operator: {OPERATOR_ID}")

# ─────────────────────────────────────────────────────────────
# STEP 4: Create locations
# ─────────────────────────────────────────────────────────────
print("\n[4] Creating locations...")
loc_result = rest_post("locations", {
    "operator_id": OPERATOR_ID,
    "name": "Peachtree Main Office",
    "address": "2847 Peachtree Rd NE",
    "city": "Atlanta",
    "state": "GA",
    "zip": "30305",
    "phone": "+1 (404) 555-0187",
    "is_default": True
})
LOCATION_ID = loc_result[0]["id"]
loc2_result = rest_post("locations", {
    "operator_id": OPERATOR_ID,
    "name": "Hartsfield-Jackson Airport Pickup",
    "address": "6000 N Terminal Pkwy",
    "city": "Atlanta",
    "state": "GA",
    "zip": "30320",
    "phone": "+1 (404) 555-0199",
    "is_default": False
})
LOC2_ID = loc2_result[0]["id"]
print(f"  Created 2 locations")

# ─────────────────────────────────────────────────────────────
# STEP 5: Create 34 vehicles
# ─────────────────────────────────────────────────────────────
print("\n[5] Creating 34 vehicles...")

fleet_specs = [
    # (make, model, year, color, category, daily_rate, vin_suffix, plate)
    # Economy sedans — 14 cars @ $44-58/day
    ("Toyota",       "Camry",        2023, "White",   "sedan",   55.00, "4T1B11HK8JU600001", "GTA 4821"),
    ("Toyota",       "Camry",        2022, "Silver",  "sedan",   52.00, "4T1B11HK8JU600002", "GTA 3917"),
    ("Toyota",       "Camry",        2023, "Black",   "sedan",   55.00, "4T1B11HK8JU600003", "GTA 5534"),
    ("Nissan",       "Altima",       2023, "White",   "sedan",   50.00, "1N4BL4BV1NN300001", "GNS 2287"),
    ("Nissan",       "Altima",       2022, "Gray",    "sedan",   48.00, "1N4BL4BV1NN300002", "GNS 1943"),
    ("Nissan",       "Altima",       2023, "Silver",  "sedan",   50.00, "1N4BL4BV1NN300003", "GNS 3312"),
    ("Chevrolet",    "Malibu",       2022, "White",   "sedan",   47.00, "1G1ZD5ST4NF100001", "GCH 7741"),
    ("Chevrolet",    "Malibu",       2022, "Black",   "sedan",   47.00, "1G1ZD5ST4NF100002", "GCH 8823"),
    ("Hyundai",      "Elantra",      2023, "Blue",    "sedan",   45.00, "5NPDH4AE1GH100001", "GHY 4490"),
    ("Hyundai",      "Elantra",      2023, "White",   "sedan",   45.00, "5NPDH4AE1GH100002", "GHY 5572"),
    ("Kia",          "Forte",        2023, "Gray",    "sedan",   46.00, "3KPF24AD1PE100001", "GKI 2219"),
    ("Kia",          "Forte",        2022, "White",   "sedan",   44.00, "3KPF24AD1PE100002", "GKI 3381"),
    ("Honda",        "Accord",       2023, "Silver",  "sedan",   58.00, "1HGCV1F30NA100001", "GHO 6643"),
    ("Honda",        "Accord",       2022, "Black",   "sedan",   56.00, "1HGCV1F30NA100002", "GHO 7821"),
    # Mid-size SUVs — 12 cars @ $63-72/day
    ("Toyota",       "RAV4",         2023, "Silver",  "suv",     72.00, "2T3BFREV3JW100001", "GTR 3312"),
    ("Toyota",       "RAV4",         2023, "White",   "suv",     72.00, "2T3BFREV3JW100002", "GTR 4490"),
    ("Toyota",       "RAV4",         2022, "Gray",    "suv",     68.00, "2T3BFREV3JW100003", "GTR 5521"),
    ("Honda",        "CR-V",         2023, "White",   "suv",     70.00, "5J6RW2H84NA100001", "GHC 1187"),
    ("Honda",        "CR-V",         2022, "Silver",  "suv",     67.00, "5J6RW2H84NA100002", "GHC 2293"),
    ("Nissan",       "Rogue",        2023, "Black",   "suv",     69.00, "JN8AT2MV3NW100001", "GNR 8821"),
    ("Nissan",       "Rogue",        2022, "White",   "suv",     66.00, "JN8AT2MV3NW100002", "GNR 9901"),
    ("Hyundai",      "Tucson",       2023, "Blue",    "suv",     67.00, "5NMJF3AE1NH100001", "GHT 4432"),
    ("Hyundai",      "Tucson",       2022, "Gray",    "suv",     64.00, "5NMJF3AE1NH100002", "GHT 5589"),
    ("Kia",          "Sportage",     2023, "White",   "suv",     68.00, "KNDPM3AC4N7100001", "GKS 3321"),
    ("Ford",         "Escape",       2023, "Red",     "suv",     65.00, "1FMCU0F72NUB00001", "GFE 2287"),
    ("Chevrolet",    "Equinox",      2022, "Silver",  "suv",     63.00, "2GNAXJEV3N6100001", "GCE 6643"),
    # Full-size SUVs / Minivans — 5 cars @ $78-89/day
    ("Toyota",       "Highlander",   2023, "Black",   "suv",     89.00, "5TDJZRFH1NS100001", "GTH 1121"),
    ("Ford",         "Explorer",     2023, "White",   "suv",     87.00, "1FM5K7D80NGA00001", "GFX 7743"),
    ("Chevrolet",    "Traverse",     2023, "Gray",    "suv",     85.00, "1GNEVHKW9NJ100001", "GCT 4412"),
    ("Chrysler",     "Pacifica",     2022, "Silver",  "minivan", 78.00, "2C4RC1BG4NR100001", "GCP 3398"),
    ("Honda",        "Odyssey",      2023, "White",   "minivan", 82.00, "5FNRL6H78NB100001", "GHO 9982"),
    # Premium units — 3 cars @ $92-98/day (in maintenance)
    ("BMW",          "5 Series",     2022, "Black",   "sedan",   95.00, "WBA13BJ03NCH00001", "GBW 8812"),
    ("Mercedes-Benz","E-Class",      2023, "Silver",  "sedan",   98.00, "WDB2130341A100001", "GMB 3371"),
    ("Lexus",        "ES 350",       2023, "Black",   "sedan",   92.00, "58ABK1GG1NU100001", "GLX 6654"),
]

vehicle_rows = []
vehicle_ids = []
for i, (make, model, year, color, cat, rate, vin, plate) in enumerate(fleet_specs):
    # Last 2 are in maintenance
    status_v = "maintenance" if i >= 32 else "active"
    vid = str(uuid.uuid4())
    vehicle_ids.append(vid)
    mileage = random.randint(8000, 62000)
    vehicle_rows.append({
        "id": vid,
        "operator_id": OPERATOR_ID,
        "make": make,
        "model": model,
        "year": year,
        "color": color,
        "plate": plate,
        "vin": vin,
        "daily_rate": rate,
        "weekly_rate": round(rate * 6.5, 2),
        "monthly_rate": round(rate * 26, 2),
        "status": status_v,
        "category": cat,
        "mileage": mileage,
        "fuel_level": random.choice(["full", "full", "full", "3/4"]),
        "minimum_rental_days": 1,
        "location_id": LOCATION_ID,
    })

rest_post_batch("vehicles", vehicle_rows)
print(f"  Created {len(vehicle_rows)} vehicles (32 active, 2 in maintenance)")

# ─────────────────────────────────────────────────────────────
# STEP 6: Create renters
# ─────────────────────────────────────────────────────────────
print("\n[6] Creating renters...")

renter_profiles = [
    ("Jerome Washington",  "jwashington@gmail.com",     "+14045550192", "Atlanta",      "GA", 38),
    ("Latasha Moore",      "latasha.moore@yahoo.com",   "+14045550284", "Marietta",     "GA", 32),
    ("Darius Johnson",     "darius.j@gmail.com",        "+14045550371", "Decatur",      "GA", 29),
    ("Keisha Williams",    "kwilliams84@hotmail.com",   "+14045550463", "Atlanta",      "GA", 42),
    ("Marcus Reed",        "m.reed.atl@gmail.com",      "+14045550517", "Smyrna",       "GA", 35),
    ("Tamika Harris",      "tamika.harris@gmail.com",   "+14045550629", "Lithonia",     "GA", 31),
    ("DeShawn Brooks",     "dshawn.brooks@gmail.com",   "+14045550748", "Stone Mountain","GA", 27),
    ("Alicia Thompson",    "alicia.t@outlook.com",      "+14045550891", "Kennesaw",     "GA", 44),
    ("Tyrone Jackson",     "tyrone.j77@gmail.com",      "+14045550934", "College Park", "GA", 49),
    ("Brianna Davis",      "b.davis.rent@gmail.com",    "+14045551028", "East Point",   "GA", 26),
    ("Cedric Foster",      "cedric.foster@gmail.com",   "+14045551147", "Norcross",     "GA", 33),
    ("Monique Simmons",    "msimmons.rent@gmail.com",   "+14045551263", "Tucker",       "GA", 37),
    ("Andre Wilson",       "andre.w2019@gmail.com",     "+14045551389", "Atlanta",      "GA", 41),
    ("Shanice Brown",      "shanice.b@gmail.com",       "+14045551412", "Austell",      "GA", 28),
    ("Reginald Carter",    "reg.carter@yahoo.com",      "+14045551538", "Jonesboro",    "GA", 52),
    ("Yolanda Mitchell",   "y.mitchell.atl@gmail.com",  "+14045551674", "Riverdale",    "GA", 36),
    ("Terrence Price",     "t.price.fleet@gmail.com",   "+14045551729", "Morrow",       "GA", 30),
    ("Dominique Evans",    "dom.evans@gmail.com",       "+14045551845", "Conyers",      "GA", 24),
    ("Phyllis Turner",     "phyllis.turner@gmail.com",  "+14045551962", "McDonough",    "GA", 47),
    ("Bernard King",       "b.king.atl@gmail.com",      "+14045552081", "Stockbridge",  "GA", 39),
    ("Vanessa Cooper",     "vcooper.rent@gmail.com",    "+14045552197", "Lawrenceville","GA", 33),
    ("Antoine Perry",      "a.perry2025@gmail.com",     "+14045552314", "Atlanta",      "GA", 28),
    ("Cassandra Hughes",   "c.hughes.atl@outlook.com",  "+14045552428", "Alpharetta",   "GA", 45),
    ("Darrell Sanders",    "darrell.snd@gmail.com",     "+14045552539", "Powder Springs","GA", 31),
    ("Nicole Richardson",  "nrichardson@gmail.com",     "+14045552647", "Roswell",      "GA", 38),
]

renter_ids = []
renter_rows = []
for name, email, phone, city, state, age in renter_profiles:
    rid = str(uuid.uuid4())
    renter_ids.append(rid)
    dob = (TODAY - timedelta(days=age*365 + random.randint(0, 364))).isoformat()
    license_num = f"GA{random.randint(100000000, 999999999)}"
    license_exp = (TODAY + timedelta(days=random.randint(180, 1800))).isoformat()
    renter_rows.append({
        "id": rid,
        "operator_id": OPERATOR_ID,
        "name": name,
        "email": email,
        "phone": phone,
        "city": city,
        "state": state,
        "date_of_birth": dob,
        "drivers_license_number": license_num,
        "drivers_license_expiry": license_exp,
        "is_blacklisted": False,
        "stripe_customer_id": f"cus_demo_{rid[:8]}",
        "notes": random.choice([
            "Rideshare driver — needs long-term rates",
            "Good standing — multiple rentals on file",
            "Returns on time, no issues",
            None, None, None
        ]),
    })

rest_post_batch("renters", renter_rows)
print(f"  Created {len(renter_rows)} renters")

# ─────────────────────────────────────────────────────────────
# STEP 7: Generate bookings
#
# Strategy:
#   Phase A – Historical (90-day window): Pack each of 32 active vehicles
#             to ~72% utilization with COMPLETED + ACTIVE bookings only.
#   Phase B – Upcoming:  Add ~25 realistic confirmed/pending bookings
#             that start within the next 30 days.
# ─────────────────────────────────────────────────────────────
print("\n[7] Generating bookings...")

active_vids = vehicle_ids[:32]
active_rates = [v["daily_rate"] for v in vehicle_rows[:32]]

# occupied[v_idx] = set of date objects in use
occupied = {i: set() for i in range(32)}

def days_free(v_idx, start: date, end: date):
    """Return True if vehicle v_idx has no booking overlapping [start, end)."""
    cur = start
    while cur < end:
        if cur in occupied[v_idx]:
            return False
        cur += timedelta(days=1)
    return True

def mark_occupied(v_idx, start: date, end: date):
    cur = start
    while cur < end:
        occupied[v_idx].add(cur)
        cur += timedelta(days=1)

def make_booking(v_idx, start: date, dur: int, status: str) -> dict:
    end = start + timedelta(days=dur)
    rate = active_rates[v_idx]
    rate_variation = random.uniform(0.92, 1.04)
    eff_rate = round(rate * rate_variation, 2)
    total = round(eff_rate * dur, 2)
    renter = random.choice(renter_rows)
    booking_id = str(uuid.uuid4())
    
    mileage_out = random.randint(8000, 55000) if status in ("completed", "active") else None
    mileage_in = (mileage_out + random.randint(200, 3500)) if (status == "completed" and mileage_out) else None
    
    return {
        "id": booking_id,
        "operator_id": OPERATOR_ID,
        "vehicle_id": active_vids[v_idx],
        "renter_name": renter["name"],
        "renter_email": renter["email"],
        "renter_phone": renter["phone"],
        "renter_id": renter["id"],
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "duration_days": dur,
        "daily_rate": eff_rate,
        "total_price": total,
        "status": status,
        "deposit_amount": 500.00,
        "deposit_status": "released" if status == "completed" else ("held" if status in ("active", "confirmed") else "none"),
        "location_id": LOCATION_ID,
        "pickup_time": random.choice(["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00"]),
        "return_time": random.choice(["09:00", "10:00", "11:00", "12:00", "13:00", "14:00"]),
        "mileage_out": mileage_out,
        "mileage_in": mileage_in,
        "fuel_out": "full",
        "fuel_in": random.choice(["full", "3/4", "1/2"]) if status == "completed" else None,
        "reminder_sent_pickup": status in ("completed", "active"),
        "reminder_sent_return": status == "completed",
        "stripe_payment_intent_id": f"pi_demo_{booking_id[:12]}" if status in ("completed", "active", "confirmed") else None,
        "notes": None,
        "tax_amount": 0,
        "discount_amount": 0,
        "addons": [],
        "addons_total": 0,
    }

booking_rows = []

# ── Phase A: Historical bookings (completed + active) ──────────
# For each vehicle, greedily place bookings across the 90-day window
# Duration choices: rideshare operators typically rent 7-35 days
dur_weights = [7]*4 + [10]*2 + [14]*5 + [21]*3 + [28]*4 + [35]*2 + [3]*1 + [5]*1

for v_idx in range(32):
    target_utilization = random.uniform(0.68, 0.78)  # vary per vehicle
    target_days = int(90 * target_utilization)
    placed = 0
    attempts = 0
    
    while placed < target_days - 5 and attempts < 500:
        attempts += 1
        dur = random.choice(dur_weights)
        
        # Pick a random start within the 90-day window
        # Leave a gap for placement: start within day 0 to (90-dur)
        max_start_offset = max(0, 90 - dur)
        start_offset = random.randint(0, max_start_offset)
        start = WINDOW_START + timedelta(days=start_offset)
        end = start + timedelta(days=dur)
        
        # Clamp end to TODAY for historical (allow active to span TODAY)
        # But we want COMPLETED or ACTIVE — end must be <= TODAY + a few days
        if end > TODAY + timedelta(days=5):
            end = TODAY + timedelta(days=3)
            dur = (end - start).days
            if dur < 3:
                continue
        
        if not days_free(v_idx, start, end):
            continue
        
        # Determine status
        if end <= TODAY:
            status = "completed"
        else:
            status = "active"
        
        mark_occupied(v_idx, start, end)
        placed += min((end - start).days, (TODAY - start).days + 1)
        booking_rows.append(make_booking(v_idx, start, dur, status))

print(f"  Phase A complete: {len(booking_rows)} historical bookings")
hist_completed = sum(1 for b in booking_rows if b["status"] == "completed")
hist_active = sum(1 for b in booking_rows if b["status"] == "active")
print(f"    Completed: {hist_completed}, Active: {hist_active}")

# ── Phase B: Upcoming bookings (~25 confirmed/pending) ──────────
upcoming_count = 0
attempts = 0
while upcoming_count < 28 and attempts < 300:
    attempts += 1
    v_idx = random.randint(0, 31)
    dur = random.choice([7, 7, 14, 14, 28, 28, 21, 10])
    days_out = random.randint(1, 35)
    start = TODAY + timedelta(days=days_out)
    end = start + timedelta(days=dur)
    
    if not days_free(v_idx, start, end):
        continue
    
    mark_occupied(v_idx, start, end)
    
    if days_out <= 14:
        status = random.choice(["confirmed", "confirmed", "active"])
    elif days_out <= 25:
        status = random.choice(["confirmed", "confirmed", "pending"])
    else:
        status = random.choice(["confirmed", "pending"])
    
    booking_rows.append(make_booking(v_idx, start, dur, status))
    upcoming_count += 1

print(f"  Phase B complete: {upcoming_count} upcoming bookings added")
print(f"  Total bookings: {len(booking_rows)}")

# Compute pre-insert stats
total_rev = sum(b["total_price"] for b in booking_rows if b["status"] in ("completed", "active"))
monthly_est = total_rev / 3
total_occ_days = sum(len(d) for d in occupied.values())
util_pct = total_occ_days / (32 * 90) * 100
cnt_comp = sum(1 for b in booking_rows if b["status"] == "completed")
cnt_act = sum(1 for b in booking_rows if b["status"] == "active")
cnt_conf = sum(1 for b in booking_rows if b["status"] == "confirmed")
cnt_pend = sum(1 for b in booking_rows if b["status"] == "pending")
print(f"  Pre-insert stats:")
print(f"    Revenue (90-day): ${total_rev:,.2f}  Est monthly: ${monthly_est:,.2f}")
print(f"    Utilization: {util_pct:.1f}%  ({total_occ_days}/{32*90} vehicle-days)")
print(f"    Completed: {cnt_comp}, Active: {cnt_act}, Confirmed: {cnt_conf}, Pending: {cnt_pend}")

# Insert in batches of 50
for i in range(0, len(booking_rows), 50):
    rest_post_batch("bookings", booking_rows[i:i+50])
print(f"  Inserted {len(booking_rows)} bookings ✓")

# ─────────────────────────────────────────────────────────────
# STEP 8: Payment schedules (weekly, for active/confirmed/pending)
# ─────────────────────────────────────────────────────────────
print("\n[8] Creating payment schedules...")
payment_rows = []
for b in booking_rows:
    if b["status"] not in ("active", "confirmed", "pending"):
        continue
    start = date.fromisoformat(b["start_date"])
    end = date.fromisoformat(b["end_date"])
    cur = start
    while cur < end:
        week_end = min(cur + timedelta(days=7), end)
        days = (week_end - cur).days
        amt = round(b["daily_rate"] * days, 2)
        due = cur
        pstatus = "paid" if due < TODAY else "pending"
        payment_rows.append({
            "booking_id": b["id"],
            "operator_id": OPERATOR_ID,
            "amount": amt,
            "due_date": due.isoformat(),
            "status": pstatus,
            "paid_at": (due + timedelta(days=random.randint(0, 1))).isoformat() + "T00:00:00+00:00" if pstatus == "paid" else None,
        })
        cur = week_end

for i in range(0, len(payment_rows), 50):
    rest_post_batch("payment_schedule", payment_rows[i:i+50])
print(f"  Created {len(payment_rows)} payment schedule items")

# ─────────────────────────────────────────────────────────────
# STEP 9: Leads
# ─────────────────────────────────────────────────────────────
print("\n[9] Creating leads...")
lead_data = [
    ("Malik Thompson",   "+14045553201", "malik.t@gmail.com",       "hot_lead",    "widget",  "Sep 1–Oct 1, 2026",    30, 45.0),
    ("Jasmine Carter",   "+14045553318", "jasmine.c@yahoo.com",     "bot_called",  "widget",  "Sep 5–Oct 5, 2026",    30, 52.0),
    ("Devon King",       "+14045553427", "d.king.atl@gmail.com",    "new",         "referral","TBD",                   7,  None),
    ("Shaniqua Bates",   "+14045553546", "s.bates@gmail.com",       "hot_lead",    "pcrleads","Sep 10–Oct 10",         30, 65.0),
    ("Raymond Foster",   "+14045553672", "r.foster@outlook.com",    "disqualified","widget",  "ASAP",                 14,  None),
    ("Latoya Green",     "+14045553789", "latoya.g@gmail.com",      "bot_called",  "pcrleads","Aug 27–Sep 27",         30, 55.0),
    ("Marcus Bell",      "+14045553891", "m.bell.fleet@gmail.com",  "new",         "referral","Sep 5–30",              25, 50.0),
    ("Priya Patel",      "+14045554012", "priya.p@gmail.com",       "hot_lead",    "widget",  "Sep 15–Oct 15",         30, 70.0),
]

lead_rows = []
for name, phone, email, stage, source, dates, dur, est_val in lead_data:
    lead_rows.append({
        "operator_id": OPERATOR_ID,
        "name": name,
        "phone": phone,
        "email": email,
        "stage": stage,
        "source": source,
        "dates_requested": dates,
        "duration_days": dur,
        "estimated_value": est_val,
        "uber_lyft_approved": True if stage in ("hot_lead", "bot_called") else random.choice([True, False]),
        "valid_license": True,
        "age_25_plus": True,
        "followup_count": {"new": 0, "bot_called": 1, "hot_lead": 2, "disqualified": 1}[stage],
        "followup_status": {"new": "none", "bot_called": "1st_contact", "hot_lead": "2nd_followup", "disqualified": "lost"}[stage],
        "disqualify_reason": "No active rideshare account on record" if stage == "disqualified" else None,
        "city": "Atlanta",
        "notes": "Uber/Lyft driver, looking for immediate availability" if stage == "hot_lead" else None,
    })

rest_post_batch("leads", lead_rows)
print(f"  Created {len(lead_rows)} leads")

# ─────────────────────────────────────────────────────────────
# STEP 10: Maintenance records
# ─────────────────────────────────────────────────────────────
print("\n[10] Creating maintenance records...")

maint_rows = []

# Completed oil changes for all 32 active vehicles
for i in range(32):
    vid = vehicle_ids[i]
    past_date = (TODAY - timedelta(days=random.randint(20, 85))).isoformat()
    next_due = (TODAY + timedelta(days=random.randint(45, 180))).isoformat()
    maint_rows.append({
        "operator_id": OPERATOR_ID,
        "vehicle_id": vid,
        "type": "Oil Change",
        "description": "Full synthetic oil change, filter replacement",
        "status": "completed",
        "cost": round(random.uniform(65, 95), 2),
        "mileage_at_service": vehicle_rows[i]["mileage"] - random.randint(3000, 6000),
        "date_performed": past_date,
        "date_due": next_due,
        "mileage_due": vehicle_rows[i]["mileage"] + random.randint(3500, 6000),
        "vendor": random.choice(["Jiffy Lube", "Valvoline Instant Oil Change", "Firestone", "Pep Boys"]),
        "notes": None,
    })

# Tire rotations for half the fleet
for i in random.sample(range(32), 16):
    maint_rows.append({
        "operator_id": OPERATOR_ID,
        "vehicle_id": vehicle_ids[i],
        "type": "Tire Rotation",
        "description": "4-wheel tire rotation and balance",
        "status": "completed",
        "cost": round(random.uniform(45, 75), 2),
        "mileage_at_service": vehicle_rows[i]["mileage"] - random.randint(1000, 3000),
        "date_performed": (TODAY - timedelta(days=random.randint(15, 70))).isoformat(),
        "date_due": (TODAY + timedelta(days=random.randint(90, 180))).isoformat(),
        "mileage_due": vehicle_rows[i]["mileage"] + random.randint(4000, 7000),
        "vendor": random.choice(["Discount Tire", "Firestone", "Pep Boys", "Walmart Auto"]),
        "notes": None,
    })

# Vehicles in maintenance (idx 32 = BMW, idx 33 = Mercedes)
maint_rows.append({
    "operator_id": OPERATOR_ID,
    "vehicle_id": vehicle_ids[32],
    "type": "Brake Replacement",
    "description": "Front and rear brake pads + rotor inspection. Vehicle pulled from service.",
    "status": "in_progress",
    "cost": 520.00,
    "mileage_at_service": vehicle_rows[32]["mileage"],
    "date_performed": TODAY.isoformat(),
    "date_due": (TODAY + timedelta(days=1)).isoformat(),
    "mileage_due": None,
    "vendor": "Sterling Fleet Service Bay",
    "notes": "Expected return to service 2026-08-23",
})
maint_rows.append({
    "operator_id": OPERATOR_ID,
    "vehicle_id": vehicle_ids[33],
    "type": "Transmission Service",
    "description": "Transmission fluid flush, filter replacement, software update.",
    "status": "in_progress",
    "cost": 385.00,
    "mileage_at_service": vehicle_rows[33]["mileage"],
    "date_performed": (TODAY - timedelta(days=2)).isoformat(),
    "date_due": (TODAY + timedelta(days=2)).isoformat(),
    "mileage_due": None,
    "vendor": "Atlanta Transmission Specialists",
    "notes": "Estimated completion 2026-08-24",
})

# Upcoming scheduled maintenance for 5 active vehicles
maint_types = ["Air Filter Replacement", "Cabin Filter", "Wiper Blades", "Coolant Flush", "Brake Inspection"]
for j, i in enumerate(random.sample(range(32), 5)):
    maint_rows.append({
        "operator_id": OPERATOR_ID,
        "vehicle_id": vehicle_ids[i],
        "type": maint_types[j],
        "description": f"Scheduled {maint_types[j].lower()} per manufacturer guidelines",
        "status": "scheduled",
        "cost": round(random.uniform(35, 165), 2),
        "mileage_at_service": None,
        "date_performed": None,
        "date_due": (TODAY + timedelta(days=random.randint(7, 45))).isoformat(),
        "mileage_due": vehicle_rows[i]["mileage"] + random.randint(500, 2500),
        "vendor": random.choice(["Jiffy Lube", "Firestone", "Toyota Dealership Service", "AutoNation"]),
        "notes": None,
    })

rest_post_batch("maintenance_records", maint_rows)
print(f"  Created {len(maint_rows)} maintenance records")

# ─────────────────────────────────────────────────────────────
# STEP 11: Team members
# ─────────────────────────────────────────────────────────────
print("\n[11] Creating team members...")
team_rows = [
    {
        "operator_id": OPERATOR_ID,
        "user_id": USER_ID,
        "name": "Marcus Sterling",
        "email": "demo@pcrbooking.com",
        "role": "owner",
        "is_active": True,
        "accepted_at": (TODAY - timedelta(days=365)).isoformat() + "T00:00:00+00:00",
    },
    {
        "operator_id": OPERATOR_ID,
        "user_id": None,
        "name": "Jasmine Rhodes",
        "email": "jrhodes@sterlingfleet.com",
        "role": "manager",
        "is_active": True,
        "accepted_at": (TODAY - timedelta(days=120)).isoformat() + "T00:00:00+00:00",
    },
    {
        "operator_id": OPERATOR_ID,
        "user_id": None,
        "name": "Calvin Okonkwo",
        "email": "cokonkwo@sterlingfleet.com",
        "role": "staff",
        "is_active": True,
        "accepted_at": (TODAY - timedelta(days=60)).isoformat() + "T00:00:00+00:00",
    },
    {
        "operator_id": OPERATOR_ID,
        "user_id": None,
        "name": "Destiny Park",
        "email": "dpark@sterlingfleet.com",
        "role": "staff",
        "is_active": True,
        "accepted_at": (TODAY - timedelta(days=30)).isoformat() + "T00:00:00+00:00",
    },
]
rest_post_batch("team_members", team_rows)
print(f"  Created {len(team_rows)} team members")

# ─────────────────────────────────────────────────────────────
# STEP 12: Notifications
# ─────────────────────────────────────────────────────────────
print("\n[12] Creating notifications...")
notif_rows = [
    {
        "operator_id": OPERATOR_ID,
        "type": "new_booking",
        "title": "New Booking — Jerome Washington",
        "message": "Jerome Washington booked a 2023 Toyota RAV4 for 28 days starting Aug 24.",
        "is_read": False,
        "created_at": (datetime.now() - timedelta(hours=2)).isoformat() + "+00:00",
    },
    {
        "operator_id": OPERATOR_ID,
        "type": "payment_received",
        "title": "Payment Received — $1,512.00",
        "message": "Weekly rental payment from Latasha Moore received successfully.",
        "is_read": False,
        "created_at": (datetime.now() - timedelta(hours=5)).isoformat() + "+00:00",
    },
    {
        "operator_id": OPERATOR_ID,
        "type": "maintenance_due",
        "title": "Maintenance In Progress — 2022 BMW 5 Series",
        "message": "Brake replacement service is underway. Vehicle unavailable for rental today.",
        "is_read": False,
        "created_at": (datetime.now() - timedelta(hours=8)).isoformat() + "+00:00",
    },
    {
        "operator_id": OPERATOR_ID,
        "type": "new_booking",
        "title": "New Booking — Malik Thompson",
        "message": "Malik Thompson booked a 2023 Toyota Camry for 30 days starting Sep 1.",
        "is_read": True,
        "created_at": (datetime.now() - timedelta(days=1)).isoformat() + "+00:00",
    },
    {
        "operator_id": OPERATOR_ID,
        "type": "lead",
        "title": "Hot Lead — Shaniqua Bates",
        "message": "New hot lead from PCR Leads campaign. Uber approved, looking for 30-day rental.",
        "is_read": True,
        "created_at": (datetime.now() - timedelta(days=2)).isoformat() + "+00:00",
    },
    {
        "operator_id": OPERATOR_ID,
        "type": "payment_received",
        "title": "Payment Received — $945.00",
        "message": "Weekly rental payment from Darius Johnson received successfully.",
        "is_read": True,
        "created_at": (datetime.now() - timedelta(days=3)).isoformat() + "+00:00",
    },
]
rest_post_batch("notifications", notif_rows)
print(f"  Created {len(notif_rows)} notifications")

# ─────────────────────────────────────────────────────────────
# STEP 13: Promo codes
# ─────────────────────────────────────────────────────────────
print("\n[13] Creating promo codes...")
promo_rows = [
    {
        "operator_id": OPERATOR_ID,
        "code": "STERLING10",
        "description": "10% off for first-time renters",
        "type": "percentage",
        "value": 10.00,
        "max_uses": 50,
        "used_count": 12,
        "min_rental_days": 7,
        "valid_from": (TODAY - timedelta(days=60)).isoformat(),
        "valid_until": (TODAY + timedelta(days=90)).isoformat(),
        "is_active": True,
    },
    {
        "operator_id": OPERATOR_ID,
        "code": "RIDESHARE30",
        "description": "$30 off 30+ day rideshare rentals",
        "type": "fixed",
        "value": 30.00,
        "max_uses": 100,
        "used_count": 31,
        "min_rental_days": 30,
        "valid_from": (TODAY - timedelta(days=90)).isoformat(),
        "valid_until": (TODAY + timedelta(days=60)).isoformat(),
        "is_active": True,
    },
    {
        "operator_id": OPERATOR_ID,
        "code": "SUMMER25",
        "description": "Summer special — 25% off 7+ day rentals",
        "type": "percentage",
        "value": 25.00,
        "max_uses": 30,
        "used_count": 28,
        "min_rental_days": 7,
        "valid_from": (TODAY - timedelta(days=60)).isoformat(),
        "valid_until": (TODAY + timedelta(days=9)).isoformat(),
        "is_active": True,
    },
]
rest_post_batch("promo_codes", promo_rows)
print(f"  Created {len(promo_rows)} promo codes")

# ─────────────────────────────────────────────────────────────
# STEP 14: Add-ons
# ─────────────────────────────────────────────────────────────
print("\n[14] Creating add-ons...")
addon_rows = [
    {
        "operator_id": OPERATOR_ID,
        "name": "Rideshare Insurance",
        "description": "TNC-compliant coverage for Uber/Lyft drivers — Periods 1, 2, and 3",
        "pricing_type": "per_day",
        "price": 12.00,
        "category": "insurance",
        "required": False,
        "active": True,
        "sort_order": 1,
    },
    {
        "operator_id": OPERATOR_ID,
        "name": "GPS Fleet Tracker",
        "description": "Real-time GPS tracking included with every rental (no charge)",
        "pricing_type": "flat",
        "price": 0.00,
        "category": "extra",
        "required": True,
        "active": True,
        "sort_order": 2,
    },
    {
        "operator_id": OPERATOR_ID,
        "name": "Dash Cam",
        "description": "Front and rear dashcam — protects you in any dispute",
        "pricing_type": "flat",
        "price": 25.00,
        "category": "extra",
        "required": False,
        "active": True,
        "sort_order": 3,
    },
    {
        "operator_id": OPERATOR_ID,
        "name": "Phone Mount",
        "description": "Suction windshield mount for navigation apps",
        "pricing_type": "flat",
        "price": 5.00,
        "category": "extra",
        "required": False,
        "active": True,
        "sort_order": 4,
    },
]
rest_post_batch("addons", addon_rows)
print(f"  Created {len(addon_rows)} add-ons")

# ─────────────────────────────────────────────────────────────
# STEP 15: Agreement template
# ─────────────────────────────────────────────────────────────
print("\n[15] Creating agreement template...")
tmpl_content = """STERLING FLEET RENTALS — VEHICLE RENTAL AGREEMENT

This Agreement is entered into between Sterling Fleet Rentals ("Company") and the Renter identified herein.

1. PERMITTED USE
The vehicle may be used for personal transportation and lawful rideshare operations (Uber, Lyft). Prohibited: racing, off-road driving, towing, driving outside the continental US, sub-leasing.

2. MILEAGE POLICY
Included: 150 miles/day. Excess mileage billed at $0.25/mile based on odometer readings at pickup and return.

3. INSURANCE
Renter must maintain current personal auto insurance. Rideshare Insurance add-on (available at booking) covers TNC Periods 1–3.

4. SECURITY DEPOSIT
A $500 hold is authorized at rental start. Released within 3 business days of return, subject to vehicle condition review.

5. LATE RETURN FEE
$75/day for each day (or partial day) the vehicle is returned late without prior approval.

6. FUEL POLICY
Vehicle returned with less fuel than at pickup: charged at $6.00/gallon for the shortfall.

7. DAMAGE & LIABILITY
Renter is responsible for all vehicle damage during the rental period, including theft and vandalism.

8. GPS TRACKING
All vehicles are equipped with GPS tracking devices for fleet management purposes.

By signing this agreement, Renter confirms they have read, understood, and agree to all terms and conditions."""

tmpl_result = rest_post("agreement_templates", {
    "operator_id": OPERATOR_ID,
    "name": "Standard Rideshare Rental Agreement",
    "content": tmpl_content,
    "is_default": True,
})
print(f"  Created agreement template")

# ─────────────────────────────────────────────────────────────
# STEP 16: Renter communications
# ─────────────────────────────────────────────────────────────
print("\n[16] Creating renter communications...")
comm_rows = [
    {
        "renter_id": renter_rows[0]["id"],
        "operator_id": OPERATOR_ID,
        "type": "call",
        "subject": "Confirmed pickup time",
        "content": "Called to confirm pickup tomorrow at 9am. Jerome is Uber approved, will be picking up at Peachtree office.",
        "created_by": "Marcus Sterling",
        "created_at": (datetime.now() - timedelta(days=3)).isoformat() + "+00:00",
    },
    {
        "renter_id": renter_rows[1]["id"],
        "operator_id": OPERATOR_ID,
        "type": "sms",
        "subject": "Booking extension",
        "content": "Latasha requested 7-day extension on her current booking. Extended through Sep 6. Updated agreement sent via email.",
        "created_by": "Jasmine Rhodes",
        "created_at": (datetime.now() - timedelta(days=7)).isoformat() + "+00:00",
    },
    {
        "renter_id": renter_rows[4]["id"],
        "operator_id": OPERATOR_ID,
        "type": "note",
        "subject": "Car wash request",
        "content": "Marcus requested a car wash on return. Noted in handoff checklist for Calvin.",
        "created_by": "Calvin Okonkwo",
        "created_at": (datetime.now() - timedelta(days=14)).isoformat() + "+00:00",
    },
    {
        "renter_id": renter_rows[8]["id"],
        "operator_id": OPERATOR_ID,
        "type": "call",
        "subject": "Minor scuff on return",
        "content": "Tyrone returned the Camry with a minor scuff on the rear bumper. Photographed. Resolved with partial deposit hold of $120. Customer understood.",
        "created_by": "Marcus Sterling",
        "created_at": (datetime.now() - timedelta(days=21)).isoformat() + "+00:00",
    },
    {
        "renter_id": renter_rows[2]["id"],
        "operator_id": OPERATOR_ID,
        "type": "call",
        "subject": "New renter onboarding",
        "content": "Walked Darius through the check-in process, GPS tracker policy, and mileage limits. He drives for both Uber and Lyft — signed up for Rideshare Insurance add-on.",
        "created_by": "Marcus Sterling",
        "created_at": (datetime.now() - timedelta(days=45)).isoformat() + "+00:00",
    },
    {
        "renter_id": renter_rows[11]["id"],
        "operator_id": OPERATOR_ID,
        "type": "note",
        "subject": "Repeat customer — VIP note",
        "content": "Monique is on her 4th rental. Always on time, no issues. Consider offering loyalty discount on next booking.",
        "created_by": "Jasmine Rhodes",
        "created_at": (datetime.now() - timedelta(days=10)).isoformat() + "+00:00",
    },
]
rest_post_batch("renter_communications", comm_rows)
print(f"  Created {len(comm_rows)} renter communications")

# ─────────────────────────────────────────────────────────────
# STEP 17: Support tickets
# ─────────────────────────────────────────────────────────────
print("\n[17] Creating support tickets and messages...")
ticket_cases = [
    {
        "renter_name": "Jerome Washington",
        "renter_email": "jwashington@gmail.com",
        "subject": "Mileage discrepancy on return",
        "status": "resolved",
        "priority": "normal",
        "days_ago": 14,
        "reply": "We reviewed the GPS mileage log and odometer reading at return. The discrepancy was 12 miles — within our rounding margin. No additional charge applied. Thank you for bringing it to our attention!",
    },
    {
        "renter_name": "Tyrone Jackson",
        "renter_email": "tyrone.j77@gmail.com",
        "subject": "AC not cooling properly — 2022 Nissan Altima",
        "status": "resolved",
        "priority": "high",
        "days_ago": 30,
        "reply": "We're sorry about the inconvenience! We had the AC serviced same day and provided a loaner. The Altima is fully repaired and back in service. You've been credited $50 for the trouble.",
    },
    {
        "renter_name": "Brianna Davis",
        "renter_email": "b.davis.rent@gmail.com",
        "subject": "Question about Lyft insurance coverage periods",
        "status": "in_progress",
        "priority": "normal",
        "days_ago": 2,
        "reply": "Great question! Our Rideshare Insurance add-on covers Periods 1 (app on, no ride accepted), 2 (matched with rider), and 3 (passenger in vehicle). We're happy to get on a quick call to walk you through it.",
    },
]

for tc in ticket_cases:
    tr = rest_post("support_tickets", {
        "operator_id": OPERATOR_ID,
        "renter_name": tc["renter_name"],
        "renter_email": tc["renter_email"],
        "subject": tc["subject"],
        "status": tc["status"],
        "priority": tc["priority"],
        "created_at": (datetime.now() - timedelta(days=tc["days_ago"])).isoformat() + "+00:00",
    })
    tr_id = tr[0]["id"]
    msg_rows = [
        {
            "ticket_id": tr_id,
            "sender_type": "renter",
            "sender_name": tc["renter_name"],
            "content": f"Hi Sterling Fleet, {tc['subject'].lower()}. Can you help?",
            "created_at": (datetime.now() - timedelta(days=tc["days_ago"])).isoformat() + "+00:00",
        },
        {
            "ticket_id": tr_id,
            "sender_type": "operator",
            "sender_name": "Marcus Sterling",
            "content": tc["reply"],
            "created_at": (datetime.now() - timedelta(days=tc["days_ago"] - 0.5)).isoformat() + "+00:00",
        },
    ]
    rest_post_batch("ticket_messages", msg_rows)
print(f"  Created {len(ticket_cases)} support tickets with message threads")

# ─────────────────────────────────────────────────────────────
# STEP 18: Subscription record
# ─────────────────────────────────────────────────────────────
print("\n[18] Creating subscription record...")
rest_post("subscriptions", {
    "operator_id": OPERATOR_ID,
    "stripe_subscription_id": "owner_bypass",
    "stripe_customer_id": "cus_demo_sterling_2026",
    "plan": "scale",
    "status": "active",
    "current_period_start": (TODAY - timedelta(days=30)).isoformat() + "T00:00:00+00:00",
    "current_period_end": (TODAY + timedelta(days=1)).isoformat() + "T00:00:00+00:00",
})
print("  Created subscription record")

# ─────────────────────────────────────────────────────────────
# STEP 19: Verify login
# ─────────────────────────────────────────────────────────────
print("\n[19] Verifying login credentials...")
status, login_resp = http_request(
    "POST",
    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
    data={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
    headers={"apikey": ANON_KEY, "Content-Type": "application/json"}
)
login_ok = status == 200 and "access_token" in login_resp
print(f"  Login test: {'✅ SUCCESS' if login_ok else '❌ FAILED'} (HTTP {status})")

# ─────────────────────────────────────────────────────────────
# STEP 20: Query back real aggregates
# ─────────────────────────────────────────────────────────────
print("\n[20] Querying real aggregates from database...")

db_vehicles = rest_get("vehicles", {"operator_id": f"eq.{OPERATOR_ID}", "select": "id,status,daily_rate"})
db_bookings = rest_get("bookings", {"operator_id": f"eq.{OPERATOR_ID}", "select": "id,status,total_price,start_date,end_date,vehicle_id", "limit": "2000"})
db_renters = rest_get("renters", {"operator_id": f"eq.{OPERATOR_ID}", "select": "id"})
db_leads = rest_get("leads", {"operator_id": f"eq.{OPERATOR_ID}", "select": "id,stage"})
db_maint = rest_get("maintenance_records", {"operator_id": f"eq.{OPERATOR_ID}", "select": "id,status"})

db_v_total = len(db_vehicles)
db_v_active = sum(1 for v in db_vehicles if v["status"] == "active")
db_v_maint = sum(1 for v in db_vehicles if v["status"] == "maintenance")

db_b_comp = sum(1 for b in db_bookings if b["status"] == "completed")
db_b_act = sum(1 for b in db_bookings if b["status"] == "active")
db_b_conf = sum(1 for b in db_bookings if b["status"] == "confirmed")
db_b_pend = sum(1 for b in db_bookings if b["status"] == "pending")
db_b_total = len(db_bookings)

db_revenue = sum(float(b["total_price"]) for b in db_bookings
                 if b["status"] in ("completed", "active") and b["total_price"])
db_monthly = db_revenue / 3

# Compute utilization from actual DB data
occ_set = set()
for b in db_bookings:
    if b["status"] in ("completed", "active") and b["vehicle_id"]:
        bs = date.fromisoformat(b["start_date"])
        be = date.fromisoformat(b["end_date"])
        eff_start = max(bs, WINDOW_START)
        eff_end = min(be, TODAY)
        if eff_start < eff_end:
            cur = eff_start
            while cur < eff_end:
                occ_set.add((b["vehicle_id"], cur.isoformat()))
                cur += timedelta(days=1)

db_util = len(occ_set) / (32 * 90) * 100

print("\n" + "=" * 60)
print("FINAL REPORT")
print("=" * 60)
print(f"\n✅ Login confirmed: {'YES' if login_ok else 'NO'}")
print(f"   Email:    {DEMO_EMAIL}")
print(f"   Password: {DEMO_PASSWORD}")
print(f"\n   Operator ID: {OPERATOR_ID}")
print(f"   User ID:     {USER_ID}")
print(f"\n📊 Real Computed Aggregates (queried from DB):")
print(f"   Vehicles:    {db_v_total} total ({db_v_active} active, {db_v_maint} in maintenance)")
print(f"   Bookings:    {db_b_total} total")
print(f"     Completed: {db_b_comp}")
print(f"     Active:    {db_b_act}")
print(f"     Confirmed: {db_b_conf}")
print(f"     Pending:   {db_b_pend}")
print(f"   Revenue (90-day, completed+active): ${db_revenue:,.2f}")
print(f"   Est. monthly revenue:               ${db_monthly:,.2f}")
print(f"   Fleet utilization (90-day, 32 cars): {db_util:.1f}%")
print(f"   Renters: {len(db_renters)}")
print(f"   Leads:   {len(db_leads)}")
print(f"   Maintenance records: {len(db_maint)}")

print(f"\n📋 Tables seeded:")
tables = [
    ("operators", 1),
    ("locations", 2),
    ("vehicles", db_v_total),
    ("renters", len(db_renters)),
    ("bookings", db_b_total),
    ("payment_schedule", len(payment_rows)),
    ("leads", len(db_leads)),
    ("maintenance_records", len(db_maint)),
    ("team_members", len(team_rows)),
    ("notifications", len(notif_rows)),
    ("promo_codes", len(promo_rows)),
    ("addons", len(addon_rows)),
    ("agreement_templates", 1),
    ("renter_communications", len(comm_rows)),
    ("support_tickets", len(ticket_cases)),
    ("subscriptions", 1),
]
for t, n in tables:
    print(f"   {t}: {n} row{'s' if n != 1 else ''}")

print(f"\n⚠️  Dashboard views that will render empty (no seed path):")
print(f"   vehicle_photos      — no photo URLs; vehicles show placeholder")
print(f"   vehicle_documents   — no file uploads; docs tab empty")
print(f"   inspections         — no pre/post inspection records")
print(f"   rental_agreements   — per-booking signed docs not seeded")
print(f"   invoices            — generated on demand; will be empty")
print(f"   damage_claims       — intentionally omitted (healthy demo)")
print(f"   deliveries          — scheduling not seeded")
print(f"   pricing_rules       — flat rates used; no surge/discount rules")

print(f"\n✅ Seed complete!")
