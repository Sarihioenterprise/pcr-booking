/**
 * fix-demo-fleet.mjs
 * 1. Replace 4 luxury cars with economy sedans
 * 2. Normalize "Chevy" → "Chevrolet" and "NISSAN SENTRA" → proper casing
 * 3. Find correct image URLs (Wikipedia REST API thumbnails) for every unique make+model
 * 4. Update ALL vehicles' photo_url to a correct, matching image
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Wikipedia article titles to try for each make+model ────────────────────
// The Wikipedia REST API /page/summary/{title} returns thumbnail.source which
// is the main "hero" image for the article — perfect for car photos.
const WIKI_ARTICLES = {
  'Toyota|Camry':          ['Toyota_Camry'],
  'Toyota|Corolla':        ['Toyota_Corolla_(E210)', 'Toyota_Corolla'],
  'Toyota|RAV4':           ['Toyota_RAV4'],
  'Toyota|Highlander':     ['Toyota_Highlander'],
  'Honda|Civic':           ['Honda_Civic_(eleventh_generation)', 'Honda_Civic'],
  'Honda|Accord':          ['Honda_Accord_(eleventh_generation)', 'Honda_Accord'],
  'Honda|CR-V':            ['Honda_CR-V'],
  'Honda|Odyssey':         ['Honda_Odyssey_(North_America)', 'Honda_Odyssey'],
  'Nissan|Altima':         ['Nissan_Altima'],
  'Nissan|Sentra':         ['Nissan_Sentra_(B18)', 'Nissan_Sentra'],
  'Nissan|Rogue':          ['Nissan_Rogue'],
  'Chevrolet|Malibu':      ['Chevrolet_Malibu'],
  'Chevrolet|Equinox':     ['Chevrolet_Equinox'],
  'Chevrolet|Traverse':    ['Chevrolet_Traverse'],
  'Hyundai|Elantra':       ['Hyundai_Elantra'],
  'Hyundai|Tucson':        ['Hyundai_Tucson'],
  'Kia|Forte':             ['Kia_Forte'],
  'Kia|K5':                ['Kia_K5'],
  'Kia|Sportage':          ['Kia_Sportage'],
  'Ford|Fusion':           ['Ford_Fusion_(Americas)', 'Ford_Fusion'],
  'Ford|Explorer':         ['Ford_Explorer'],
  'Ford|Escape':           ['Ford_Escape'],
  'Chrysler|Pacifica':     ['Chrysler_Pacifica_(minivan)', 'Chrysler_Pacifica'],
};

// ─── Fallback hardcoded URLs (used if Wikipedia returns nothing usable) ────
const FALLBACK_URLS = {
  'Toyota|Camry':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/2021_Toyota_Camry_SE_in_Silver%2C_front_8.14.19.jpg/800px-2021_Toyota_Camry_SE_in_Silver%2C_front_8.14.19.jpg',
  'Toyota|Corolla':     'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/2019_Toyota_Corolla_sedan_%28facelift%2C_white%29%2C_front_8.28.19.jpg/800px-2019_Toyota_Corolla_sedan_%28facelift%2C_white%29%2C_front_8.28.19.jpg',
  'Toyota|RAV4':        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/2019_Toyota_RAV4_Adventure_in_Lunar_Rock.jpg/800px-2019_Toyota_RAV4_Adventure_in_Lunar_Rock.jpg',
  'Toyota|Highlander':  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/2020_Toyota_Highlander_Hybrid_Limited_Platinum_in_Blizzard_Pearl.jpg/800px-2020_Toyota_Highlander_Hybrid_Limited_Platinum_in_Blizzard_Pearl.jpg',
  'Honda|Civic':        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/2022_Honda_Civic_Sport_in_Aegean_Blue%2C_front_8.26.22.jpg/800px-2022_Honda_Civic_Sport_in_Aegean_Blue%2C_front_8.26.22.jpg',
  'Honda|Accord':       'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/2023_Honda_Accord_Sport_in_Sonic_Gray_Pearl%2C_front_8.19.22.jpg/800px-2023_Honda_Accord_Sport_in_Sonic_Gray_Pearl%2C_front_8.19.22.jpg',
  'Honda|CR-V':         'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/2023_Honda_CR-V_Sport_in_Sonic_Gray_Pearl%2C_front_8.26.22.jpg/800px-2023_Honda_CR-V_Sport_in_Sonic_Gray_Pearl%2C_front_8.26.22.jpg',
  'Honda|Odyssey':      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/2018_Honda_Odyssey_EX-L_in_Lunar_Silver_Metallic%2C_front_5.30.19.jpg/800px-2018_Honda_Odyssey_EX-L_in_Lunar_Silver_Metallic%2C_front_5.30.19.jpg',
  'Nissan|Altima':      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/2019_Nissan_Altima_SV_in_Brilliant_Silver%2C_front_8.27.19.jpg/800px-2019_Nissan_Altima_SV_in_Brilliant_Silver%2C_front_8.27.19.jpg',
  'Nissan|Sentra':      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/2020_Nissan_Sentra_SR_in_Super_Black%2C_front_10.3.19.jpg/800px-2020_Nissan_Sentra_SR_in_Super_Black%2C_front_10.3.19.jpg',
  'Nissan|Rogue':       'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/2021_Nissan_Rogue_SL_AWD_in_Gun_Metallic%2C_front_8.5.20.jpg/800px-2021_Nissan_Rogue_SL_AWD_in_Gun_Metallic%2C_front_8.5.20.jpg',
  'Chevrolet|Malibu':   'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/2019_Chevrolet_Malibu_LT_in_Silver_Ice_Metallic%2C_front_8.15.19.jpg/800px-2019_Chevrolet_Malibu_LT_in_Silver_Ice_Metallic%2C_front_8.15.19.jpg',
  'Chevrolet|Equinox':  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/2022_Chevrolet_Equinox_LT_in_Silver_Ice_Metallic%2C_front_3.22.22.jpg/800px-2022_Chevrolet_Equinox_LT_in_Silver_Ice_Metallic%2C_front_3.22.22.jpg',
  'Chevrolet|Traverse': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/2022_Chevrolet_Traverse_LT_in_Iridescent_Pearl_Tricoat%2C_front_5.22.21.jpg/800px-2022_Chevrolet_Traverse_LT_in_Iridescent_Pearl_Tricoat%2C_front_5.22.21.jpg',
  'Hyundai|Elantra':    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/2021_Hyundai_Elantra_SE_in_Fluid_Silver%2C_front_8.25.20.jpg/800px-2021_Hyundai_Elantra_SE_in_Fluid_Silver%2C_front_8.25.20.jpg',
  'Hyundai|Tucson':     'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/2022_Hyundai_Tucson_SEL_in_Magnetic_Force%2C_front_4.22.21.jpg/800px-2022_Hyundai_Tucson_SEL_in_Magnetic_Force%2C_front_4.22.21.jpg',
  'Kia|Forte':          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/2019_Kia_Forte_GT_Line_in_Aurora_Black%2C_front_8.27.19.jpg/800px-2019_Kia_Forte_GT_Line_in_Aurora_Black%2C_front_8.27.19.jpg',
  'Kia|K5':             'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/2021_Kia_K5_LX_in_Aurora_Black%2C_front_8.24.20.jpg/800px-2021_Kia_K5_LX_in_Aurora_Black%2C_front_8.24.20.jpg',
  'Kia|Sportage':       'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/2022_Kia_Sportage_SX_Prestige_in_Runway_Red%2C_front_3.21.22.jpg/800px-2022_Kia_Sportage_SX_Prestige_in_Runway_Red%2C_front_3.21.22.jpg',
  'Ford|Fusion':        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/2017_Ford_Fusion_SE_EcoBoost_in_Oxford_White%2C_front_8.22.17.jpg/800px-2017_Ford_Fusion_SE_EcoBoost_in_Oxford_White%2C_front_8.22.17.jpg',
  'Ford|Explorer':      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/2020_Ford_Explorer_XLT_in_Star_White%2C_front_8.26.19.jpg/800px-2020_Ford_Explorer_XLT_in_Star_White%2C_front_8.26.19.jpg',
  'Ford|Escape':        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/2020_Ford_Escape_Titanium_4WD_in_Rapid_Red%2C_front_8.26.19.jpg/800px-2020_Ford_Escape_Titanium_4WD_in_Rapid_Red%2C_front_8.26.19.jpg',
  'Chrysler|Pacifica':  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/2022_Chrysler_Pacifica_Touring_in_Bright_White%2C_front_2.1.22.jpg/800px-2022_Chrysler_Pacifica_Touring_in_Bright_White%2C_front_2.1.22.jpg',
};

// ─── Fetch Wikipedia article thumbnail ───────────────────────────────────────
async function getWikiImage(make, model) {
  const key = `${make}|${model}`;
  const articles = WIKI_ARTICLES[key] || [];

  for (const article of articles) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${article}`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'PCRBookingDemoFleetFixer/1.0' } });
      if (!resp.ok) continue;
      const data = await resp.json();

      // Prefer the original image if available; resize via Wikipedia thumb path
      const src = data.originalimage?.source || data.thumbnail?.source;
      if (src && /\.(jpg|jpeg|png)/i.test(src)) {
        // Resize to 800px using Wikipedia's thumbnail URL pattern
        const resized = src.replace(/\/\d+px-([^/]+)$/, '/800px-$1');
        console.log(`  ✓ Wikipedia (${article}): ${resized.slice(0, 90)}...`);
        return resized;
      }
    } catch (e) {
      console.warn(`  Wiki fetch error for ${article}: ${e.message}`);
    }
  }

  // Fallback to hardcoded URL
  const fallback = FALLBACK_URLS[key];
  if (fallback) {
    console.log(`  ↩ Fallback URL for ${make} ${model}`);
    return fallback;
  }

  console.warn(`  ✗ No image found for ${make} ${model}`);
  return null;
}

// ─── Verify a URL is actually accessible ────────────────────────────────────
async function verifyUrl(url) {
  try {
    const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return resp.ok;
  } catch {
    return false;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== PCR Demo Fleet Fixer ===\n');

  // Step 1: Replace luxury cars with economy cars
  console.log('Step 1: Replacing luxury cars with economy cars...');
  const luxuryReplacements = [
    { id: 'df38542d-0240-422b-9d31-e5e002e22f7f', make: 'Toyota', model: 'Corolla', year: 2022 },
    { id: '0151397d-f7cf-4527-b60f-863d1e743ea3', make: 'Kia',    model: 'K5',      year: 2022 },
    { id: '526b2d88-e192-45af-819d-f28b12fa94de', make: 'Ford',   model: 'Fusion',   year: 2020 },
    { id: 'ea77752f-3d48-4aa4-b633-3274d66da97e', make: 'Honda',  model: 'Civic',    year: 2021 },
  ];

  for (const car of luxuryReplacements) {
    const { error } = await sb.from('vehicles').update({
      make: car.make, model: car.model, year: car.year, category: 'sedan', photo_url: null,
    }).eq('id', car.id);
    if (error) console.error(`  ✗ Failed to update ${car.id}:`, error.message);
    else console.log(`  ✓ ${car.id.slice(0,8)} → ${car.make} ${car.model} ${car.year}`);
  }

  // Step 2: Normalize "Chevy" → "Chevrolet" and "NISSAN SENTRA" casing
  console.log('\nStep 2: Normalizing make/model casing...');
  const normalizations = [
    { id: '8e61b62d-be26-457a-9a0f-7773f4ded641', make: 'Chevrolet', model: 'Malibu'  }, // was "Chevy"
    { id: '1c27ab6c-aa75-49bc-9b28-22681285eaee', make: 'Nissan',    model: 'Sentra'  }, // was "NISSAN"/"SENTRA"
    { id: '4ea05bcb-9e9f-4579-8185-23200e66a08b', make: 'Honda',     model: 'Civic'   }, // ensure casing
    { id: 'cea0add6-17ce-4874-b15e-d56909d91138', make: 'Honda',     model: 'Civic'   },
    { id: 'd7c776ab-2c5c-4b29-91da-7303e91da649', make: 'Honda',     model: 'Civic'   },
  ];
  for (const n of normalizations) {
    const { error } = await sb.from('vehicles').update({ make: n.make, model: n.model }).eq('id', n.id);
    if (error) console.error(`  ✗ Normalize ${n.id.slice(0,8)}:`, error.message);
    else console.log(`  ✓ Normalized ${n.id.slice(0,8)} → ${n.make} ${n.model}`);
  }

  // Step 3: Fetch current vehicle list (post-update make/models)
  console.log('\nStep 3: Fetching updated vehicle list...');
  const { data: vehicles, error: fetchError } = await sb.from('vehicles')
    .select('id, make, model, year, category, photo_url');
  if (fetchError) { console.error('Fatal: could not fetch vehicles:', fetchError.message); process.exit(1); }
  console.log(`  Loaded ${vehicles.length} vehicles.`);

  // Step 4: Build image URL map for each unique make+model
  console.log('\nStep 4: Building image URL map...');
  const uniqueMakeModels = [...new Set(vehicles.map(v => `${v.make}|${v.model}`))];
  const imageMap = {};

  for (const key of uniqueMakeModels) {
    const [make, model] = key.split('|');
    console.log(`\n  Fetching image for ${make} ${model}...`);
    const imgUrl = await getWikiImage(make, model);
    if (imgUrl) {
      // Verify the URL is accessible
      const ok = await verifyUrl(imgUrl);
      if (ok) {
        imageMap[key] = imgUrl;
        console.log(`  ✓ Verified: ${imgUrl.slice(0, 80)}...`);
      } else {
        console.warn(`  ✗ URL not accessible, trying fallback...`);
        const fallback = FALLBACK_URLS[key];
        if (fallback) {
          imageMap[key] = fallback;
          console.log(`  ↩ Using fallback`);
        }
      }
    }
    // Small delay to be kind to Wikipedia
    await new Promise(r => setTimeout(r, 300));
  }

  // Step 5: Update all vehicles with correct photo_url
  console.log('\nStep 5: Updating all vehicle photo_urls...');
  let updatedCount = 0;
  let skippedCount = 0;

  for (const v of vehicles) {
    const key = `${v.make}|${v.model}`;
    const newPhotoUrl = imageMap[key];

    if (!newPhotoUrl) {
      console.warn(`  ✗ No image for ${v.make} ${v.model} (${v.id.slice(0,8)}) — skipping`);
      skippedCount++;
      continue;
    }

    const { error } = await sb.from('vehicles').update({ photo_url: newPhotoUrl }).eq('id', v.id);
    if (error) {
      console.error(`  ✗ Update failed for ${v.id.slice(0,8)}:`, error.message);
    } else {
      updatedCount++;
      console.log(`  ✓ ${v.make} ${v.model} ${v.year} (${v.id.slice(0,8)})`);
    }
  }

  // Step 6: Final verification
  console.log('\nStep 6: Final verification...');
  const { data: finalVehicles, error: finalError } = await sb.from('vehicles')
    .select('id, make, model, year, category, photo_url')
    .order('category').order('make').order('model').order('year');

  if (finalError) { console.error('Verification fetch failed:', finalError.message); return; }

  const nullPhotos = finalVehicles.filter(v => !v.photo_url);
  const blobPhotos = finalVehicles.filter(v => v.photo_url?.startsWith('blob:'));
  const storagePhotos = finalVehicles.filter(v => v.photo_url?.includes('supabase.co/storage'));
  const wikiPhotos = finalVehicles.filter(v => v.photo_url?.includes('wikimedia.org'));

  console.log(`\n  Total vehicles:        ${finalVehicles.length}`);
  console.log(`  Wikipedia URLs:        ${wikiPhotos.length}`);
  console.log(`  Supabase storage URLs: ${storagePhotos.length} (still using old storage)`);
  console.log(`  Null photo_urls:       ${nullPhotos.length}`);
  console.log(`  Blob URLs (broken):    ${blobPhotos.length}`);
  console.log(`  Updated in this run:   ${updatedCount}`);
  console.log(`  Skipped (no image):    ${skippedCount}`);

  if (nullPhotos.length > 0) {
    console.log('\n  Vehicles still missing photos:');
    nullPhotos.forEach(v => console.log(`    - ${v.make} ${v.model} ${v.year} (${v.id})`));
  }

  console.log('\n  Final vehicle list:');
  console.log('  ──────────────────────────────────────────────────────────────');
  for (const v of finalVehicles) {
    const photoStatus = !v.photo_url ? '❌ NULL' : v.photo_url.startsWith('blob:') ? '🔴 BLOB' : v.photo_url.includes('wikimedia') ? '✅ Wiki' : '🟡 Other';
    console.log(`  [${v.category.padEnd(7)}] ${(v.make + ' ' + v.model).padEnd(25)} ${v.year}  ${photoStatus}`);
  }

  console.log('\n=== Done ===\n');
}

main().catch(console.error);
