// server/data/crops.js
// ─────────────────────────────────────────────────────────────────────────────
// Target ranges in mg/kg for West African crops
//
// Conversion Rationale:
// RS485 probe measures active ionic pore flux under ambient moisture (~15-30%),
// which scales down from total extractable reserves by ~0.12 for N and K, and ~0.15 for P.
// Formula: C_instantaneous = Math.round(C_seasonal * factor)
// ─────────────────────────────────────────────────────────────────────────────

export const CROPS = {
  cassava: {
    id: "cassava",
    name: "Cassava",
    moisture: { min: 40, max: 60 },
    ph: { min: 5.5, max: 6.5 },
    temperature: { min: 22, max: 30 },
    instantaneous: {
      n: { min: 3, max: 5 },
      p: { min: 2, max: 5 },
      k: { min: 12, max: 22 },
      nitrogen: { min: 3, max: 5 },
      phosphorus: { min: 2, max: 5 },
      potassium: { min: 12, max: 22 }
    },
    seasonal: {
      n: { min: 20, max: 40 },
      p: { min: 15, max: 30 },
      k: { min: 100, max: 180 },
      nitrogen: { min: 20, max: 40 },
      phosphorus: { min: 15, max: 30 },
      potassium: { min: 100, max: 180 }
    },
    notes: 'Cassava is very drought-tolerant and thrives in moderately poor soils. High potassium is critical for starch accumulation in tubers.'
  },
  yam: {
    id: "yam",
    name: "Yam",
    moisture: { min: 60, max: 75 },
    ph: { min: 5.5, max: 7.0 },
    temperature: { min: 25, max: 35 },
    instantaneous: {
      n: { min: 4, max: 7 },
      p: { min: 3, max: 5 },
      k: { min: 14, max: 24 },
      nitrogen: { min: 4, max: 7 },
      phosphorus: { min: 3, max: 5 },
      potassium: { min: 14, max: 24 }
    },
    seasonal: {
      n: { min: 30, max: 60 },
      p: { min: 20, max: 35 },
      k: { min: 120, max: 200 },
      nitrogen: { min: 30, max: 60 },
      phosphorus: { min: 20, max: 35 },
      potassium: { min: 120, max: 200 }
    },
    notes: 'Yam requires deep, loose, well-drained soils rich in organic matter. Very sensitive to waterlogging — do not allow moisture above 75%.'
  },
  sweet_potato: {
    id: "sweet_potato",
    name: "Sweet Potato",
    moisture: { min: 50, max: 65 },
    ph: { min: 5.8, max: 6.2 },
    temperature: { min: 21, max: 28 },
    instantaneous: {
      n: { min: 3, max: 5 },
      p: { min: 3, max: 6 },
      k: { min: 14, max: 24 },
      nitrogen: { min: 3, max: 5 },
      phosphorus: { min: 3, max: 6 },
      potassium: { min: 14, max: 24 }
    },
    seasonal: {
      n: { min: 20, max: 40 },
      p: { min: 20, max: 40 },
      k: { min: 120, max: 200 },
      nitrogen: { min: 20, max: 40 },
      phosphorus: { min: 20, max: 40 },
      potassium: { min: 120, max: 200 }
    },
    notes: 'Sweet potatoes prefer sandy loam soils and high potassium for tuber development. Narrow pH tolerance (5.8–6.2).'
  },
  cocoyam: {
    id: "cocoyam",
    name: "Cocoyam",
    moisture: { min: 70, max: 85 },
    ph: { min: 5.5, max: 6.5 },
    temperature: { min: 25, max: 30 },
    instantaneous: {
      n: { min: 4, max: 6 },
      p: { min: 3, max: 5 },
      k: { min: 13, max: 23 },
      nitrogen: { min: 4, max: 6 },
      phosphorus: { min: 3, max: 5 },
      potassium: { min: 13, max: 23 }
    },
    seasonal: {
      n: { min: 30, max: 50 },
      p: { min: 20, max: 35 },
      k: { min: 110, max: 190 },
      nitrogen: { min: 30, max: 50 },
      phosphorus: { min: 20, max: 35 },
      potassium: { min: 110, max: 190 }
    },
    notes: 'Cocoyam (taro) thrives in moist, well-drained fertile soils with high moisture (70–85%) and partial shade.'
  },
  maize: {
    id: "maize",
    name: "Maize (Corn)",
    moisture: { min: 60, max: 80 },
    ph: { min: 6.0, max: 7.0 },
    temperature: { min: 18, max: 27 },
    instantaneous: {
      n: { min: 5, max: 10 },
      p: { min: 4, max: 7 },
      k: { min: 12, max: 19 },
      nitrogen: { min: 5, max: 10 },
      phosphorus: { min: 4, max: 7 },
      potassium: { min: 12, max: 19 }
    },
    seasonal: {
      n: { min: 40, max: 80 },
      p: { min: 25, max: 45 },
      k: { min: 100, max: 160 },
      nitrogen: { min: 40, max: 80 },
      phosphorus: { min: 25, max: 45 },
      potassium: { min: 100, max: 160 }
    },
    notes: 'Maize is a heavy nitrogen feeder with peak demand at silking. Maintain adequate moisture during tasseling and grain fill.'
  },
  rice_upland: {
    id: "rice_upland",
    name: "Upland Rice",
    moisture: { min: 65, max: 80 },
    ph: { min: 6.0, max: 6.5 },
    temperature: { min: 25, max: 33 },
    instantaneous: {
      n: { min: 4, max: 7 },
      p: { min: 3, max: 5 },
      k: { min: 10, max: 17 },
      nitrogen: { min: 4, max: 7 },
      phosphorus: { min: 3, max: 5 },
      potassium: { min: 10, max: 17 }
    },
    seasonal: {
      n: { min: 30, max: 60 },
      p: { min: 20, max: 35 },
      k: { min: 80, max: 140 },
      nitrogen: { min: 30, max: 60 },
      phosphorus: { min: 20, max: 35 },
      potassium: { min: 80, max: 140 }
    },
    notes: 'Upland rice is grown in non-flooded, well-drained fields. Requires consistent moisture (65–80%) to prevent drought stress.'
  },
  rice_lowland: {
    id: "rice_lowland",
    name: "Lowland Rice",
    moisture: { min: 80, max: 100 },
    ph: { min: 6.0, max: 6.5 },
    temperature: { min: 25, max: 33 },
    instantaneous: {
      n: { min: 5, max: 8 },
      p: { min: 2, max: 5 },
      k: { min: 11, max: 18 },
      nitrogen: { min: 5, max: 8 },
      phosphorus: { min: 2, max: 5 },
      potassium: { min: 11, max: 18 }
    },
    seasonal: {
      n: { min: 40, max: 70 },
      p: { min: 15, max: 30 },
      k: { min: 90, max: 150 },
      nitrogen: { min: 40, max: 70 },
      phosphorus: { min: 15, max: 30 },
      potassium: { min: 90, max: 150 }
    },
    notes: 'Paddy rice requires flooded or saturated soil (80–100% moisture) during vegetative and reproductive stages.'
  },
  beans: {
    id: "beans",
    name: "Common Beans",
    moisture: { min: 45, max: 60 },
    ph: { min: 5.6, max: 6.7 },
    temperature: { min: 20, max: 30 },
    nitrogenFixing: true,
    instantaneous: {
      n: { min: 2, max: 4 },
      p: { min: 4, max: 7 },
      k: { min: 11, max: 18 },
      nitrogen: { min: 2, max: 4 },
      phosphorus: { min: 4, max: 7 },
      potassium: { min: 11, max: 18 }
    },
    seasonal: {
      n: { min: 15, max: 30 },
      p: { min: 25, max: 45 },
      k: { min: 90, max: 150 },
      nitrogen: { min: 15, max: 30 },
      phosphorus: { min: 25, max: 45 },
      potassium: { min: 90, max: 150 }
    },
    notes: 'Beans fix atmospheric nitrogen via root nodule bacteria. Adequate phosphorus is vital for root nodule development.'
  },
  groundnut: {
    id: "groundnut",
    name: "Groundnut",
    moisture: { min: 50, max: 65 },
    ph: { min: 6.0, max: 6.5 },
    temperature: { min: 23, max: 30 },
    nitrogenFixing: true,
    instantaneous: {
      n: { min: 2, max: 3 },
      p: { min: 3, max: 6 },
      k: { min: 10, max: 16 },
      nitrogen: { min: 2, max: 3 },
      phosphorus: { min: 3, max: 6 },
      potassium: { min: 10, max: 16 }
    },
    seasonal: {
      n: { min: 15, max: 25 },
      p: { min: 20, max: 40 },
      k: { min: 80, max: 130 },
      nitrogen: { min: 15, max: 25 },
      phosphorus: { min: 20, max: 40 },
      potassium: { min: 80, max: 130 }
    },
    notes: 'Groundnuts fix nitrogen and need calcium-rich, loose soils for peg and pod development. Good drainage prevents aflatoxin.'
  }
};

// Aliases mapping alternate legacy Firestore IDs
export const CROP_ID_ALIASES = {
  cocoa_yam: 'cocoyam',
  sweet_potatoes: 'sweet_potato',
  cow_peas_beans: 'beans',
  groundnuts: 'groundnut',
  rice_lowland_paddy: 'rice_lowland'
};

export function getCropProfile(cropIdOrName) {
  if (!cropIdOrName) return null;
  const key = cropIdOrName.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '');
  const canonicalId = CROP_ID_ALIASES[key] || key;
  if (CROPS[canonicalId]) return CROPS[canonicalId];

  // Lookup by name
  return Object.values(CROPS).find(
    c => c.name.toLowerCase() === cropIdOrName.toLowerCase() ||
         c.id.toLowerCase() === key
  ) || null;
}
