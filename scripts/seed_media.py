#!/usr/bin/env python3
"""
Seed all visual/media assets for PCR Booking demo account.
Uploads real car photos + vehicle documents + operator logo to Supabase Storage.
"""

import re, json, time, sys, io, uuid, os
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
import urllib.parse

# ── Config ────────────────────────────────────────────────────────────────────
ENV = open('/Users/igrisknight/.openclaw/workspace/pcr-booking/.env.local').read()
SK = re.search(r'SUPABASE_SERVICE_ROLE_KEY[=:][" ]*([A-Za-z0-9._-]+)', ENV).group(1)
SUPABASE_URL = "https://ulxweelmckbtsxyvsvkq.supabase.co"
OPERATOR_ID = "12abedc4-1185-418a-b79f-9ca7818bf07a"

HEADERS_JSON = {
    "Authorization": f"Bearer {SK}",
    "apikey": SK,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def supabase_get(path, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = Request(url, headers={**HEADERS_JSON, "Prefer": ""})
    resp = urlopen(req, timeout=30)
    return json.loads(resp.read())

def supabase_post(path, data):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    body = json.dumps(data).encode()
    req = Request(url, data=body, headers=HEADERS_JSON, method="POST")
    try:
        resp = urlopen(req, timeout=30)
        return json.loads(resp.read())
    except HTTPError as e:
        print(f"  POST error {e.code}: {e.read().decode()}")
        return None

def supabase_patch(path, params, data):
    url = f"{SUPABASE_URL}/rest/v1/{path}?" + urllib.parse.urlencode(params)
    body = json.dumps(data).encode()
    req = Request(url, data=body, headers={**HEADERS_JSON, "Prefer": "return=representation"}, method="PATCH")
    try:
        resp = urlopen(req, timeout=30)
        return json.loads(resp.read())
    except HTTPError as e:
        print(f"  PATCH error {e.code}: {e.read().decode()}")
        return None

def storage_upload(bucket, path, content_bytes, content_type="image/jpeg"):
    """Upload file bytes to Supabase Storage, return public URL."""
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    req = Request(url, data=content_bytes, headers={
        "Authorization": f"Bearer {SK}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }, method="POST")
    try:
        resp = urlopen(req, timeout=60)
        result = json.loads(resp.read())
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"
        return public_url
    except HTTPError as e:
        print(f"  Storage upload error {e.code}: {e.read().decode()}")
        return None

def fetch_url(url, max_retries=3):
    """Download bytes from a URL."""
    for i in range(max_retries):
        try:
            req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            resp = urlopen(req, timeout=30)
            return resp.read()
        except Exception as e:
            if i < max_retries - 1:
                time.sleep(1)
            else:
                print(f"  Failed to fetch {url}: {e}")
                return None


# ── Pexels Photo Pool ─────────────────────────────────────────────────────────
# Curated Pexels photo IDs by vehicle category/color
# Format: (photo_id, description, label)
# These are known-good stable Pexels CDN URLs

PEXELS_BASE = "https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"

# Photo pools organized by category and color theme
# (pexels_id, short_label)
SEDAN_BLACK = [
    (116675, "exterior-front"),
    (1118448, "exterior-side"),
    (3874062, "exterior-rear"),
    (3608542, "exterior-angle"),
    (1466150, "detail-wheel"),
    (2070975, "interior"),
]
SEDAN_WHITE = [
    (112460, "exterior-front"),
    (1638459, "exterior-side"),
    (1592384, "exterior-angle"),
    (819798, "exterior-rear"),
    (248747, "interior"),
    (1756957, "detail"),
]
SEDAN_SILVER = [
    (170811, "exterior-front"),
    (3254350, "exterior-side"),
    (1164778, "exterior-angle"),
    (892522, "exterior-rear"),
    (248747, "interior"),
    (1756957, "detail-wheel"),
]
SEDAN_GRAY = [
    (3874062, "exterior-front"),
    (3608542, "exterior-side"),
    (170811, "exterior-angle"),
    (892522, "exterior-rear"),
    (248747, "interior"),
    (1756957, "detail"),
]
SEDAN_BLUE = [
    (2920064, "exterior-front"),
    (74906, "exterior-side"),
    (1592384, "exterior-angle"),
    (819798, "exterior-rear"),
    (248747, "interior"),
]
SEDAN_RED = [
    (186077, "exterior-front"),
    (2920064, "exterior-side"),
    (1592384, "exterior-angle"),
    (819798, "exterior-rear"),
    (248747, "interior"),
]

SUV_BLACK = [
    (1376201, "exterior-front"),
    (1035108, "exterior-side"),
    (4609022, "exterior-angle"),
    (2365572, "exterior-rear"),
    (248747, "interior"),
    (3571120, "detail-wheel"),
]
SUV_WHITE = [
    (1035108, "exterior-front"),
    (2606395, "exterior-side"),
    (1592384, "exterior-angle"),
    (1638459, "exterior-rear"),
    (248747, "interior"),
    (819798, "detail"),
]
SUV_SILVER = [
    (3571120, "exterior-front"),
    (892522, "exterior-side"),
    (3046080, "exterior-angle"),
    (2120253, "exterior-rear"),
    (248747, "interior"),
]
SUV_GRAY = [
    (3609016, "exterior-front"),
    (4483268, "exterior-side"),
    (1376201, "exterior-angle"),
    (892522, "exterior-rear"),
    (248747, "interior"),
]
SUV_BLUE = [
    (74906, "exterior-front"),
    (1035108, "exterior-side"),
    (2920064, "exterior-angle"),
    (2365572, "exterior-rear"),
    (248747, "interior"),
]
SUV_RED = [
    (186077, "exterior-front"),
    (1035108, "exterior-side"),
    (2920064, "exterior-angle"),
    (3609016, "exterior-rear"),
    (248747, "interior"),
]

MINIVAN_WHITE = [
    (1592384, "exterior-front"),
    (1638459, "exterior-side"),
    (248747, "interior"),
    (819798, "exterior-rear"),
]
MINIVAN_SILVER = [
    (892522, "exterior-front"),
    (170811, "exterior-side"),
    (248747, "interior"),
    (3046080, "exterior-rear"),
]

LUXURY_BLACK = [
    (116675, "exterior-front"),
    (1118448, "exterior-side"),
    (3608542, "exterior-angle"),
    (1466150, "detail-wheel"),
    (248747, "interior"),
]
LUXURY_SILVER = [
    (3254350, "exterior-front"),
    (170811, "exterior-side"),
    (892522, "exterior-angle"),
    (1164778, "exterior-rear"),
    (248747, "interior"),
]

def get_photo_pool(category, color, make, model):
    """Return photo pool for a vehicle."""
    cat = category.lower()
    col = color.lower()
    
    # Premium vehicles get luxury pool
    if make in ("BMW", "Mercedes-Benz", "Lexus"):
        if col in ("black",):
            return LUXURY_BLACK
        return LUXURY_SILVER
    
    if cat == "minivan":
        if col in ("white",):
            return MINIVAN_WHITE
        return MINIVAN_SILVER
    
    if cat == "suv":
        if col == "black": return SUV_BLACK
        if col == "white": return SUV_WHITE
        if col == "silver": return SUV_SILVER
        if col in ("gray", "grey"): return SUV_GRAY
        if col == "blue": return SUV_BLUE
        if col == "red": return SUV_RED
        return SUV_WHITE
    
    # sedan / default
    if col == "black": return SEDAN_BLACK
    if col == "white": return SEDAN_WHITE
    if col == "silver": return SEDAN_SILVER
    if col in ("gray", "grey"): return SEDAN_GRAY
    if col == "blue": return SEDAN_BLUE
    if col == "red": return SEDAN_RED
    return SEDAN_SILVER


# ── Logo Generation ───────────────────────────────────────────────────────────
def generate_logo_svg():
    """Generate a clean SVG wordmark for Sterling Fleet Rentals."""
    svg = '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="120" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="120" fill="#0F172A" rx="8"/>
  <!-- S monogram circle -->
  <circle cx="55" cy="60" r="36" fill="none" stroke="#2EBD6B" stroke-width="3"/>
  <text x="55" y="67" font-family="Georgia, serif" font-size="32" font-weight="700" 
        fill="#2EBD6B" text-anchor="middle">S</text>
  <!-- Brand name -->
  <text x="105" y="50" font-family="Georgia, serif" font-size="22" font-weight="700" 
        fill="#FFFFFF" dominant-baseline="middle">STERLING FLEET</text>
  <text x="105" y="78" font-family="Arial, sans-serif" font-size="13" font-weight="400" 
        fill="#2EBD6B" letter-spacing="3" dominant-baseline="middle">RENTALS · ATLANTA</text>
  <!-- Divider line -->
  <line x1="105" y1="62" x2="385" y2="62" stroke="#2EBD6B" stroke-width="0.5" opacity="0.4"/>
</svg>'''
    return svg.encode("utf-8")


# ── Document Generation ───────────────────────────────────────────────────────
def generate_registration_pdf(vehicle):
    """Generate a SPECIMEN registration document using reportlab."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
        styles = getSampleStyleSheet()
        
        # Specimen watermark style
        specimen_style = ParagraphStyle(
            'Specimen', parent=styles['Normal'],
            fontSize=48, textColor=colors.Color(0.9, 0.2, 0.2, 0.3),
            alignment=1,
        )
        header_style = ParagraphStyle('Header', parent=styles['Normal'], fontSize=14, fontName='Helvetica-Bold', alignment=1)
        title_style = ParagraphStyle('Title', parent=styles['Normal'], fontSize=18, fontName='Helvetica-Bold', alignment=1, spaceAfter=12)
        
        story = []
        story.append(Paragraph("SPECIMEN — FOR DEMONSTRATION ONLY", specimen_style))
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph("STATE OF GEORGIA", header_style))
        story.append(Paragraph("CERTIFICATE OF MOTOR VEHICLE REGISTRATION", title_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Vehicle info table
        plate = f"SFR-{str(vehicle['id'])[:4].upper()}"
        vin = f"DEMO{str(vehicle['id'])[:13].upper().replace('-', '')[:13]}"
        data = [
            ["License Plate:", plate, "Year:", str(vehicle['year'])],
            ["VIN (DEMO):", vin[:17], "Make:", vehicle['make']],
            ["Model:", vehicle['model'], "Color:", vehicle['color']],
            ["Registered Owner:", "Sterling Fleet Rentals LLC", "County:", "Fulton"],
            ["Address:", "1234 Peachtree St NW, Atlanta GA 30309", "Class:", "Passenger"],
            ["Expiry Date:", "12/31/2027", "Weight:", "3,200 lbs (est.)"],
        ]
        t = Table(data, colWidths=[1.5*inch, 2.5*inch, 1.0*inch, 1.5*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), colors.lightgrey),
            ('BACKGROUND', (2,0), (2,-1), colors.lightgrey),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.4*inch))
        story.append(Paragraph("⚠️  SPECIMEN — NOT A VALID GOVERNMENT DOCUMENT — FOR DEMONSTRATION PURPOSES ONLY  ⚠️", 
                               ParagraphStyle('warn', parent=styles['Normal'], fontSize=9, textColor=colors.red, alignment=1)))
        
        doc.build(story)
        return buf.getvalue()
    except ImportError:
        # Fallback: generate a minimal PDF manually
        return generate_minimal_pdf("VEHICLE REGISTRATION", vehicle, "registration")

def generate_insurance_pdf(vehicle):
    """Generate a SPECIMEN insurance card."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
        styles = getSampleStyleSheet()
        
        specimen_style = ParagraphStyle('Specimen', parent=styles['Normal'], fontSize=48,
            textColor=colors.Color(0.9, 0.2, 0.2, 0.3), alignment=1)
        title_style = ParagraphStyle('Title', parent=styles['Normal'], fontSize=18, fontName='Helvetica-Bold', alignment=1, spaceAfter=12)
        header_style = ParagraphStyle('Header', parent=styles['Normal'], fontSize=14, fontName='Helvetica-Bold', alignment=1)
        
        story = []
        story.append(Paragraph("SPECIMEN — FOR DEMONSTRATION ONLY", specimen_style))
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph("DEMO INSURANCE CORPORATION", header_style))
        story.append(Paragraph("COMMERCIAL AUTO INSURANCE CERTIFICATE", title_style))
        story.append(Spacer(1, 0.2*inch))
        
        policy_num = f"DEMO-{str(vehicle['id'])[:8].upper()}-CA"
        data = [
            ["Policy Number:", policy_num, "Policy Period:", "01/01/2026 – 12/31/2027"],
            ["Insured:", "Sterling Fleet Rentals LLC", "Liability Limit:", "$1,000,000 CSL"],
            ["Address:", "1234 Peachtree St NW, Atlanta GA 30309", "Comprehensive:", "Yes"],
            ["Vehicle:", f"{vehicle['year']} {vehicle['make']} {vehicle['model']}", "Collision:", "Yes"],
            ["Color:", vehicle['color'], "Uninsured:", "Included"],
        ]
        t = Table(data, colWidths=[1.5*inch, 2.5*inch, 1.5*inch, 1.5*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), colors.lightgrey),
            ('BACKGROUND', (2,0), (2,-1), colors.lightgrey),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.4*inch))
        story.append(Paragraph("⚠️  SPECIMEN — THIS IS NOT A REAL INSURANCE DOCUMENT — FOR DEMONSTRATION ONLY  ⚠️",
                               ParagraphStyle('warn', parent=styles['Normal'], fontSize=9, textColor=colors.red, alignment=1)))
        
        doc.build(story)
        return buf.getvalue()
    except ImportError:
        return generate_minimal_pdf("INSURANCE CERTIFICATE", vehicle, "insurance")

def generate_minimal_pdf(title, vehicle, doc_type):
    """Minimal hand-crafted PDF when reportlab is unavailable."""
    content = f"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>>>> endobj
4 0 obj<</Length 500>>
stream
BT
/F1 24 Tf
200 700 Td
(SPECIMEN) Tj
/F1 18 Tf
50 650 Td
({title}) Tj
/F1 12 Tf
50 600 Td
(FOR DEMONSTRATION PURPOSES ONLY - NOT A REAL DOCUMENT) Tj
50 570 Td
(Vehicle: {vehicle['year']} {vehicle['make']} {vehicle['model']}) Tj
50 550 Td
(Color: {vehicle['color']}) Tj
50 530 Td
(Operator: Sterling Fleet Rentals - Atlanta GA) Tj
50 480 Td
(This is a demonstration document generated for sales demo purposes.) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
trailer<</Size 5/Root 1 0 R>>
startxref
900
%%EOF"""
    return content.encode('latin-1')


# ── Main Seeding Logic ────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("PCR Booking Demo Media Seeder")
    print("=" * 60)
    
    # Get all vehicles for the demo operator
    vehicles = supabase_get("vehicles", {
        "operator_id": f"eq.{OPERATOR_ID}",
        "select": "id,make,model,year,color,category",
        "order": "category",
    })
    print(f"\n✓ Found {len(vehicles)} vehicles to seed\n")
    
    # ── Step 1: Clear existing photo rows (if any) ──
    print("Checking for existing photo rows...")
    existing = supabase_get("vehicle_photos", {
        "vehicle_id": f"in.({','.join(v['id'] for v in vehicles)})",
        "select": "id",
    })
    print(f"  Found {len(existing)} existing photo rows")
    
    # ── Step 2: Upload Vehicle Photos ──
    print("\n── PHASE 1: Vehicle Photos ──")
    
    photos_written = 0
    vehicles_done = 0
    failed_vehicles = []
    
    for v in vehicles:
        vid = v['id']
        label = f"{v['year']} {v['color']} {v['make']} {v['model']}"
        print(f"\n[{vehicles_done+1}/34] {label}")
        
        pool = get_photo_pool(v['category'], v['color'], v['make'], v['model'])
        # Use 3 photos for each vehicle (primary + 2 extras)
        pool_to_use = pool[:4]
        
        vehicle_photos_inserted = 0
        for idx, (photo_id, photo_label) in enumerate(pool_to_use):
            pexels_url = PEXELS_BASE.format(id=photo_id)
            print(f"  Downloading photo {idx+1}: pexels#{photo_id} ({photo_label})")
            
            img_bytes = fetch_url(pexels_url)
            if not img_bytes:
                print(f"  ✗ Failed to download pexels#{photo_id}")
                continue
            
            # Upload to Supabase Storage
            storage_path = f"{OPERATOR_ID}/{vid}/{photo_id}_{photo_label}.jpg"
            public_url = storage_upload("vehicle-photos", storage_path, img_bytes, "image/jpeg")
            if not public_url:
                print(f"  ✗ Failed to upload to storage")
                continue
            
            # Insert vehicle_photos row
            is_primary = (idx == 0)
            row = supabase_post("vehicle_photos", {
                "vehicle_id": vid,
                "url": public_url,
                "label": photo_label,
                "is_primary": is_primary,
                "sort_order": idx,
            })
            if row:
                print(f"  ✓ {photo_label} {'[PRIMARY]' if is_primary else ''}")
                vehicle_photos_inserted += 1
                photos_written += 1
            
            time.sleep(0.1)  # rate limit
        
        if vehicle_photos_inserted > 0:
            vehicles_done += 1
            
            # Also update the vehicle's photo_url field (convenience column) 
            # Use the primary photo URL
            primary_url = f"{SUPABASE_URL}/storage/v1/object/public/vehicle-photos/{OPERATOR_ID}/{vid}/{pool_to_use[0][0]}_{pool_to_use[0][1]}.jpg"
            supabase_patch("vehicles", {"id": f"eq.{vid}"}, {"photo_url": primary_url})
        else:
            failed_vehicles.append(label)
            print(f"  ✗ No photos inserted for this vehicle!")
    
    print(f"\n✓ Vehicle photos: {vehicles_done}/34 vehicles, {photos_written} total rows")
    if failed_vehicles:
        print(f"✗ Failed vehicles: {failed_vehicles}")
    
    # ── Step 3: Vehicle Documents ──
    print("\n── PHASE 2: Vehicle Documents ──")
    
    # Install reportlab if needed
    try:
        import reportlab
        print("  reportlab available ✓")
    except ImportError:
        print("  Installing reportlab...")
        os.system("pip install reportlab -q")
    
    docs_written = 0
    for v in vehicles:
        vid = v['id']
        
        # Registration
        print(f"  Generating registration for {v['year']} {v['make']} {v['model']}...")
        reg_bytes = generate_registration_pdf(v)
        reg_path = f"{OPERATOR_ID}/{vid}/registration.pdf"
        reg_url = storage_upload("vehicle-photos", reg_path, reg_bytes, "application/pdf")
        if reg_url:
            row = supabase_post("vehicle_documents", {
                "vehicle_id": vid,
                "type": "registration",
                "name": f"Registration — {v['year']} {v['make']} {v['model']}",
                "url": reg_url,
                "expiry_date": "2027-12-31",
            })
            if row:
                docs_written += 1
        
        # Insurance
        ins_bytes = generate_insurance_pdf(v)
        ins_path = f"{OPERATOR_ID}/{vid}/insurance.pdf"
        ins_url = storage_upload("vehicle-photos", ins_path, ins_bytes, "application/pdf")
        if ins_url:
            row = supabase_post("vehicle_documents", {
                "vehicle_id": vid,
                "type": "insurance",
                "name": f"Insurance Certificate — {v['year']} {v['make']} {v['model']}",
                "url": ins_url,
                "expiry_date": "2027-12-31",
            })
            if row:
                docs_written += 1
        
        time.sleep(0.05)
    
    print(f"\n✓ Vehicle documents: {docs_written} rows (registration + insurance per vehicle)")
    
    # ── Step 4: Operator Logo ──
    print("\n── PHASE 3: Operator Logo ──")
    logo_svg = generate_logo_svg()
    logo_path = f"{OPERATOR_ID}/logo.svg"
    logo_url = storage_upload("operator-assets", logo_path, logo_svg, "image/svg+xml")
    if logo_url:
        result = supabase_patch("operators", {"id": f"eq.{OPERATOR_ID}"}, {
            "logo_url": logo_url,
            "brand_logo_url": logo_url,
        })
        print(f"✓ Logo uploaded: {logo_url}")
        print(f"  Operator updated: {bool(result)}")
    else:
        print("✗ Logo upload failed")
    
    # ── Step 5: Renter Avatars ──
    print("\n── PHASE 4: Renter/Team Avatars ──")
    
    # Use diverse, tasteful avatar placeholder images (DiceBear avatars — SVG, no real faces)
    # These generate consistently from a seed string
    renters = supabase_get("renters", {
        "operator_id": f"eq.{OPERATOR_ID}",
        "select": "id,name",
        "limit": "100",
    })
    print(f"  Found {len(renters)} renters")
    
    renters_updated = 0
    for r in renters:
        # Use DiceBear initials avatars (stable public CDN, no PII)
        seed = urllib.parse.quote(r['name'].replace(' ', ''))
        avatar_url = f"https://api.dicebear.com/7.x/initials/svg?seed={seed}&backgroundColor=2EBD6B,0F172A,1E40AF,7C3AED&backgroundType=gradientLinear&fontSize=36"
        result = supabase_patch("renters", {"id": f"eq.{r['id']}"}, {"photo_url": avatar_url})
        if result:
            renters_updated += 1
    
    print(f"✓ Renter avatars: {renters_updated}/{len(renters)} updated")
    
    # Team members don't have a photo_url column based on schema — skip
    
    # ── Step 6: Verify ──
    print("\n── VERIFICATION ──")
    
    # Check how many vehicles have photos
    all_photo_vehicle_ids = set()
    for v in vehicles:
        photos = supabase_get("vehicle_photos", {
            "vehicle_id": f"eq.{v['id']}",
            "select": "id,is_primary",
        })
        if photos:
            all_photo_vehicle_ids.add(v['id'])
    
    print(f"\n✅ Vehicles with ≥1 photo: {len(all_photo_vehicle_ids)}/34")
    
    # Verify primary flag
    multi_primary = 0
    no_primary = 0
    for v in vehicles:
        primaries = supabase_get("vehicle_photos", {
            "vehicle_id": f"eq.{v['id']}",
            "is_primary": "eq.true",
            "select": "id",
        })
        if len(primaries) > 1:
            multi_primary += 1
        elif len(primaries) == 0 and v['id'] in all_photo_vehicle_ids:
            no_primary += 1
    
    print(f"✅ Vehicles with exactly 1 primary: {len(all_photo_vehicle_ids) - multi_primary - no_primary}")
    if multi_primary: print(f"⚠️  Vehicles with multiple primaries: {multi_primary}")
    if no_primary: print(f"⚠️  Vehicles with 0 primaries: {no_primary}")
    
    # Test sample URLs
    print("\n── SAMPLE URL CHECKS ──")
    for v in vehicles[:4]:
        photos = supabase_get("vehicle_photos", {
            "vehicle_id": f"eq.{v['id']}",
            "is_primary": "eq.true",
            "select": "url",
        })
        if photos:
            url = photos[0]['url']
            try:
                req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
                resp = urlopen(req, timeout=10)
                ct = resp.headers.get('content-type', 'unknown')
                size = len(resp.read())
                print(f"  ✅ {v['year']} {v['make']} {v['model']}: HTTP 200, {ct}, {size:,} bytes")
                print(f"     {url[:80]}...")
            except Exception as e:
                print(f"  ✗ {v['year']} {v['make']} {v['model']}: {e}")
    
    print("\n" + "=" * 60)
    print("SEEDING COMPLETE")
    print("=" * 60)
    print(f"  Vehicle photos rows:    {photos_written}")
    print(f"  Vehicles covered:       {vehicles_done}/34")
    print(f"  Vehicle document rows:  {docs_written}")
    print(f"  Logo:                   {'✓' if logo_url else '✗'}")
    print(f"  Renter avatars:         {renters_updated}")
    print(f"  Storage bucket:         vehicle-photos (public)")
    print(f"  Photo source:           Pexels CDN (free, stable URLs, commercial license)")

if __name__ == "__main__":
    main()
