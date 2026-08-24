#!/usr/bin/env python3
"""
Photo upload v2: converts Wikimedia URLs to 1280px thumbnails, adds proper delays.
Processes the 24 vehicles that are still missing photos.
"""
import re, json, time, os, urllib.request, urllib.error, urllib.parse

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
        print(f'  Upload error {e.code}: {e.read()[:80]}')
        return None

def normalize_wikimedia_url(url, width=1280):
    """Convert any Wikimedia URL to a properly-sized thumbnail URL."""
    # Remove tracking params
    url = url.split('?')[0].strip()
    
    # Case 1: Already a thumb URL with some size → replace size
    # Format: .../commons/thumb/X/XX/filename.jpg/NNNNpx-filename.jpg
    m = re.match(r'(https://upload\.wikimedia\.org/wikipedia/commons/thumb/[^/]+/[^/]+/[^/]+)/(\d+px-.+)', url)
    if m:
        base_path = m.group(1)
        old_sized = m.group(2)
        fname = re.sub(r'^\d+px-', '', old_sized)
        return f'{base_path}/{width}px-{fname}'
    
    # Case 2: Full original URL (no /thumb/)
    # Format: .../commons/X/XX/filename.jpg
    m = re.match(r'(https://upload\.wikimedia\.org/wikipedia/commons/[^/]+/[^/]+/)(.+)', url)
    if m:
        dir_path = m.group(1)
        fname_encoded = m.group(2)
        # Construct thumb URL - need to insert /thumb/ before the hash
        # .../commons/X/XX/filename → .../commons/thumb/X/XX/filename/1280px-filename
        parts = dir_path.rstrip('/').split('/commons/')[1].split('/')
        a, ab = parts[0], parts[1]
        return f'https://upload.wikimedia.org/wikipedia/commons/thumb/{a}/{ab}/{fname_encoded}/{width}px-{fname_encoded}'
    
    return url  # fallback: return unchanged

def download_image_with_retry(url, max_retries=3, delay=5):
    """Download a Wikimedia image at thumbnail size with proper delays and retries."""
    thumb_url = normalize_wikimedia_url(url, width=1280)
    
    for attempt in range(max_retries):
        if attempt > 0:
            wait = delay * (2 ** attempt)
            print(f'    Retry {attempt} in {wait}s...')
            time.sleep(wait)
        
        req = urllib.request.Request(
            thumb_url,
            headers={
                'User-Agent': 'PCRBookingDemo/1.0 (pcrbooking.com; media-seeding)',
                'Accept': 'image/jpeg,image/png,image/*,*/*',
                'Accept-Encoding': 'identity',
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                ct = r.headers.get('content-type', 'image/jpeg').split(';')[0].strip()
                data = r.read()
                if len(data) < 5000:
                    print(f'    Too small ({len(data)}B) — skipping')
                    return None, None
                return data, ct
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f'    429 rate limited (attempt {attempt+1}/{max_retries})')
            else:
                print(f'    HTTP {e.code}: {e.reason}')
                return None, None
        except Exception as e:
            print(f'    Error: {e}')
            return None, None
    
    return None, None

# Load URL map
with open('/tmp/car_photo_urls.json') as f:
    URL_MAP_RAW = json.load(f)

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

URL_MAP = {}
for (make, model), key in MAKE_MODEL_LOOKUP.items():
    urls = URL_MAP_RAW.get(key, [])
    if urls:
        URL_MAP[(make, model)] = urls

def main():
    print('='*60)
    print('PCR Booking — Photo Upload v2 (Thumbnail URLs + Backoff)')
    print('='*60)

    # Verify URL conversion
    print('\nTest URL normalization:')
    for key, urls in list(URL_MAP.items())[:2]:
        for u in urls[:1]:
            normalized = normalize_wikimedia_url(u)
            print(f'  {key[1]}: {normalized[60:110]}')

    # Fetch vehicles
    vehicles = sb_get('vehicles', f'?operator_id=eq.{OPERATOR_ID}&select=id,make,model,year,color&limit=100')
    vids = ','.join(v['id'] for v in vehicles)

    # Check which have photos
    existing = sb_get('vehicle_photos', f'?vehicle_id=in.({vids})&select=vehicle_id,id,is_primary,sort_order&limit=500')
    has_photos = set(p['vehicle_id'] for p in existing)
    
    print(f'\nVehicles with photos: {len(has_photos)}/34')
    to_process = [v for v in vehicles if v['id'] not in has_photos]
    print(f'To process: {len(to_process)} vehicles')

    photos_inserted = 0
    vehicles_done = 0
    INTER_DOWNLOAD_DELAY = 6  # seconds between downloads to respect rate limits

    for v_idx, v in enumerate(to_process):
        vid = v['id']
        key = (v['make'], v['model'])
        photo_urls = URL_MAP.get(key, [])

        if not photo_urls:
            print(f'\n  [{v_idx+1}/{len(to_process)}] SKIP {v["year"]} {v["make"]} {v["model"]} — no URLs')
            continue

        print(f'\n  [{v_idx+1}/{len(to_process)}] {v["year"]} {v["color"]} {v["make"]} {v["model"]}')

        inserted = 0
        for i, photo_url in enumerate(photo_urls[:3]):
            label = PHOTO_LABELS[i]
            is_primary = (i == 0)

            # Wait between downloads
            if i > 0 or v_idx > 0 or inserted > 0:
                print(f'    Waiting {INTER_DOWNLOAD_DELAY}s before download...')
                time.sleep(INTER_DOWNLOAD_DELAY)

            img_data, ct = download_image_with_retry(photo_url, max_retries=2, delay=8)
            if not img_data:
                continue

            ext = '.jpg'
            if 'png' in (ct or ''): ext = '.png'

            storage_path = f'{OPERATOR_ID}/{vid}/{i:02d}_{label.lower().replace(" ","_").replace("/","_")}{ext}'
            public_url = storage_upload(BUCKET, storage_path, img_data, ct or 'image/jpeg')

            if not public_url:
                continue

            try:
                sb_post('vehicle_photos', {
                    'vehicle_id': vid, 'url': public_url,
                    'label': label, 'is_primary': is_primary, 'sort_order': i,
                })
                photos_inserted += 1
                inserted += 1
                print(f'    ✓ [{i}] {label} ({len(img_data)//1024}KB)')
            except Exception as e:
                print(f'    ✗ DB error: {e}')

        if inserted > 0:
            vehicles_done += 1

    print(f'\n\nResults: {photos_inserted} photos inserted, {vehicles_done} vehicles done')

    # Final verification
    print('\n── Verification ──')
    final = sb_get('vehicle_photos', f'?vehicle_id=in.({vids})&select=vehicle_id,url,is_primary,sort_order&limit=500')
    vid_map = {}
    for p in final:
        vid_map.setdefault(p['vehicle_id'], []).append(p)

    covered = sum(1 for v in vehicles if v['id'] in vid_map)
    print(f'Vehicles with photos: {covered}/34')
    print(f'Total photo rows: {len(final)}')

    # Fix any remaining missing primaries
    fixed = 0
    for vid, photos in vid_map.items():
        if not any(p['is_primary'] for p in photos):
            photos.sort(key=lambda p: p['sort_order'])
            try:
                sb_patch('vehicle_photos', f'?id=eq.{photos[0]["id"]}', {'is_primary': True})
                fixed += 1
            except: pass
    if fixed:
        print(f'Fixed primary flags: {fixed}')

    # Sample URL checks
    import random
    print('\nSample URL checks:')
    sample_vids = [v for v in vehicles if v['id'] in vid_map]
    # Pick varied sample
    sample = sample_vids[:2] + sample_vids[-2:] if len(sample_vids) >= 4 else sample_vids[:4]
    for v in sample:
        photos = vid_map[v['id']]
        primary = next((p for p in photos if p['is_primary']), photos[0])
        try:
            req = urllib.request.Request(primary['url'], headers={'User-Agent': 'PCRDemo/1.0'})
            with urllib.request.urlopen(req, timeout=12) as r:
                ct = r.headers.get('content-type', '')
                size = len(r.read())
            print(f'  ✓ {v["year"]} {v["make"]} {v["model"]}: HTTP 200, {ct[:25]}, {size//1024}KB')
        except Exception as e:
            print(f'  ✗ {v["year"]} {v["make"]} {v["model"]}: {e}')

    # Still missing
    missing = [v for v in vehicles if v['id'] not in vid_map]
    if missing:
        print(f'\nStill missing ({len(missing)}):')
        for v in missing:
            print(f'  - {v["year"]} {v["make"]} {v["model"]}')

    print(f'\n{"="*60}')
    print(f'DONE — {covered}/34 vehicles have photos')
    print(f'{"="*60}')

if __name__ == '__main__':
    main()
