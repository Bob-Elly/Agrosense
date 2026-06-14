// server/scripts/seedCropProfiles.js
// ─────────────────────────────────────────────────────────────────────────────
// One-time seeding script — populates the "cropProfiles" Firestore collection
// with optimal soil parameter ranges for 8 West African crops.
//
// USAGE (from the server/ directory):
//   npm run seed
//   OR: node scripts/seedCropProfiles.js
//
// Document IDs are the crop name: lowercase, spaces replaced by underscores,
// parentheses removed (e.g. "cow_peas_beans").
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import { db } from '../config/firebaseAdmin.js'

// ── Crop profile data ─────────────────────────────────────────────────────────
// Optimal ranges for each parameter:
//   moisture    — soil moisture (%)
//   ph          — soil pH
//   nitrogen    — N content (mg/kg)
//   phosphorus  — P content (mg/kg)
//   potassium   — K content (mg/kg)
//   temperature — optimal air/soil temperature (°C)
// ──────────────────────────────────────────────────────────────────────────────
const cropProfiles = [
  {
    id:         'cocoa_yam',
    name:       'Cocoa Yam',
    moisture:   { min: 60, max: 80 },
    ph:         { min: 5.5, max: 7.0 },
    nitrogen:   { min: 120, max: 180 },
    phosphorus: { min: 25, max: 40 },
    potassium:  { min: 180, max: 250 },
    temperature:{ min: 22, max: 30 },
    notes: 'Cocoa yam (taro) thrives in moist, well-drained fertile soils. ' +
           'Prefers partial shade and consistent moisture.',
  },
  {
    id:         'yam',
    name:       'Yam',
    moisture:   { min: 50, max: 70 },
    ph:         { min: 5.5, max: 7.0 },
    nitrogen:   { min: 80, max: 140 },
    phosphorus: { min: 20, max: 35 },
    potassium:  { min: 150, max: 220 },
    temperature:{ min: 25, max: 35 },
    notes: 'Yam requires deep, loose, well-drained soils rich in organic matter. ' +
           'Very sensitive to waterlogging.',
  },
  {
    id:         'sweet_potatoes',
    name:       'Sweet Potatoes',
    moisture:   { min: 50, max: 70 },
    ph:         { min: 5.5, max: 6.5 },
    nitrogen:   { min: 60, max: 100 },
    phosphorus: { min: 30, max: 50 },
    potassium:  { min: 200, max: 280 },
    temperature:{ min: 20, max: 30 },
    notes: 'Sweet potatoes prefer sandy loam soils and high potassium for tuber development. ' +
           'Excess nitrogen reduces yield.',
  },
  {
    id:         'cow_peas_beans',
    name:       'Cow Peas (Beans)',
    moisture:   { min: 40, max: 60 },
    ph:         { min: 6.0, max: 7.0 },
    nitrogen:   { min: 40, max: 80 },
    phosphorus: { min: 20, max: 40 },
    potassium:  { min: 100, max: 180 },
    temperature:{ min: 20, max: 35 },
    notes: 'Cowpeas fix atmospheric nitrogen. Requires good phosphorus for root nodule development. ' +
           'Drought-tolerant once established.',
  },
  {
    id:         'cassava',
    name:       'Cassava',
    moisture:   { min: 40, max: 70 },
    ph:         { min: 5.5, max: 7.0 },
    nitrogen:   { min: 60, max: 120 },
    phosphorus: { min: 15, max: 30 },
    potassium:  { min: 150, max: 250 },
    temperature:{ min: 25, max: 35 },
    notes: 'Cassava is very drought-tolerant and thrives in poor soils. ' +
           'High potassium is critical for tuber starch development.',
  },
  {
    id:         'maize',
    name:       'Maize',
    moisture:   { min: 50, max: 70 },
    ph:         { min: 5.8, max: 7.0 },
    nitrogen:   { min: 120, max: 200 },
    phosphorus: { min: 30, max: 50 },
    potassium:  { min: 150, max: 250 },
    temperature:{ min: 18, max: 32 },
    notes: 'Maize is a heavy nitrogen feeder. Ensure adequate moisture during silking and ' +
           'grain-fill stages for maximum yield.',
  },
  {
    id:         'groundnuts',
    name:       'Groundnuts',
    moisture:   { min: 40, max: 60 },
    ph:         { min: 5.5, max: 7.0 },
    nitrogen:   { min: 40, max: 80 },
    phosphorus: { min: 25, max: 45 },
    potassium:  { min: 100, max: 180 },
    temperature:{ min: 22, max: 35 },
    notes: 'Groundnuts fix nitrogen and need calcium-rich, loose soils for pod development. ' +
           'Good drainage is essential to prevent aflatoxin contamination.',
  },
  {
    id:         'rice',
    name:       'Rice',
    moisture:   { min: 70, max: 90 },
    ph:         { min: 5.5, max: 7.0 },
    nitrogen:   { min: 100, max: 180 },
    phosphorus: { min: 25, max: 50 },
    potassium:  { min: 100, max: 200 },
    temperature:{ min: 20, max: 35 },
    notes: 'Paddy rice requires consistently flooded or very moist conditions. ' +
           'Split nitrogen application improves efficiency and reduces losses.',
  },
]

// ── Seed Firestore ────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Seeding crop profiles to Firestore...\n')

  for (const crop of cropProfiles) {
    const { id, ...data } = crop
    try {
      await db.collection('cropProfiles').doc(id).set(data)
      console.log(`  ✅  ${crop.name} → cropProfiles/${id}`)
    } catch (err) {
      console.error(`  ❌  Failed to seed ${crop.name}:`, err.message)
    }
  }

  console.log(`\n✅  Seeded ${cropProfiles.length} crop profiles.`)
  console.log('    You can view them in the Firebase console under Firestore → cropProfiles.')
  process.exit(0)
}

seed()
