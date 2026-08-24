/**
 * fix-images-v3.mjs
 * 
 * Strategy: Wikipedia's pageimages API returns the EXACT thumbnail URL
 * for each article (with correct filename + pixel dimensions).
 * These URLs work reliably when utm params are stripped.
 * 
 * For cars without a pageimage, we try alternative article titles.
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

// Wikipedia article titles to try for each make+model.
// Multiple titles tried in order until one has a pageimage.
const WIKI_ARTICLES = {
  'Toyota|Camry':       ['Toyota_Camry'],
  'Toyota|Corolla':     ['Toyota_Corolla', 'Toyota_Corolla_(E210)'],
  'Toyota|RAV4':        ['Toyota_RAV4'],
  'Toyota|Highlander':  ['Toyota_Highlander'],
  'Honda|Civic':        ['Honda_Civic_(eleventh_generation)', 'Honda_Civic'],
  'Honda|Accord':       ['Honda_Accord', 'Honda_Accord_(tenth_generation)', 'Honda_Accord_(ninth_generation)'],
  'Honda|CR-V':         ['Honda_CR-V'],
  'Honda|Odyssey':      ['Honda_Odyssey_(North_America)', 'Honda_Odyssey'],
  'Nissan|Altima':      ['Nissan_Altima'],
  'Nissan|Sentra':      ['Nissan_Sentra', 'Nissan_Sentra_(B17)'],
  'Nissan|Rogue':       ['Nissan_Rogue'],
  'Chevrolet|Malibu':   ['Chevrolet_Malibu'],
  'Chevrolet|Equinox':  ['Chevrolet_Equinox'],
  'Chevrolet|Traverse': ['Chevrolet_Traverse'],
  'Hyundai|Elantra':    ['Hyundai_Elantra'],
  'Hyundai|Tucson':     ['Hyundai_Tucson'],
  'Kia|Forte':          ['Kia_Forte'],
  'Kia|K5':             ['Kia_K5'],
  'Kia|Sportage':       ['Kia_Sportage'],
  'Ford|Fusion':        ['Ford_Fusion_(Americas)', 'Ford_Fusion'],
  'Ford|Explorer':      ['Ford_Explorer'],
  'Ford|Escape':        ['Ford_Escape'],
  'Chrysler|Pacifica':  ['Chrysler_Pacifica', 'Chrysler_Pacifica_(minivan)'],
};

function stripUtmParams(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete('utm_source');
    u.searchParams.delete('utm_campaign');
    u.searchParams.delete('utm_content');
    return u.toString();
  } catch {
    return url;
  }
}

async function getPageImageUrl(articleTitle) {
  const url = `https://en.wikipedia.org/w/api.php?` + new URLSearchParams({
    action: 'query',
    titles: articleTitle,
    prop: 'pageimages',
    pithumbsize: '960',
    pilicense: 'any',
    format: 'json',
    origin: '*',
  });

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'PCRBookingFleetFixer/1.0 (demo@pcrbooking.com)' }
  });
  if (!resp.ok) return null;

  const data = await resp.json();
  const pages = Object.values(data.query?.pages || {});
  const page = pages[0];

  if (!page || page.missing || !page.thumbnail?.source) return null;

  return stripUtmParams(page.thumbnail.source);
}

async function getImageForModel(make, model) {
  const key = `${make}|${model}`;
  const articles = WIKI_ARTICLES[key] || [`${make}_${model}`];

  for (const article of articles) {
    const url = await getPageImageUrl(article);
    if (url) {
      console.log(`    → [${article}] ${url.slice(0, 90)}`);
      return url;
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.warn(`    ✗ No pageimage found for any article tried`);
  return null;
}

async function verifyUrl(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
    return r.ok ? 'OK' : String(r.status);
  } catch { return 'ERR'; }
}

async function main() {
  console.log('\n=== Fix Car Images v3 — Wikipedia pageimages API ===\n');

  // Get all unique make+model combos from DB
  const { data: vehicles, error } = await sb.from('vehicles').select('id, make, model, year, photo_url');
  if (error) { console.error('DB error:', error); process.exit(1); }
  console.log(`Loaded ${vehicles.length} vehicles\n`);

  const uniqueKeys = [...new Set(vehicles.map(v => `${v.make}|${v.model}`))];

  // Build image map
  const imageMap = {};
  for (const key of uniqueKeys) {
    const [make, model] = key.split('|');
    console.log(`Fetching image for ${make} ${model}...`);
    const url = await getImageForModel(make, model);
    if (url) imageMap[key] = url;
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nFound images for ${Object.keys(imageMap).length}/${uniqueKeys.length} models\n`);

  // Update ALL vehicles
  console.log('Updating DB...\n');
  let updated = 0, noImage = 0;

  for (const v of vehicles) {
    const key = `${v.make}|${v.model}`;
    const newUrl = imageMap[key];
    if (!newUrl) { noImage++; continue; }

    const { error } = await sb.from('vehicles').update({ photo_url: newUrl }).eq('id', v.id);
    if (error) {
      console.error(`  ✗ ${v.make} ${v.model} ${v.year}: ${error.message}`);
    } else {
      updated++;
      console.log(`  ✓ ${v.make} ${v.model} ${v.year} (${v.id.slice(0,8)})`);
    }
  }

  console.log(`\nUpdated: ${updated} | No image: ${noImage}\n`);

  // Verify final URLs
  console.log('=== Final URL Verification ===\n');
  const { data: final } = await sb.from('vehicles').select('id, make, model, year, photo_url').order('category').order('make');

  const seen = new Set();
  const uniq = final.filter(v => { if (seen.has(v.photo_url)) return false; seen.add(v.photo_url); return true; });

  let okCount = 0, failCount = 0;

  for (const v of uniq) {
    const status = await verifyUrl(v.photo_url || '');
    const icon = status === 'OK' ? '✅' : '❌';
    const label = `${v.make} ${v.model}`;
    console.log(`  ${icon} [${String(status).padEnd(3)}] ${label.padEnd(25)}`);
    if (status === 'OK') okCount++; else failCount++;
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n  ✅ Working: ${okCount}/${uniq.length}`);
  console.log(`  ❌ Broken:  ${failCount}/${uniq.length}`);

  // Final summary
  console.log('\n=== Complete Vehicle List ===\n');
  console.log('  Category   Make+Model                Year  Image');
  console.log('  ' + '─'.repeat(65));
  const { data: allV } = await sb.from('vehicles').select('id, make, model, year, category, photo_url').order('category').order('make').order('model').order('year');
  for (const v of allV) {
    const hasPhoto = v.photo_url && !v.photo_url.startsWith('blob:');
    const icon = hasPhoto ? '✅' : '❌';
    const label = `${v.make} ${v.model}`.padEnd(25);
    console.log(`  [${v.category.padEnd(7)}] ${label} ${v.year}  ${icon}`);
  }

  console.log('\n=== Done ===\n');
}

main().catch(console.error);
