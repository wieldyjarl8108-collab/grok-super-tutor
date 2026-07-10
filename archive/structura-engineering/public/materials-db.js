/**
 * Truthful structural material catalog (order-of-magnitude engineering values).
 * Sources: typical textbook / code-order values (A36, C30, glulam, etc.) — not site-specific PE data.
 */

export const MATERIAL_DB = {
  'steel_a36': {
    id: 'steel_a36', name: 'Structural steel A36', category: 'Steel', grade: 'A36 / S235',
    density: 7850, youngs_modulus_gpa: 200, poisson: 0.3, yield_mpa: 250, tensile_mpa: 400,
    color: '#6e7680', metalness: 0.82, roughness: 0.32, cost_per_kg: 1.9,
  },
  'steel_a992': {
    id: 'steel_a992', name: 'Wide-flange steel A992', category: 'Steel', grade: 'A992 / S355',
    density: 7850, youngs_modulus_gpa: 200, poisson: 0.3, yield_mpa: 345, tensile_mpa: 450,
    color: '#5c6570', metalness: 0.85, roughness: 0.3, cost_per_kg: 2.1,
  },
  'stainless_304': {
    id: 'stainless_304', name: 'Stainless 304', category: 'Steel', grade: '304',
    density: 8000, youngs_modulus_gpa: 193, poisson: 0.29, yield_mpa: 215, tensile_mpa: 505,
    color: '#a8b0b8', metalness: 0.9, roughness: 0.25, cost_per_kg: 4.5,
  },
  'aluminum_6061': {
    id: 'aluminum_6061', name: 'Aluminum 6061-T6', category: 'Aluminum', grade: '6061-T6',
    density: 2700, youngs_modulus_gpa: 69, poisson: 0.33, yield_mpa: 276, tensile_mpa: 310,
    color: '#a8b0b8', metalness: 0.88, roughness: 0.28, cost_per_kg: 3.2,
  },
  'concrete_c30': {
    id: 'concrete_c30', name: 'Normal concrete C30/37', category: 'Concrete', grade: 'C30/37',
    density: 2400, youngs_modulus_gpa: 33, poisson: 0.2, yield_mpa: 30, tensile_mpa: 2.9,
    color: '#8a8d8f', metalness: 0.05, roughness: 0.92, cost_per_kg: 0.12,
  },
  'concrete_c40': {
    id: 'concrete_c40', name: 'High-strength concrete C40/50', category: 'Concrete', grade: 'C40/50',
    density: 2450, youngs_modulus_gpa: 35, poisson: 0.2, yield_mpa: 40, tensile_mpa: 3.5,
    color: '#7a7e82', metalness: 0.05, roughness: 0.9, cost_per_kg: 0.15,
  },
  'rebar': {
    id: 'rebar', name: 'Reinforcing steel (rebar)', category: 'Steel', grade: 'Grade 60',
    density: 7850, youngs_modulus_gpa: 200, poisson: 0.3, yield_mpa: 420, tensile_mpa: 620,
    color: '#5a5048', metalness: 0.7, roughness: 0.45, cost_per_kg: 1.5,
  },
  'timber_spf': {
    id: 'timber_spf', name: 'Softwood lumber (SPF #2)', category: 'Wood', grade: 'SPF #2',
    density: 480, youngs_modulus_gpa: 10, poisson: 0.3, yield_mpa: 20, tensile_mpa: 30,
    color: '#8b7355', metalness: 0.02, roughness: 0.82, cost_per_kg: 0.7,
  },
  'glulam': {
    id: 'glulam', name: 'Glulam timber', category: 'Wood', grade: 'GL24h',
    density: 420, youngs_modulus_gpa: 11.6, poisson: 0.3, yield_mpa: 24, tensile_mpa: 19,
    color: '#6b4f2a', metalness: 0.02, roughness: 0.8, cost_per_kg: 1.4,
  },
  'darkwood': {
    id: 'darkwood', name: 'Hardwood / cedar', category: 'Wood', grade: 'Cedar',
    density: 450, youngs_modulus_gpa: 9, poisson: 0.3, yield_mpa: 18, tensile_mpa: 25,
    color: '#3d2914', metalness: 0.02, roughness: 0.78, cost_per_kg: 1.1,
  },
  'brick': {
    id: 'brick', name: 'Clay brick masonry', category: 'Masonry', grade: 'Common',
    density: 1800, youngs_modulus_gpa: 10, poisson: 0.25, yield_mpa: 12, tensile_mpa: 1.5,
    color: '#8b4a3a', metalness: 0.02, roughness: 0.9, cost_per_kg: 0.11,
  },
  'stone': {
    id: 'stone', name: 'Stone masonry', category: 'Masonry', grade: 'Limestone',
    density: 2500, youngs_modulus_gpa: 30, poisson: 0.25, yield_mpa: 40, tensile_mpa: 4,
    color: '#7a756c', metalness: 0.05, roughness: 0.88, cost_per_kg: 0.2,
  },
  'glass': {
    id: 'glass', name: 'Float glass', category: 'Glass', grade: 'Annealed',
    density: 2500, youngs_modulus_gpa: 70, poisson: 0.22, yield_mpa: 40, tensile_mpa: 40,
    color: '#a8c4d4', metalness: 0.12, roughness: 0.08, opacity: 0.42, cost_per_kg: 2.5,
  },
  'asphalt': {
    id: 'asphalt', name: 'Asphalt pavement', category: 'Other', grade: 'AC',
    density: 2300, youngs_modulus_gpa: 3, poisson: 0.35, yield_mpa: 2, tensile_mpa: 1,
    color: '#2c2c2e', metalness: 0.05, roughness: 0.95, cost_per_kg: 0.08,
  },
  'roof_shingle': {
    id: 'roof_shingle', name: 'Asphalt shingles', category: 'Other', grade: 'Architectural',
    density: 1200, youngs_modulus_gpa: 1, poisson: 0.3, yield_mpa: 2, tensile_mpa: 2,
    color: '#3d3835', metalness: 0.05, roughness: 0.92, cost_per_kg: 1.2,
  },
  'paint': {
    id: 'paint', name: 'Painted finish (non-structural)', category: 'Other', grade: '—',
    density: 1200, youngs_modulus_gpa: 1, poisson: 0.3, yield_mpa: 1, tensile_mpa: 1,
    color: '#d4d0c8', metalness: 0.04, roughness: 0.68, cost_per_kg: 2,
  },
};

/** Resolve free-text / short key → catalog entry */
export function resolveMaterial(keyOrName) {
  if (!keyOrName) return MATERIAL_DB.steel_a36;
  const k = String(keyOrName).toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (MATERIAL_DB[k]) return MATERIAL_DB[k];
  // aliases
  const aliases = {
    steel: 'steel_a36', metal: 'steel_a36', iron: 'steel_a36', a36: 'steel_a36',
    a992: 'steel_a992', wood: 'timber_spf', pine: 'timber_spf', timber: 'timber_spf',
    lumber: 'timber_spf', concrete: 'concrete_c30', rc: 'concrete_c30',
    aluminum: 'aluminum_6061', aluminium: 'aluminum_6061', glass: 'glass',
    brick: 'brick', stone: 'stone', darkwood: 'darkwood', cedar: 'darkwood',
    glulam: 'glulam', shingle: 'roof_shingle', roof_shingle: 'roof_shingle',
    asphalt: 'asphalt', paint: 'paint', whitepaint: 'paint',
  };
  for (const [a, id] of Object.entries(aliases)) {
    if (k === a || k.includes(a)) return MATERIAL_DB[id];
  }
  // category match
  for (const m of Object.values(MATERIAL_DB)) {
    if (m.category.toLowerCase() === k || m.name.toLowerCase().includes(k.replace(/_/g, ' '))) return m;
  }
  return MATERIAL_DB.steel_a36;
}

export function listMaterials() {
  return Object.values(MATERIAL_DB);
}
