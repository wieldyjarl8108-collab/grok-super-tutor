/**
 * Structura-style structure engine:
 * - Expand engineering structure (type + dims + materials) into truthful members
 * - Order-of-magnitude mass / stress / deflection estimates (educational, not PE stamp)
 */
import { resolveMaterial } from './materials-db.js';

const STRUCTURE_TYPES = [
  'beam', 'column', 'truss', 'frame', 'slab', 'foundation', 'wall',
  'bridge', 'roof', 'cabin', 'house',
  'robot', 'humanoid', 'android', // full head-to-toe (not arm-only)
  'robot_arm', // arm only if user asks for arm
  'custom',
];

export { STRUCTURE_TYPES };

function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
}

function matKey(structure, fallback = 'steel_a36') {
  const m = structure?.materials?.[0];
  if (!m) return fallback;
  return m.grade || m.type || m.name || m.id || fallback;
}

function member(id, type, label, pos, size, materialKey, extra = {}) {
  const mat = resolveMaterial(materialKey);
  return {
    id,
    type,
    label,
    pos,
    rot: extra.rot || [0, 0, 0],
    size,
    material: mat.id,
    color: mat.color,
    metalness: mat.metalness,
    roughness: mat.roughness,
    opacity: mat.opacity ?? 1,
    note: extra.note || mat.name,
    role: extra.role || type,
  };
}

/**
 * Build realistic multi-member geometry from structure metadata.
 * Units: meters. Y up. Origin at plan center, ground y=0.
 */
export function expandStructure(structure) {
  if (!structure || typeof structure !== 'object') return [];
  const type = String(structure.type || 'beam').toLowerCase();
  const L = num(structure.dimensions?.length, 6);
  const W = num(structure.dimensions?.width, 0.4);
  const H = num(structure.dimensions?.height, 0.4);
  const unit = structure.dimensions?.unit || 'm';
  // If user stored mm by mistake, keep as-is only if values look like meters
  const scale = unit === 'mm' ? 0.001 : unit === 'cm' ? 0.01 : unit === 'ft' ? 0.3048 : 1;
  const l = L * scale;
  const w = Math.max(W * scale, 0.05);
  const h = Math.max(H * scale, 0.05);
  const mk = matKey(
    structure,
    type === 'cabin' || type === 'house' || type === 'roof'
      ? 'timber_spf'
      : type === 'slab' || type === 'foundation' || type === 'wall'
        ? 'concrete_c30'
        : type === 'robot' || type === 'humanoid' || type === 'android' || type === 'robot_arm'
          ? 'aluminum_6061'
          : 'steel_a36',
  );
  const objs = [];

  switch (type) {
    case 'beam': {
      const d = Math.max(h, 0.2);
      const b = Math.max(w, 0.15);
      objs.push(member('beam_main', 'beam', 'Main beam', [0, d / 2 + 0.05, 0], [l, d, b], mk, { role: 'flexure' }));
      objs.push(member('sup_l', 'column', 'Support L', [-l / 2 + 0.15, 0.4, 0], [0.2, 0.8, 0.2], 'concrete_c30', { role: 'support' }));
      objs.push(member('sup_r', 'column', 'Support R', [l / 2 - 0.15, 0.4, 0], [0.2, 0.8, 0.2], 'concrete_c30', { role: 'support' }));
      break;
    }
    case 'column': {
      const side = Math.max(w, 0.25);
      objs.push(member('col', 'column', 'Column', [0, h / 2, 0], [side, h, side], mk, { role: 'compression' }));
      objs.push(member('footing', 'slab', 'Footing', [0, 0.15, 0], [side * 2.5, 0.3, side * 2.5], 'concrete_c30', { role: 'foundation' }));
      break;
    }
    case 'slab': {
      const t = Math.max(h, 0.15);
      objs.push(member('slab', 'slab', 'Floor slab', [0, t / 2, 0], [l, t, w], mk || 'concrete_c30', { role: 'slab' }));
      break;
    }
    case 'foundation': {
      objs.push(member('footing', 'slab', 'Foundation pad', [0, h / 2, 0], [l, h, w], 'concrete_c30', { role: 'foundation' }));
      break;
    }
    case 'wall': {
      const t = Math.min(w, 0.3);
      objs.push(member('wall', 'wall', 'Wall', [0, h / 2, 0], [l, h, t], mk || 'concrete_c30', { role: 'wall' }));
      break;
    }
    case 'roof': {
      objs.push(member('roof', 'roof', 'Roof', [0, 0.05, 0], [l, h, w], 'roof_shingle', { role: 'roof' }));
      objs.push(member('eave_l', 'beam', 'Eave L', [0, 0.08, -w / 2], [l, 0.12, 0.12], 'timber_spf'));
      objs.push(member('eave_r', 'beam', 'Eave R', [0, 0.08, w / 2], [l, 0.12, 0.12], 'timber_spf'));
      break;
    }
    case 'frame': {
      const colH = Math.max(h, 3);
      const span = Math.max(l, 4);
      const depth = Math.max(w, 3);
      const col = 0.3;
      const beamD = 0.35;
      const corners = [
        [-span / 2, -depth / 2], [span / 2, -depth / 2],
        [-span / 2, depth / 2], [span / 2, depth / 2],
      ];
      corners.forEach(([x, z], i) => {
        objs.push(member(`col_${i}`, 'column', `Column ${i + 1}`, [x, colH / 2, z], [col, colH, col], mk, { role: 'column' }));
      });
      // beams on top along length
      objs.push(member('beam_f', 'beam', 'Beam front', [0, colH - beamD / 2, -depth / 2], [span, beamD, col], mk, { role: 'beam' }));
      objs.push(member('beam_b', 'beam', 'Beam back', [0, colH - beamD / 2, depth / 2], [span, beamD, col], mk, { role: 'beam' }));
      objs.push(member('beam_l', 'beam', 'Beam left', [-span / 2, colH - beamD / 2, 0], [col, beamD, depth], mk, { role: 'beam' }));
      objs.push(member('beam_r', 'beam', 'Beam right', [span / 2, colH - beamD / 2, 0], [col, beamD, depth], mk, { role: 'beam' }));
      objs.push(member('slab', 'slab', 'Floor', [0, 0.1, 0], [span + 0.4, 0.2, depth + 0.4], 'concrete_c30'));
      break;
    }
    case 'truss': {
      const span = Math.max(l, 8);
      const rise = Math.max(h, 1.5);
      const n = 6;
      const bay = span / n;
      const chord = 0.12;
      // bottom chord
      objs.push(member('bot', 'beam', 'Bottom chord', [0, 0.3, 0], [span, chord, chord], mk, { role: 'tension' }));
      // top chords (two slopes as beams)
      objs.push(member('top_l', 'beam', 'Top chord L', [-span / 4, 0.3 + rise / 2, 0], [span / 2 + 0.2, chord, chord], mk, {
        role: 'compression', rot: [0, 0, (Math.atan2(rise, span / 2) * 180) / Math.PI],
      }));
      objs.push(member('top_r', 'beam', 'Top chord R', [span / 4, 0.3 + rise / 2, 0], [span / 2 + 0.2, chord, chord], mk, {
        role: 'compression', rot: [0, 0, (-Math.atan2(rise, span / 2) * 180) / Math.PI],
      }));
      for (let i = 0; i <= n; i++) {
        const x = -span / 2 + i * bay;
        const yTop = 0.3 + rise * (1 - Math.abs(x) / (span / 2));
        objs.push(member(`web_${i}`, 'column', `Web ${i}`, [x, (0.3 + yTop) / 2, 0], [chord * 0.7, yTop - 0.3, chord * 0.7], mk, { role: 'web' }));
      }
      objs.push(member('sup_l', 'column', 'Support L', [-span / 2, 0.15, 0], [0.25, 0.3, 0.25], 'concrete_c30'));
      objs.push(member('sup_r', 'column', 'Support R', [span / 2, 0.15, 0], [0.25, 0.3, 0.25], 'concrete_c30'));
      break;
    }
    case 'bridge': {
      const span = Math.max(l, 12);
      const deckW = Math.max(w, 4);
      const pierH = Math.max(h, 4);
      const deckT = 0.4;
      // deck
      objs.push(member('deck', 'slab', 'Deck', [0, pierH + deckT / 2, 0], [span, deckT, deckW], 'concrete_c30', { role: 'deck' }));
      objs.push(member('asphalt', 'slab', 'Wearing course', [0, pierH + deckT + 0.04, 0], [span, 0.08, deckW - 0.2], 'asphalt'));
      // girders
      const nG = 3;
      for (let i = 0; i < nG; i++) {
        const z = -deckW / 2 + 0.4 + (i * (deckW - 0.8)) / Math.max(nG - 1, 1);
        objs.push(member(`girder_${i}`, 'beam', `Girder ${i + 1}`, [0, pierH - 0.35, z], [span * 0.95, 0.7, 0.35], mk, { role: 'girder' }));
      }
      // piers
      const nP = Math.max(2, Math.round(span / 10) + 1);
      for (let i = 0; i < nP; i++) {
        const x = -span / 2 + 1 + (i * (span - 2)) / Math.max(nP - 1, 1);
        objs.push(member(`pier_${i}`, 'column', `Pier ${i + 1}`, [x, pierH / 2, 0], [1.2, pierH, 0.8], 'concrete_c30', { role: 'pier' }));
        objs.push(member(`foot_${i}`, 'slab', `Footing ${i + 1}`, [x, 0.25, 0], [2.5, 0.5, 2], 'concrete_c30'));
      }
      // rails
      objs.push(member('rail_l', 'beam', 'Rail L', [0, pierH + deckT + 0.5, -deckW / 2 + 0.1], [span, 0.08, 0.08], 'steel_a36'));
      objs.push(member('rail_r', 'beam', 'Rail R', [0, pierH + deckT + 0.5, deckW / 2 - 0.1], [span, 0.08, 0.08], 'steel_a36'));
      break;
    }
    case 'cabin':
    case 'house': {
      const len = Math.max(l, 5);
      const dep = Math.max(w, 4);
      const wallH = Math.max(h, 2.5);
      const t = 0.15;
      // floor
      objs.push(member('floor', 'slab', 'Floor', [0, 0.1, 0], [len, 0.2, dep], 'concrete_c30'));
      // walls
      objs.push(member('wall_f', 'wall', 'Front wall', [0, wallH / 2 + 0.2, -dep / 2 + t / 2], [len, wallH, t], 'timber_spf'));
      objs.push(member('wall_b', 'wall', 'Back wall', [0, wallH / 2 + 0.2, dep / 2 - t / 2], [len, wallH, t], 'timber_spf'));
      objs.push(member('wall_l', 'wall', 'Left wall', [-len / 2 + t / 2, wallH / 2 + 0.2, 0], [t, wallH, dep - 2 * t], 'timber_spf'));
      objs.push(member('wall_r', 'wall', 'Right wall', [len / 2 - t / 2, wallH / 2 + 0.2, 0], [t, wallH, dep - 2 * t], 'timber_spf'));
      // posts
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => {
        objs.push(member(`post_${i}`, 'column', `Post ${i + 1}`,
          [sx * (len / 2 - 0.15), wallH / 2 + 0.2, sz * (dep / 2 - 0.15)],
          [0.15, wallH, 0.15], 'darkwood'));
      });
      // door
      objs.push(member('door', 'box', 'Door', [0, 1.15, -dep / 2 + 0.02], [0.9, 2.1, 0.08], 'darkwood'));
      // windows (glass)
      objs.push(member('win_l', 'plate', 'Window L', [-len * 0.28, 1.5, -dep / 2 + 0.02], [0.9, 0.9, 0.05], 'glass'));
      objs.push(member('win_r', 'plate', 'Window R', [len * 0.28, 1.5, -dep / 2 + 0.02], [0.9, 0.9, 0.05], 'glass'));
      // roof
      const roofH = Math.max(1.0, wallH * 0.4);
      objs.push(member('roof', 'roof', 'Roof', [0, wallH + 0.2, 0], [len + 0.6, roofH, dep + 0.6], 'roof_shingle'));
      break;
    }
    case 'robot':
    case 'humanoid':
    case 'android': {
      // FULL head-to-toe humanoid robot (not arm-only)
      // dimensions.height = total height (default ~1.75 m)
      // dimensions.width  = shoulder width
      // dimensions.length = body depth (front-back)
      const totalH = Math.max(h, 1.5);
      const shoulderW = Math.max(w, 0.45);
      const depth = Math.max(l > 2 ? 0.28 : l, 0.22); // if user gave span-like L, use sensible depth
      const bodyDepth = Math.min(depth, shoulderW * 0.55);
      const s = totalH / 1.75; // scale from 1.75 m reference

      const matShell = mk || 'aluminum_6061';
      const matJoint = 'steel_a36';
      const matVisor = 'glass';
      const matPad = 'rubber';

      // --- Feet + toes (ground contact) ---
      const footH = 0.06 * s;
      const footL = 0.22 * s;
      const footW = 0.1 * s;
      const stance = 0.14 * s; // half hip spacing
      // Left foot
      objs.push(member('foot_L', 'box', 'Left foot', [-stance, footH / 2, 0.02 * s], [footW, footH, footL], matShell, { role: 'foot' }));
      objs.push(member('toe_L1', 'box', 'Left toe big', [-stance - 0.01 * s, footH * 0.55, footL * 0.42], [0.035 * s, 0.035 * s, 0.06 * s], matPad, { role: 'toe' }));
      objs.push(member('toe_L2', 'box', 'Left toe mid', [-stance + 0.02 * s, footH * 0.55, footL * 0.45], [0.03 * s, 0.03 * s, 0.05 * s], matPad, { role: 'toe' }));
      objs.push(member('toe_L3', 'box', 'Left toe outer', [-stance + 0.045 * s, footH * 0.5, footL * 0.4], [0.025 * s, 0.025 * s, 0.04 * s], matPad, { role: 'toe' }));
      // Right foot
      objs.push(member('foot_R', 'box', 'Right foot', [stance, footH / 2, 0.02 * s], [footW, footH, footL], matShell, { role: 'foot' }));
      objs.push(member('toe_R1', 'box', 'Right toe big', [stance + 0.01 * s, footH * 0.55, footL * 0.42], [0.035 * s, 0.035 * s, 0.06 * s], matPad, { role: 'toe' }));
      objs.push(member('toe_R2', 'box', 'Right toe mid', [stance - 0.02 * s, footH * 0.55, footL * 0.45], [0.03 * s, 0.03 * s, 0.05 * s], matPad, { role: 'toe' }));
      objs.push(member('toe_R3', 'box', 'Right toe outer', [stance - 0.045 * s, footH * 0.5, footL * 0.4], [0.025 * s, 0.025 * s, 0.04 * s], matPad, { role: 'toe' }));

      // --- Lower legs (shins) ---
      const shinH = 0.38 * s;
      const shinR = 0.045 * s;
      const shinY = footH + shinH / 2;
      objs.push(member('shin_L', 'column', 'Left shin', [-stance, shinY, 0], [shinR, shinH, shinR], matShell, { role: 'leg' }));
      objs.push(member('shin_R', 'column', 'Right shin', [stance, shinY, 0], [shinR, shinH, shinR], matShell, { role: 'leg' }));
      // ankles
      objs.push(member('ankle_L', 'sphere', 'Left ankle', [-stance, footH + 0.02 * s, 0], [0.05 * s, 0.05 * s, 0.05 * s], matJoint));
      objs.push(member('ankle_R', 'sphere', 'Right ankle', [stance, footH + 0.02 * s, 0], [0.05 * s, 0.05 * s, 0.05 * s], matJoint));

      // --- Knees ---
      const kneeY = footH + shinH;
      objs.push(member('knee_L', 'sphere', 'Left knee', [-stance, kneeY, 0], [0.065 * s, 0.065 * s, 0.065 * s], matJoint));
      objs.push(member('knee_R', 'sphere', 'Right knee', [stance, kneeY, 0], [0.065 * s, 0.065 * s, 0.065 * s], matJoint));

      // --- Thighs ---
      const thighH = 0.38 * s;
      const thighY = kneeY + thighH / 2;
      objs.push(member('thigh_L', 'column', 'Left thigh', [-stance, thighY, 0], [0.055 * s, thighH, 0.055 * s], matShell, { role: 'leg' }));
      objs.push(member('thigh_R', 'column', 'Right thigh', [stance, thighY, 0], [0.055 * s, thighH, 0.055 * s], matShell, { role: 'leg' }));

      // --- Hips / pelvis ---
      const hipY = kneeY + thighH;
      objs.push(member('pelvis', 'box', 'Pelvis', [0, hipY + 0.06 * s, 0], [shoulderW * 0.7, 0.14 * s, bodyDepth * 0.9], matShell, { role: 'hip' }));
      objs.push(member('hip_L', 'sphere', 'Left hip joint', [-stance, hipY, 0], [0.07 * s, 0.07 * s, 0.07 * s], matJoint));
      objs.push(member('hip_R', 'sphere', 'Right hip joint', [stance, hipY, 0], [0.07 * s, 0.07 * s, 0.07 * s], matJoint));

      // --- Torso ---
      const torsoH = 0.42 * s;
      const torsoY = hipY + 0.14 * s + torsoH / 2;
      objs.push(member('torso', 'box', 'Torso', [0, torsoY, 0], [shoulderW * 0.75, torsoH, bodyDepth], matShell, { role: 'torso' }));
      objs.push(member('chest', 'box', 'Chest plate', [0, torsoY + 0.05 * s, bodyDepth * 0.35], [shoulderW * 0.55, torsoH * 0.55, 0.04 * s], matJoint, { role: 'armor' }));
      // core / battery pack on back
      objs.push(member('backpack', 'box', 'Power pack', [0, torsoY, -bodyDepth * 0.4], [shoulderW * 0.4, torsoH * 0.5, 0.08 * s], matShell));

      // --- Shoulders ---
      const shoulderY = torsoY + torsoH / 2 - 0.04 * s;
      const armX = shoulderW / 2 + 0.02 * s;
      objs.push(member('shoulder_L', 'sphere', 'Left shoulder', [-armX, shoulderY, 0], [0.08 * s, 0.08 * s, 0.08 * s], matJoint));
      objs.push(member('shoulder_R', 'sphere', 'Right shoulder', [armX, shoulderY, 0], [0.08 * s, 0.08 * s, 0.08 * s], matJoint));

      // --- Upper arms ---
      const uArmH = 0.28 * s;
      const uArmY = shoulderY - uArmH / 2 - 0.02 * s;
      objs.push(member('uarm_L', 'column', 'Left upper arm', [-armX, uArmY, 0], [0.045 * s, uArmH, 0.045 * s], matShell, { role: 'arm' }));
      objs.push(member('uarm_R', 'column', 'Right upper arm', [armX, uArmY, 0], [0.045 * s, uArmH, 0.045 * s], matShell, { role: 'arm' }));

      // --- Elbows ---
      const elbowY = uArmY - uArmH / 2;
      objs.push(member('elbow_L', 'sphere', 'Left elbow', [-armX, elbowY, 0], [0.055 * s, 0.055 * s, 0.055 * s], matJoint));
      objs.push(member('elbow_R', 'sphere', 'Right elbow', [armX, elbowY, 0], [0.055 * s, 0.055 * s, 0.055 * s], matJoint));

      // --- Forearms ---
      const fArmH = 0.26 * s;
      const fArmY = elbowY - fArmH / 2;
      objs.push(member('farm_L', 'column', 'Left forearm', [-armX, fArmY, 0.02 * s], [0.04 * s, fArmH, 0.04 * s], matShell, { role: 'arm' }));
      objs.push(member('farm_R', 'column', 'Right forearm', [armX, fArmY, 0.02 * s], [0.04 * s, fArmH, 0.04 * s], matShell, { role: 'arm' }));

      // --- Hands + fingers ---
      const handY = fArmY - fArmH / 2 - 0.04 * s;
      objs.push(member('hand_L', 'box', 'Left hand', [-armX, handY, 0.03 * s], [0.07 * s, 0.09 * s, 0.04 * s], matShell, { role: 'hand' }));
      objs.push(member('hand_R', 'box', 'Right hand', [armX, handY, 0.03 * s], [0.07 * s, 0.09 * s, 0.04 * s], matShell, { role: 'hand' }));
      for (let i = 0; i < 4; i++) {
        const fx = (i - 1.5) * 0.018 * s;
        objs.push(member(`fing_L${i}`, 'box', `L finger ${i + 1}`, [-armX + fx, handY - 0.06 * s, 0.05 * s], [0.014 * s, 0.05 * s, 0.014 * s], matPad));
        objs.push(member(`fing_R${i}`, 'box', `R finger ${i + 1}`, [armX + fx, handY - 0.06 * s, 0.05 * s], [0.014 * s, 0.05 * s, 0.014 * s], matPad));
      }

      // --- Neck ---
      const neckH = 0.08 * s;
      const neckY = torsoY + torsoH / 2 + neckH / 2;
      objs.push(member('neck', 'column', 'Neck', [0, neckY, 0], [0.05 * s, neckH, 0.05 * s], matJoint, { role: 'neck' }));

      // --- Head ---
      const headH = 0.22 * s;
      const headY = neckY + neckH / 2 + headH / 2;
      objs.push(member('head', 'box', 'Head', [0, headY, 0], [0.18 * s, headH, 0.2 * s], matShell, { role: 'head' }));
      // visor / face plate
      objs.push(member('visor', 'plate', 'Visor', [0, headY + 0.02 * s, 0.1 * s], [0.14 * s, 0.08 * s, 0.02 * s], matVisor, { role: 'face' }));
      // eyes
      objs.push(member('eye_L', 'sphere', 'Left eye', [-0.04 * s, headY + 0.03 * s, 0.11 * s], [0.025 * s, 0.025 * s, 0.025 * s], matVisor));
      objs.push(member('eye_R', 'sphere', 'Right eye', [0.04 * s, headY + 0.03 * s, 0.11 * s], [0.025 * s, 0.025 * s, 0.025 * s], matVisor));
      // antenna / sensor
      objs.push(member('antenna', 'column', 'Sensor mast', [0.06 * s, headY + headH / 2 + 0.06 * s, 0], [0.012 * s, 0.1 * s, 0.012 * s], matJoint));
      objs.push(member('sensor', 'sphere', 'Sensor tip', [0.06 * s, headY + headH / 2 + 0.12 * s, 0], [0.02 * s, 0.02 * s, 0.02 * s], matVisor));

      // --- Base pad under feet (so it reads as standing on ground) ---
      objs.push(member('ground_pad', 'slab', 'Stand pad', [0, 0.01, 0], [shoulderW * 1.4, 0.02, footL * 1.6], 'concrete_c30', { role: 'base' }));
      break;
    }
    case 'robot_arm': {
      // Arm-only (only when user explicitly wants arm)
      const reach = Math.max(l, h, 1.2);
      const s = reach / 1.4;
      objs.push(member('base', 'cylinder', 'Base', [0, 0.15 * s, 0], [0.18 * s, 0.3 * s, 0.18 * s], mk));
      objs.push(member('shoulder', 'sphere', 'Shoulder', [0, 0.35 * s, 0], [0.12 * s, 0.12 * s, 0.12 * s], 'steel_a36'));
      objs.push(member('upper', 'column', 'Upper arm', [0.25 * s, 0.7 * s, 0], [0.06 * s, 0.5 * s, 0.06 * s], mk, { rot: [0, 0, 55] }));
      objs.push(member('elbow', 'sphere', 'Elbow', [0.5 * s, 1.0 * s, 0], [0.09 * s, 0.09 * s, 0.09 * s], 'steel_a36'));
      objs.push(member('fore', 'column', 'Forearm', [0.85 * s, 1.15 * s, 0], [0.05 * s, 0.45 * s, 0.05 * s], mk, { rot: [0, 0, 70] }));
      objs.push(member('wrist', 'sphere', 'Wrist', [1.15 * s, 1.25 * s, 0], [0.07 * s, 0.07 * s, 0.07 * s], 'steel_a36'));
      objs.push(member('grip_L', 'box', 'Gripper L', [1.3 * s, 1.25 * s, 0.04 * s], [0.12 * s, 0.03 * s, 0.03 * s], mk));
      objs.push(member('grip_R', 'box', 'Gripper R', [1.3 * s, 1.25 * s, -0.04 * s], [0.12 * s, 0.03 * s, 0.03 * s], mk));
      break;
    }
    default: {
      // custom: single solid if nothing else
      objs.push(member('main', 'box', structure.name || 'Custom', [0, h / 2, 0], [l, h, w], mk));
    }
  }

  return objs;
}

/**
 * Rough educational analysis — clear assumptions, not a licensed design.
 */
export function analyzeStructure(structure, members = null) {
  const type = String(structure?.type || 'beam').toLowerCase();
  const L = num(structure?.dimensions?.length, 6);
  const W = num(structure?.dimensions?.width, 0.4);
  const H = num(structure?.dimensions?.height, 0.4);
  const mat = resolveMaterial(matKey(structure));
  const parts = members || expandStructure(structure);

  // Approximate volume from members
  let volume = 0;
  for (const p of parts) {
    const s = p.size || [1, 1, 1];
    const t = (p.type || '').toLowerCase();
    if (t === 'column' || t === 'pipe' || t === 'cylinder') {
      const r = s[0] || 0.1;
      volume += Math.PI * r * r * (s[1] || 1);
    } else {
      volume += (s[0] || 1) * (s[1] || 1) * (s[2] || 1);
    }
  }
  const mass = volume * mat.density; // kg (using primary mat density — approx)
  const weight_kn = (mass * 9.81) / 1000;

  // Applied loads
  const loads = Array.isArray(structure?.loads) ? structure.loads : [];
  let live_kn = 0;
  for (const ld of loads) {
    const mag = Number(ld.magnitude) || 0;
    const u = String(ld.unit || 'kN').toLowerCase();
    if (u.includes('kn/m') || u === 'kn/m') live_kn += mag * L;
    else if (u.includes('kpa') || u.includes('kn/m2')) live_kn += mag * L * W;
    else if (u.includes('n') && !u.includes('kn')) live_kn += mag / 1000;
    else live_kn += mag; // assume kN
  }
  if (!live_kn && loads.length === 0) {
    // default self-weight only note
    live_kn = weight_kn * 0.5; // placeholder live for educational FOS
  }

  // Simple beam midspan M = wL²/8 for UDL-like load, section approx b×d
  const span = Math.max(L, 1);
  const b = Math.max(W, 0.15);
  const d = Math.max(H, 0.2);
  const w_kn_m = (live_kn + weight_kn) / span;
  const M_knm = (w_kn_m * span * span) / 8;
  const I = (b * d ** 3) / 12; // m4
  const c = d / 2;
  const sigma_mpa = I > 0 ? (M_knm * 1e3 * c) / I / 1e6 : 0; // rough
  const E = mat.youngs_modulus_gpa * 1e9;
  const delta_m = E > 0 && I > 0 ? (5 * (w_kn_m * 1000) * span ** 4) / (384 * E * I) : 0;
  const fy = mat.yield_mpa || 250;
  const fos = sigma_mpa > 0.01 ? fy / sigma_mpa : 99;
  const delta_lim = span / 360;

  let risk = 'low';
  if (fos < 1.2 || delta_m > delta_lim * 2) risk = 'critical';
  else if (fos < 1.8 || delta_m > delta_lim) risk = 'high';
  else if (fos < 2.5 || delta_m > delta_lim * 0.7) risk = 'medium';

  const zones = heuristicRiskZones(type, risk);

  return {
    type,
    material: { name: mat.name, grade: mat.grade, E_gpa: mat.youngs_modulus_gpa, fy_mpa: fy, density: mat.density },
    volume_m3: round(volume, 3),
    mass_kg: round(mass, 1),
    self_weight_kn: round(weight_kn, 2),
    applied_load_kn: round(live_kn, 2),
    approx_moment_knm: round(M_knm, 2),
    approx_bending_stress_mpa: round(sigma_mpa, 2),
    approx_deflection_mm: round(delta_m * 1000, 2),
    deflection_limit_L360_mm: round(delta_lim * 1000, 2),
    factor_of_safety_approx: round(Math.min(fos, 99), 2),
    overall_risk: risk,
    assumptions: [
      'Simply-supported beam formulas used as order-of-magnitude check (M=wL²/8, δ=5wL⁴/384EI).',
      `Section treated as solid rectangle b×d ≈ ${b.toFixed(2)}×${d.toFixed(2)} m — real I-sections differ.`,
      `Material ${mat.name} (fy≈${fy} MPa, E≈${mat.youngs_modulus_gpa} GPa) from catalog — verify grade.`,
      'Not a PE stamp. Not code compliance. Educational estimate only.',
    ],
    zones,
    member_count: parts.length,
  };
}

function heuristicRiskZones(type, overall) {
  const base = [
    { label: 'Midspan / critical flexure', risk: overall === 'low' ? 'medium' : overall, position: { x: 0, y: 0.2, z: 0 }, radius: 0.35, description: 'Peak bending / deflection region' },
    { label: 'Support / shear', risk: overall === 'critical' ? 'high' : 'medium', position: { x: -0.85, y: -0.4, z: 0 }, radius: 0.28, description: 'Shear and reaction zone' },
    { label: 'Support / shear', risk: overall === 'critical' ? 'high' : 'medium', position: { x: 0.85, y: -0.4, z: 0 }, radius: 0.28, description: 'Shear and reaction zone' },
    { label: 'Connection detail', risk: 'medium', position: { x: 0.5, y: 0.5, z: 0.3 }, radius: 0.22, description: 'Connection / continuity check needed' },
  ];
  if (type === 'column') {
    return [
      { label: 'Mid-height buckling', risk: overall, position: { x: 0, y: 0, z: 0 }, radius: 0.4, description: 'Euler buckling risk under axial load' },
      { label: 'Base connection', risk: 'high', position: { x: 0, y: -0.85, z: 0 }, radius: 0.3, description: 'Base plate / anchorage' },
      { label: 'Top connection', risk: 'medium', position: { x: 0, y: 0.85, z: 0 }, radius: 0.25, description: 'Beam-column joint' },
    ];
  }
  if (type === 'bridge') {
    return [
      { label: 'Deck midspan', risk: overall, position: { x: 0, y: 0.6, z: 0 }, radius: 0.4, description: 'Deck flexure' },
      { label: 'Pier', risk: 'high', position: { x: -0.4, y: -0.3, z: 0 }, radius: 0.3, description: 'Pier axial + moment' },
      { label: 'Pier', risk: 'high', position: { x: 0.4, y: -0.3, z: 0 }, radius: 0.3, description: 'Pier axial + moment' },
      { label: 'Girder end', risk: 'medium', position: { x: -0.9, y: 0.4, z: 0 }, radius: 0.25, description: 'Bearing / shear' },
    ];
  }
  return base;
}

function round(n, d) {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

/** Merge structure meta into a full scene for the viewer */
export function structureToScene(structure, prev = {}) {
  const members = expandStructure(structure);
  const analysis = analyzeStructure(structure, members);
  const title = structure.name || structure.title || `${capitalize(structure.type || 'Structure')} model`;
  return {
    version: 2,
    title,
    description: structure.description || `Engineering model · ${analysis.member_count} members · risk ${analysis.overall_risk}`,
    units: structure.dimensions?.unit || 'm',
    ground: true,
    sky: '#0f172a',
    ambient: 0.35,
    structure: {
      name: title,
      type: structure.type || 'beam',
      description: structure.description || '',
      dimensions: {
        length: num(structure.dimensions?.length, 6),
        width: num(structure.dimensions?.width, 0.4),
        height: num(structure.dimensions?.height, 0.4),
        unit: structure.dimensions?.unit || 'm',
      },
      materials: structure.materials?.length
        ? structure.materials
        : [{ name: analysis.material.name, type: analysis.material.name, grade: analysis.material.grade, quantity: '1' }],
      loads: structure.loads || [],
      status: structure.status || 'designed',
      ai_analysis: structure.ai_analysis || null,
    },
    analysis,
    riskZones: analysis.zones,
    objects: members,
    annotations: [],
    camera: prev.camera || { target: [0, Math.max(1, num(structure.dimensions?.height, 2) / 2), 0], distance: Math.max(10, num(structure.dimensions?.length, 6) * 1.8), theta: 0.7, phi: 1.0 },
    updatedAt: new Date().toISOString(),
  };
}

function capitalize(s) {
  return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
}
