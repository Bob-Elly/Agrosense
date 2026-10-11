// server/scripts/seedCropProfiles.js
// ─────────────────────────────────────────────────────────────────────────────
// Seeding script — populates the "cropProfiles" Firestore collection
// with both instantaneous (in-situ RS485 sensor detection scale) and
// seasonal (lab reserve) optimal ranges for West African crops.
//
// USAGE (from the server/ directory):
//   npm run seed
//   OR: node scripts/seedCropProfiles.js
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import { db } from '../config/firebaseAdmin.js'
import { CROPS, CROP_ID_ALIASES } from '../data/crops.js'

async function seed() {
  console.log('🌱 Seeding crop profiles with instantaneous and seasonal thresholds to Firestore…\n')
  let ok = 0, fail = 0

  // Seed all canonical crops
  for (const [id, crop] of Object.entries(CROPS)) {
    const data = {
      ...crop,
      // Provide top-level nitrogen, phosphorus, potassium pointing to instantaneous
      // for seamless backward compatibility with any legacy readers
      nitrogen: crop.instantaneous.n,
      phosphorus: crop.instantaneous.p,
      potassium: crop.instantaneous.k,
    }

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

  // Also seed legacy aliases so existing devices referencing e.g. "cocoa_yam" continue to resolve
  for (const [aliasId, canonicalId] of Object.entries(CROP_ID_ALIASES)) {
    const crop = CROPS[canonicalId]
    if (!crop) continue
    const data = {
      ...crop,
      id: aliasId,
      nitrogen: crop.instantaneous.n,
      phosphorus: crop.instantaneous.p,
      potassium: crop.instantaneous.k,
    }
    try {
      await db.collection('cropProfiles').doc(aliasId).set(data)
      console.log(`  🔗  Alias: ${aliasId}  →  cropProfiles/${aliasId} (mapped to ${crop.name})`)
      ok++
    } catch (err) {
      console.error(`  ❌  Failed alias: ${aliasId}  —  ${err.message}`)
      fail++
    }
  }

  console.log(`\n${fail === 0 ? '✅' : '⚠️ '} Seeded ${ok} crop profiles${fail ? `, ${fail} failed` : ''}.`)
  console.log('   View in Firebase console → Firestore → cropProfiles collection.\n')
  process.exit(fail > 0 ? 1 : 0)
}

seed()
