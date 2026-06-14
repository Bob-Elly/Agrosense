// server/scripts/seedCropProfiles.js
// ─────────────────────────────────────────────────────────────────────────────
// One-time seeding script — populates the "cropProfiles" Firestore collection
// with optimal soil parameter ranges for West African crops.
//
// USAGE (from the server/ directory):
//   npm run seed
//   OR: node scripts/seedCropProfiles.js
//
// Document IDs: crop name, lowercase, spaces → underscores, parens removed.
// e.g. "Rice (Lowland/Paddy)" → "rice_lowland_paddy"
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import { db } from '../config/firebaseAdmin.js'

// ── Crop profile data ─────────────────────────────────────────────────────────
// All ranges are agronomist-verified for West African conditions.
// Fields:
//   moisture    — soil moisture volumetric (%)
//   ph          — soil pH (dimensionless)
//   nitrogen    — N content (mg/kg)
//   phosphorus  — P content (mg/kg)
//   potassium   — K content (mg/kg)
//   temperature — optimal soil/air temperature (°C)
//   nitrogenFixing — true for legumes that fix atmospheric N (optional)
// ─────────────────────────────────────────────────────────────────────────────
const cropProfiles = [
  // ── Root & Tuber Crops ───────────────────────────────────────────────────
  {
    id:          'cocoa_yam',
    name:        'Cocoa Yam',
    moisture:    { min: 70, max: 85 },
    ph:          { min: 5.5, max: 6.5 },
    nitrogen:    { min: 40,  max: 60  },
    phosphorus:  { min: 12,  max: 18  },
    potassium:   { min: 80,  max: 120 },
    temperature: { min: 25,  max: 30  },
    notes: 'Cocoa yam (taro) thrives in moist, well-drained fertile soils. ' +
           'Prefers consistently high moisture (70–85%) and partial shade. ' +
           'Sensitive to prolonged waterlogging.',
  },
  {
    id:          'yam',
    name:        'Yam',
    moisture:    { min: 60, max: 75 },
    ph:          { min: 5.5, max: 7.0 },
    nitrogen:    { min: 45,  max: 90  },
    phosphorus:  { min: 20,  max: 50  },
    potassium:   { min: 75,  max: 110 },
    temperature: { min: 25,  max: 35  },
    notes: 'Yam requires deep, loose, well-drained soils rich in organic matter. ' +
           'Very sensitive to waterlogging — do not allow soil moisture above 75%. ' +
           'Yields decrease sharply if soil pH drops below 5.5.',
  },
  {
    id:          'sweet_potatoes',
    name:        'Sweet Potatoes',
    moisture:    { min: 50, max: 65 },
    ph:          { min: 5.8, max: 6.2 },
    nitrogen:    { min: 30,  max: 50  },
    phosphorus:  { min: 15,  max: 25  },
    potassium:   { min: 100, max: 150 },
    temperature: { min: 21,  max: 28  },
    notes: 'Sweet potatoes prefer sandy loam soils and high potassium for tuber development. ' +
           'Excess nitrogen (above 50 mg/kg) encourages foliage at the expense of tubers. ' +
           'Very narrow pH tolerance — keep between 5.8 and 6.2.',
  },
  {
    id:          'cassava',
    name:        'Cassava',
    moisture:    { min: 40, max: 60 },
    ph:          { min: 5.5, max: 6.5 },
    nitrogen:    { min: 30,  max: 60  },
    phosphorus:  { min: 10,  max: 20  },
    potassium:   { min: 90,  max: 140 },
    temperature: { min: 22,  max: 30  },
    notes: 'Cassava is very drought-tolerant and thrives in moderately poor soils. ' +
           'High potassium is critical for starch accumulation in tubers. ' +
           'Tolerates low phosphorus but responds well to application at planting.',
  },

  // ── Legumes (nitrogen-fixing) ─────────────────────────────────────────────
  {
    id:             'cow_peas_beans',
    name:           'Cow Peas (Beans)',
    moisture:       { min: 45, max: 60 },
    ph:             { min: 5.6, max: 6.7 },
    nitrogen:       { min: 15,  max: 30  },
    phosphorus:     { min: 15,  max: 30  },
    potassium:      { min: 85,  max: 150 },
    temperature:    { min: 20,  max: 30  },
    nitrogenFixing: true,
    notes: 'Cowpeas fix atmospheric nitrogen via root nodule bacteria — low soil N is normal. ' +
           'Requires adequate phosphorus for root nodule development. ' +
           'Drought-tolerant once established. Avoid waterlogging.',
  },
  {
    id:             'groundnuts',
    name:           'Groundnuts',
    moisture:       { min: 50, max: 65 },
    ph:             { min: 6.0, max: 6.5 },
    nitrogen:       { min: 20,  max: 40  },
    phosphorus:     { min: 15,  max: 25  },
    potassium:      { min: 60,  max: 100 },
    temperature:    { min: 23,  max: 30  },
    nitrogenFixing: true,
    notes: 'Groundnuts fix nitrogen and need calcium-rich, loose soils for pod penetration. ' +
           'Good drainage is essential — wet soils increase aflatoxin contamination risk. ' +
           'Narrow pH range (6.0–6.5); below 6.0 impairs nodule function.',
  },

  // ── Cereals ───────────────────────────────────────────────────────────────
  {
    id:          'maize',
    name:        'Maize',
    moisture:    { min: 60, max: 80 },
    ph:          { min: 6.0, max: 7.0 },
    nitrogen:    { min: 80,  max: 150 },
    phosphorus:  { min: 25,  max: 45  },
    potassium:   { min: 80,  max: 130 },
    temperature: { min: 18,  max: 27  },
    notes: 'Maize is a heavy nitrogen feeder — N demand peaks at silking. ' +
           'Ensure adequate moisture (60–80%) during tasseling and grain fill stages. ' +
           'pH below 6.0 causes phosphorus lock-up and reduces yield significantly.',
  },

  // ── Rice variants ─────────────────────────────────────────────────────────
  {
    id:          'rice_lowland_paddy',
    name:        'Rice (Lowland/Paddy)',
    moisture:    { min: 80, max: 100 },
    ph:          { min: 6.0, max: 6.5 },
    nitrogen:    { min: 70,  max: 120 },
    phosphorus:  { min: 15,  max: 30  },
    potassium:   { min: 70,  max: 120 },
    temperature: { min: 25,  max: 33  },
    notes: 'Paddy rice requires consistently flooded or saturated soil (80–100% moisture). ' +
           'Maintain flooded conditions during vegetative and reproductive stages. ' +
           'Split nitrogen application at transplanting and panicle initiation is recommended.',
  },
  {
    id:          'rice_upland',
    name:        'Rice (Upland)',
    moisture:    { min: 65, max: 80 },
    ph:          { min: 6.0, max: 6.5 },
    nitrogen:    { min: 70,  max: 120 },
    phosphorus:  { min: 15,  max: 30  },
    potassium:   { min: 70,  max: 120 },
    temperature: { min: 25,  max: 33  },
    notes: 'Upland rice is grown in non-flooded, well-drained fields. ' +
           'Requires consistent rainfall or irrigation to keep soil at 65–80% moisture. ' +
           'More susceptible to drought stress than lowland varieties; monitor closely.',
  },
]

// ── Seed Firestore ─────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Seeding crop profiles to Firestore…\n')
  let ok = 0, fail = 0

  for (const crop of cropProfiles) {
    const { id, ...data } = crop
    try {
      await db.collection('cropProfiles').doc(id).set(data)
      const tag = data.nitrogenFixing ? ' 🌿 (N-fixing legume)' : ''
      console.log(`  ✅  ${crop.name}${tag}  →  cropProfiles/${id}`)
      ok++
    } catch (err) {
      console.error(`  ❌  Failed: ${crop.name}  —  ${err.message}`)
      fail++
    }
  }

  console.log(`\n${fail === 0 ? '✅' : '⚠️ '} Seeded ${ok} crop profiles${fail ? `, ${fail} failed` : ''}.`)
  console.log('   View in Firebase console → Firestore → cropProfiles collection.\n')
  process.exit(fail > 0 ? 1 : 0)
}

seed()
