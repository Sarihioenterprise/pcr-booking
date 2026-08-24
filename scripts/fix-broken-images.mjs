/**
 * fix-broken-images.mjs
 * Fix the vehicles whose photo_url is returning 400/broken.
 * Uses Wikimedia Commons generator search to get REAL file URLs.
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

// Cars with broken/400 URLs that need fixing
const BROKEN_MODELS = [
  { make: 'Nissan',     model: 'Sentra' },
  { make: 'Nissan',     model: 'Altima' },
  { make: 'Chevrolet',  model: 'Malibu' },
  { make: 'Honda',      model: 'Accord' },
  { make: 'Toyota',     model: 'Camry' },
  { make: 'Kia',        model: 'Sportage' },
  { make: 'Chevrolet',  model: 'Equinox' },
  { make: 'Ford',       model: 'Explorer' },
  { make: 'Toyota',     model: 'RAV4' },
  { make: 'Honda',      model: 'CR-V' },
  { make: 'Toyota',     model: 'Corolla' },
  { make: 'Honda',      model: 'Odyssey' },
  { make: 'Chrysler',   model: 'Pacifica' },
  { make: 'Nissan',     model: 'Rogue' },
  { make: 'Ford',       model: 'Escape' },
  { make: 'Kia',        model: 'K5' },
  { make: 'Ford',       model: 'Fusion' },
  { make: 'Toyota',     model: 'Highlander' },
  { make: 'Chevrolet',  model: 'Traverse' },
];

// Good search terms for each model
const SEARCH_TERMS = {
  'Nissan|Sentra':      ['2020 Nissan Sentra sedan exterior', 'Nissan Sentra sedan'],
  'Nissan|Altima':      ['2022 Nissan Altima sedan exterior', 'Nissan Altima sedan'],
  'Chevrolet|Malibu':   ['2019 Chevrolet Malibu sedan', 'Chevrolet Malibu sedan'],
  'Honda|Accord':       ['2023 Honda Accord sedan exterior', 'Honda Accord sedan'],
  'Toyota|Camry':       ['2022 Toyota Camry sedan exterior', 'Toyota Camry sedan'],
  'Kia|Sportage':       ['2022 Kia Sportage SUV exterior', 'Kia Sportage'],
  'Chevrolet|Equinox':  ['2022 Chevrolet Equinox SUV exterior', 'Chevrolet Equinox'],
  'Ford|Explorer':      ['2020 Ford Explorer SUV exterior', 'Ford Explorer'],
  'Toyota|RAV4':        ['2021 Toyota RAV4 SUV exterior', 'Toyota RAV4'],
  'Honda|CR-V':         ['2023 Honda CR-V SUV exterior', 'Honda CR-V'],
  'Toyota|Corolla':     ['2022 Toyota Corolla sedan exterior', 'Toyota Corolla'],
  'Honda|Odyssey':      ['2021 Honda Odyssey minivan exterior', 'Honda Odyssey'],
  'Chrysler|Pacifica':  ['2022 Chrysler Pacifica minivan exterior', 'Chrysler Pacifica'],
  'Nissan|Rogue':       ['2021 Nissan Rogue SUV exterior', 'Nissan Rogue'],
  'Ford|Escape':        ['2020 Ford Escape SUV exterior', 'Ford Escape'],
  'Kia|K5':             ['2022 Kia K5 sedan exterior', 'Kia K5'],
  'Ford|Fusion':        ['2019 Ford Fusion sedan exterior', 'Ford Fusion'],
  'Toyota|Highlander':  ['2022 Toyota Highlander SUV exterior', 'Toyota Highlander'],
  'Chevrolet|Traverse': ['2022 Chevrolet Traverse SUV exterior', 'Chevrolet Traverse'],
};

async function searchWikimediaForJpeg(queries) {
  for (const q of queries) {
    try {
      // Use generator=search to find files AND get their imageinfo in one request
      const url = `https://commons.wikimedia.org/w/api.php?` + new URLSearchParams({
        action: 'query',
        generator: 'search',
        gsrsearch: q,
        gsrnamespace: '6',
        gsrlimit: '10',
        prop: 'imageinfo',
        iiprop: 'url|mime|size',
        iilimit: '1',
        format: 'json',
        origin: '*',
      });

      const resp = await fetch(url, { headers: { 'User-Agent': 'PCRBookingFleetFixer/1.0' } });
      if (!resp.ok) continue;
      const data = await resp.json();

      const pages = Object.values(data.query?.pages || {});
      
      // Filter for JPEG images that are landscape-ish and not too tiny
      for (const page of pages) {
        const ii = page.imageinfo?.[0];
        if (!ii) continue;
        if (ii.mime !== 'image/jpeg' && ii.mime !== 'image/png') continue;
        if (ii.size < 50000) continue; // skip tiny images < 50KB
        if (ii.width < 400 || ii.height < 200) continue; // skip non-landscape
        
        // Skip interior shots, logos, badges
        const title = page.title.toLowerCase();
        if (/interior|engine|badge|emblem|logo|wheel|door|seat|dash|steering|cabin|luggage|trunk|rear seat/.test(title)) continue;
        
        const fileUrl = ii.url;
        if (!fileUrl) continue;
        
        // Verify it loads
        try {
          const headResp = await fetch(fileUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
          if (headResp.ok) {
            console.log(`    Found: ${page.title.slice(5, 70)}`);
            return fileUrl;
          }
        } catch {}
      }
    } catch (e) {
      console.warn(`    Search error for "${q}": ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }
  return null;
}

async function main() {
  console.log('\n=== Fix Broken Car Images ===\n');

  const imageMap = {};

  for (const { make, model } of BROKEN_MODELS) {
    const key = `${make}|${model}`;
    console.log(`\nSearching for ${make} ${model}...`);
    
    const queries = SEARCH_TERMS[key] || [`${make} ${model} exterior`];
    const url = await searchWikimediaForJpeg(queries);
    
    if (url) {
      imageMap[key] = url;
      console.log(`  ✓ ${url.slice(0, 90)}`);
    } else {
      console.warn(`  ✗ Could not find image for ${make} ${model}`);
    }
  }

  console.log('\n\n=== Updating DB ===\n');

  // Fetch all vehicles
  const { data: vehicles } = await sb.from('vehicles').select('id, make, model, year, photo_url');

  let updated = 0;
  let failed = [];

  for (const v of vehicles) {
    const key = `${v.make}|${v.model}`;
    const newUrl = imageMap[key];
    if (!newUrl) continue; // not in our fix list

    const { error } = await sb.from('vehicles').update({ photo_url: newUrl }).eq('id', v.id);
    if (error) {
      console.error(`  ✗ ${v.make} ${v.model} ${v.year}: ${error.message}`);
      failed.push(v);
    } else {
      updated++;
      console.log(`  ✓ ${v.make} ${v.model} ${v.year} (${v.id.slice(0,8)})`);
    }
  }

  console.log(`\n  Updated: ${updated} vehicles`);
  if (failed.length) console.log(`  Failed: ${failed.length}`);

  // Final verification
  console.log('\n=== Final URL Verification ===\n');
  const { data: final } = await sb.from('vehicles').select('id, make, model, year, photo_url');
  const seen = new Set();
  const uniq = final.filter(v => { if(seen.has(v.photo_url)) return false; seen.add(v.photo_url); return true; });

  let okCount = 0, failCount = 0;
  for (const v of uniq) {
    const status = await (async () => {
      try {
        const r = await fetch(v.photo_url, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
        return r.ok ? 'OK' : String(r.status);
      } catch { return 'ERR'; }
    })();
    
    const icon = status === 'OK' ? '✅' : '❌';
    console.log(`  ${icon} [${status}] ${v.make} ${v.model} ${v.year}`);
    if (status === 'OK') okCount++; else failCount++;
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n  ✅ Working: ${okCount}/${uniq.length} unique URLs`);
  console.log(`  ❌ Broken:  ${failCount}/${uniq.length} unique URLs`);
  console.log('\n=== Done ===\n');
}

main().catch(console.error);
