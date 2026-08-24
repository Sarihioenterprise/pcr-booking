#!/usr/bin/env python3
"""
Phase 2: Upload vehicle photos to Supabase using the collected URL map.
Runs after seed_media.py (which handles docs + logo) and the URL collection scripts.
"""
import re, json, time, os, urllib.request, urllib.error

# ── Credentials ──────────────────────────────────────────────────────────────
ENV_PATH = os.path.join(os.path.dirname(__file__), '..', '.env.local')
with open(ENV_PATH) as f:
    env = f.read()

SUPABASE_URL = re.search(r'NEXT_PUBLIC_SUPABASE_URL="?([^"\n]+)', env).group(1).strip()
SERVICE_KEY  = re.search(r'SUPABASE_SERVICE_ROLE_KEY="?([^"\n]+)', env).group(1).strip()

OPERATOR_ID = '12abedc4-1185-418a-b79f-9ca7818bf07a'
BUCKET      = 'vehicle-photos'

GET_HEADERS = {'Authorization': f'Bearer {SERVICE_KEY}', 'apikey': SERVICE_KEY}
HEADERS = {**GET_HEADERS, 'Content-Type': 'application/json'}

PHOTO_LABELS = ['Exterior Front', 'Side Profile', 'Interior / Dashboard', 'Exterior Rear', 'Detail']

# ── Helpers ───────────────────────────────────────────────────────────────────
def sb_get(path, params=''):
    req = urllib.request.Request(f'{SUPABASE_URL}/rest/v1/{path}{params}', headers=GET_HEADERS)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def sb_post(path, data):
    body = json.dumps(data).encode()
    h = {**HEADERS, 'Prefer': 'return=representation'}
    req = urllib.request.Request(f'{SUPABASE_URL}/rest/v1/{path}', data=body, headers=h, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def sb_patch(path, params, data):
    body = json.dumps(data).encode()
    h = {**HEADERS, 'Prefer': 'return=representation'}
    req = urllib.request.Request(f'{SUPABASE_URL}/rest/v1/{path}{params}', data=body, headers=h, method='PATCH')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def storage_upload(bucket, path, data, content_type='image/jpeg'):
    url = f'{SUPABASE_URL}/storage/v1/object/{bucket}/{path}'
    req = urllib.request.Request(
        url, data=data,
        headers={**GET_HEADERS, 'Content-Type': content_type, 'x-upsert': 'true'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as r:
            json.loads(r.read())
            return f'{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}'
    except urllib.error.HTTPError as e:
        err = e.read()
        print(f'    Upload error {e.code}: {err[:100]}')
        return None

def download_image(url, timeout=25):
    req = urllib.request.Request(url, headers={'User-Agent': 'PCRDemo/1.0 (pcrbooking.com)'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            ct = r.headers.get('content-type', 'image/jpeg').split(';')[0].strip()
            data = r.read()
            if len(data) < 5000:  # too small = likely error page
                print(f'    Too small ({len(data)} bytes), skipping')
                return None, None
            return data, ct
    except Exception as e:
        print(f'    Download failed: {e}')
        return None, None

# ── URL Map ───────────────────────────────────────────────────────────────────
with open('/tmp/car_photo_urls.json') as f:
    URL_MAP_RAW = json.load(f)

# Map to (make, model) tuples
URL_MAP = {}
MAKE_MODEL_LOOKUP = {
    ('Toyota', 'Camry'):         'Toyota Camry',
    ('Nissan', 'Altima'):        'Nissan Altima',
    ('Chevrolet', 'Malibu'):     'Chevrolet Malibu',
    ('Hyundai', 'Elantra'):      'Hyundai Elantra',
    ('Kia', 'Forte'):            'Kia Forte',
    ('Honda', 'Accord'):         'Honda Accord',
    ('Toyota', 'RAV4'):          'Toyota RAV4',
    ('Honda', 'CR-V'):           'Honda CR-V',
    ('Nissan', 'Rogue'):         'Nissan Rogue',
    ('Hyundai', 'Tucson'):       'Hyundai Tucson',
    ('Kia', 'Sportage'):         'Kia Sportage',
    ('Ford', 'Escape'):          'Ford Escape',
    ('Chevrolet', 'Equinox'):    'Chevrolet Equinox',
    ('Toyota', 'Highlander'):    'Toyota Highlander',
    ('Ford', 'Explorer'):        'Ford Explorer',
    ('Chevrolet', 'Traverse'):   'Chevrolet Traverse',
    ('Chrysler', 'Pacifica'):    'Chrysler Pacifica',
    ('Honda', 'Odyssey'):        'Honda Odyssey',
    ('BMW', '5 Series'):         'BMW 5 Series',
    ('Mercedes-Benz', 'E-Class'):'Mercedes-Benz E-Class',
    ('Lexus', 'ES 350'):         'Lexus ES 350',
}
for (make, model), key in MAKE_MODEL_LOOKUP.items():
    URLs = URL_MAP_RAW.get(key, [])
    if URLs:
        URL_MAP[(make, model)] = URLs

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print('='*60)
    print('PCR Booking — Photo Upload Script')
    print('='*60)

    # 1. Fetch all vehicles
    vehicles = sb_get('vehicles', f'?operator_id=eq.{OPERATOR_ID}&select=id,make,model,year,color&limit=100')
    print(f'\nVehicles: {len(vehicles)}')

    # 2. Fetch existing photos
    vids = ','.join(v['id'] for v in vehicles)
    existing_photos = sb_get('vehicle_photos', f'?vehicle_id=in.({vids})&select=id,vehicle_id,is_primary,sort_order&limit=500')

    has_photos = set()
    missing_primary = set()
    for p in existing_photos:
        has_photos.add(p['vehicle_id'])
    
    # Check primary flags
    vid_primaries = {}
    for p in existing_photos:
        vid = p['vehicle_id']
        if p['is_primary']:
            vid_primaries[vid] = True
    for vid in has_photos:
        if vid not in vid_primaries:
            missing_primary.add(vid)

    print(f'Already have photos: {len(has_photos)}/34')
    print(f'Missing primary flag: {len(missing_primary)}')

    # 3. Fix missing primary flags
    for vid in missing_primary:
        # Set first photo as primary
        photos = [p for p in existing_photos if p['vehicle_id'] == vid]
        photos.sort(key=lambda p: p['sort_order'])
        if photos:
            try:
                sb_patch('vehicle_photos', f'?id=eq.{photos[0]["id"]}', {'is_primary': True})
                print(f'  Fixed primary for vehicle {vid[:8]}...')
            except Exception as e:
                print(f'  Fix error: {e}')

    # 4. Upload photos for vehicles without any
    to_process = [v for v in vehicles if v['id'] not in has_photos]
    print(f'\nVehicles needing photos: {len(to_process)}')

    photos_inserted = 0
    vehicles_done = 0

    for v in to_process:
        vid = v['id']
        key = (v['make'], v['model'])
        photo_urls = URL_MAP.get(key, [])

        if not photo_urls:
            print(f'  SKIP {v["year"]} {v["make"]} {v["model"]} — no URL found')
            continue

        print(f'\n  {v["year"]} {v["color"]} {v["make"]} {v["model"]} ({len(photo_urls)} URLs)')

        inserted_count = 0
        for i, photo_url in enumerate(photo_urls[:5]):
            label = PHOTO_LABELS[i] if i < len(PHOTO_LABELS) else f'Photo {i+1}'
            is_primary = (i == 0)
            sort_order = i

            # Download
            img_data, ct = download_image(photo_url)
            if not img_data:
                print(f'    [{i}] Download failed, skipping')
                continue

            # Determine extension
            ext = '.jpg'
            if 'png' in (ct or ''):
                ext = '.png'
            elif 'webp' in (ct or ''):
                ext = '.webp'

            # Upload to Storage
            storage_path = f'{OPERATOR_ID}/{vid}/{i:02d}_{label.lower().replace(" ","_").replace("/","_")}{ext}'
            public_url = storage_upload(BUCKET, storage_path, img_data, ct or 'image/jpeg')

            if not public_url:
                print(f'    [{i}] Upload failed')
                continue

            # Insert DB row
            row = {
                'vehicle_id': vid,
                'url': public_url,
                'label': label,
                'is_primary': is_primary,
                'sort_order': sort_order,
            }
            try:
                sb_post('vehicle_photos', row)
                photos_inserted += 1
                inserted_count += 1
                print(f'    ✓ [{i}] {label} ({len(img_data)//1024}KB)')
            except Exception as e:
                print(f'    ✗ DB insert: {e}')

            time.sleep(0.3)

        if inserted_count > 0:
            vehicles_done += 1
        
        time.sleep(0.3)

    print(f'\nUpload complete: {photos_inserted} photos, {vehicles_done} vehicles')

    # 5. Final verification
    print('\n── Final Verification ──')
    final_photos = sb_get('vehicle_photos', f'?vehicle_id=in.({vids})&select=vehicle_id,url,is_primary,sort_order&limit=500')

    vid_photo_map = {}
    for p in final_photos:
        vid = p['vehicle_id']
        if vid not in vid_photo_map:
            vid_photo_map[vid] = []
        vid_photo_map[vid].append(p)

    covered = sum(1 for v in vehicles if v['id'] in vid_photo_map)
    print(f'Vehicles with photos: {covered}/34')
    print(f'Total photo rows: {len(final_photos)}')

    # Primary check
    no_primary = []
    multi_primary = []
    for vid, photos in vid_photo_map.items():
        prims = [p for p in photos if p['is_primary']]
        if not prims:
            no_primary.append(vid)
        elif len(prims) > 1:
            multi_primary.append(vid)

    if no_primary:
        print(f'WARNING: {len(no_primary)} vehicles missing primary flag — fixing...')
        for vid in no_primary:
            photos = sorted(vid_photo_map[vid], key=lambda p: p['sort_order'])
            try:
                sb_patch('vehicle_photos', f'?id=eq.{photos[0]["id"]}', {'is_primary': True})
                print(f'  Fixed: {vid[:8]}')
            except Exception as e:
                print(f'  Fix error: {e}')
    else:
        print('Primary flags: ✓ all correct')

    if multi_primary:
        print(f'WARNING: {len(multi_primary)} vehicles have multiple primaries')

    # URL checks
    print('\nSample URL checks (4 random vehicles):')
    import random
    sample = random.sample([v for v in vehicles if v['id'] in vid_photo_map], min(4, covered))
    for v in sample:
        photos = vid_photo_map[v['id']]
        primary = next((p for p in photos if p['is_primary']), photos[0])
        url = primary['url']
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'PCRDemo/1.0'})
            with urllib.request.urlopen(req, timeout=12) as r:
                ct = r.headers.get('content-type', '')
                size = len(r.read())
            ok = 'image' in ct
            print(f'  {"✓" if ok else "✗"} {v["year"]} {v["make"]} {v["model"]}: HTTP 200, {ct}, {size//1024}KB')
        except Exception as e:
            print(f'  ✗ {v["year"]} {v["make"]} {v["model"]}: {e}')

    # Vehicles still without photos
    no_photos = [v for v in vehicles if v['id'] not in vid_photo_map]
    if no_photos:
        print(f'\nStill missing photos ({len(no_photos)} vehicles):')
        for v in no_photos:
            print(f'  - {v["year"]} {v["make"]} {v["model"]}')

    print('\n' + '='*60)
    print(f'DONE — {covered}/34 vehicles have photos')
    print('='*60)

if __name__ == '__main__':
    main()
