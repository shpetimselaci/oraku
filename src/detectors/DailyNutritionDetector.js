// src/detectors/DailyNutritionDetector.js
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const NAME = 'DailyNutritionDetector';

// simple disk-backed cache for food lookups
const CACHE_PATH = path.resolve('output', 'nutrition_cache.json');
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')||'{}'); } catch {}

const BASE_NUTRIENT_REQUIREMENTS = [
  { label: "Vitamin A",   key: "vitamin-a" },
  { label: "Vitamin C",   key: "vitamin-c" },
  { label: "Vitamin D",   key: "vitamin-d" },
  { label: "Vitamin B12", key: "vitamin-b12" },
  { label: "Vitamin B6",  key: "vitamin-b6" },
  { label: "Calcium",     key: "calcium" },
  { label: "Iron",        key: "iron" },
  { label: "Potassium",   key: "potassium" },
  { label: "Magnesium",   key: "magnesium" },
  { label: "Zinc",        key: "zinc" },
  { label: "Protein",     key: "proteins" },
  { label: "Fiber",       key: "fiber" },
  { label: "Healthy Fats", key: "fat" },
  { label: "Energy",      key: "energy-kcal" }
];

module.exports = {
  name: NAME,
  dataSource: 'nutrition',

  async detect(entry) {
    const events = entry?.events || [];
    // Hardcode date check for testing if needed, otherwise matches today
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. IMPROVED EXTRACTION: Handle 'items' array OR 'log' string
    const todayFoods = events
      .filter(ev => {
        // Kjo rresht i pranon të dyja: edhe 'createdAt' edhe 'date'
        const dateVal = ev.createdAt || ev.date; 
        return dateVal && dateVal.startsWith(todayStr);
      }) 
      .flatMap(ev => {
        if (Array.isArray(ev.items)) return ev.items;
        if (ev.log) return extractFoodsFromText(ev.log);
        return [];
      });

    if (!todayFoods.length) return [];

    const uniqueFoods = [...new Set(todayFoods.map(f => f.toLowerCase().trim()))];
    const coveredLabels = new Set();

    // 2. Query Open Food Facts
    for (const food of uniqueFoods) {
      try {
        // fast mode avoids network
        if (process.env.FAST_MODE) continue;

        if (cache[food]) {
          const nuts = cache[food];
          BASE_NUTRIENT_REQUIREMENTS.forEach(nutrient => {
            const val = nuts[`${nutrient.key}_value`] || nuts[`${nutrient.key}_100g`] || nuts[nutrient.key];
            if (val && parseFloat(val) > 0) coveredLabels.add(nutrient.label);
          });
          continue;
        }

        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(food)}&search_simple=1&action=process&json=1&fields=nutriments`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.products?.length > 0) {
          const nuts = data.products[0].nutriments || {};
          // store in cache
          cache[food] = nuts;
          saveCache();
          BASE_NUTRIENT_REQUIREMENTS.forEach(nutrient => {
            const val = nuts[`${nutrient.key}_value`] || nuts[`${nutrient.key}_100g`] || nuts[nutrient.key];
            if (val && parseFloat(val) > 0) coveredLabels.add(nutrient.label);
          });
        }
      } catch (e) {
        console.error(`[${NAME}] API Error for ${food}:`, e.message);
      }
    }

    // 3. Find the Gaps
    const missing = BASE_NUTRIENT_REQUIREMENTS
      .map(n => n.label)
      .filter(label => !coveredLabels.has(label));

    // 4. Return Findings
    // build id using externalRef or date so separate files are generated per group
    const baseId = entry && entry.externalRef ? entry.externalRef : todayStr
    // append foods to make id more descriptive
    const foodTag = uniqueFoods.length ? uniqueFoods.map(f=>f.replace(/\s+/g,'_')).join('-') : ''
    const finalId = `${NAME.toLowerCase()}-${baseId}${foodTag?`-${foodTag}`:''}`
    return [{
      id: finalId,
      key: entry.externalRef,
      detector: NAME,
      severity: 'info',
      message: `Menu check for ${todayStr}: Missing ${missing.join(', ')}`,
      evidence: { servedToday: uniqueFoods, missingNutrients: missing }
    }];
  }
};

function extractFoodsFromText(text) {
  if (!text) return [];
  let t = text.toLowerCase();
  t = t.replace(/^.*(?:foods for|lunch|dinner|breakfast)[^a-z0-9]*:\s*/, '');
  return t
    .split(/,|\band\b|;|and|&/)
    .map(s => s.trim())
    .filter(s => s.length > 2);
}

// helper to persist cache
function saveCache() {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error(`[${NAME}] cache save failed`, e.message);
  }
}

// Export base nutrient list for external use
module.exports.BASE_NUTRIENT_REQUIREMENTS = BASE_NUTRIENT_REQUIREMENTS;