// src/detectors/DailyNutritionDetector.js
const fetch = require('node-fetch');
const NAME = 'DailyNutritionDetector';

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
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(food)}&search_simple=1&action=process&json=1&fields=nutriments`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.products?.length > 0) {
          const nuts = data.products[0].nutriments || {};
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
    return [{
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
  return text
    .toLowerCase()
    .replace(/^.*foods for.*:\s*/, '') // Slightly more flexible regex
    .split(/,|\band\b|;|and|&/)
    .map(s => s.trim())
    .filter(s => s.length > 2);
}