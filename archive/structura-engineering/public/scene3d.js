/**
 * Structura-style engineering structure visualizer.
 * Modes: 3D | Forces | Heat | Sim
 * Truthful CAD look — not cartoon toys.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { resolveMaterial } from './materials-db.js?v=struct1';

const MODES = ['3D', 'Forces', 'Heat', 'Sim'];
export { MODES };

const RISK_HEX = {
  critical: 0xef4444,
  high: 0xf97316,
  medium: 0xf59e0b,
  low: 0x22c55e,
};

const LOAD_HEX = {
  dead: 0x64748b,
  live: 0x3b82f6,
  wind: 0x06b6d4,
  seismic: 0xf97316,
  point: 0xa855f7,
  distributed: 0x22c55e,
  default: 0xf59e0b,
};

function makeGableRoofGeometry(width, height, depth) {
  const w = Math.max(width || 3, 0.3) / 2;
  const h = Math.max(height || 1, 0.2);
  const d = Math.max(depth || 3, 0.3) / 2;
  const positions = new Float32Array([
    -w, 0, d,  w, 0, d,  0, h, d,
    -w, 0, -d,  0, h, -d,  w, 0, -d,
    -w, 0, d,  -w, 0, -d,  w, 0, -d,
    -w, 0, d,  w, 0, -d,  w, 0, d,
    -w, 0, d,  0, h, d,  0, h, -d,
    -w, 0, d,  0, h, -d,  -w, 0, -d,
    w, 0, d,  w, 0, -d,  0, h, -d,
    w, 0, d,  0, h, -d,  0, h, d,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function loadDirection(dir) {
  switch (String(dir || 'down').toLowerCase()) {
    case 'down': case '-y': return new THREE.Vector3(0, -1, 0);
    case 'up': case '+y': return new THREE.Vector3(0, 1, 0);
    case 'left': case '-x': return new THREE.Vector3(-1, 0, 0);
    case 'right': case '+x': return new THREE.Vector3(1, 0, 0);
    case 'front': case '+z': return new THREE.Vector3(0, 0, 1);
    case 'back': case '-z': return new THREE.Vector3(0, 0, -1);
    default: return new THREE.Vector3(0, -1, 0);
  }
}

export class Scene3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.objectMap = new Map();
    this.labelSprites = [];
    this.sceneData = null;
    this.selectedId = null;
    this.onSelect = null;
    this.showLabels = false;
    this.mode = '3D';
    this.simForces = { gravity: 1.0, wind: 0, seismic: 0, windDir: 'X+' };
    this.simRunning = false;
    this.simDeflection = 0;
    this._origPositions = new Map();
    this._t0 = performance.now();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x0f172a, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.Fog(0x0f172a, 28, 70);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 500);
    this.camera.position.set(12, 8, 14);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 1.5, 0);
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 120;

    // Engineering studio lights (Structura-like)
    this.ambient = new THREE.AmbientLight(0x334155, 0.95);
    this.scene.add(this.ambient);

    this.key = new THREE.DirectionalLight(0xffffff, 1.35);
    this.key.position.set(10, 18, 10);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.camera.near = 0.5;
    this.key.shadow.camera.far = 100;
    this.key.shadow.camera.left = -30;
    this.key.shadow.camera.right = 30;
    this.key.shadow.camera.top = 30;
    this.key.shadow.camera.bottom = -30;
    this.key.shadow.bias = -0.0002;
    this.scene.add(this.key);

    this.rim = new THREE.DirectionalLight(0x3b82f6, 0.45);
    this.rim.position.set(-12, 4, -8);
    this.scene.add(this.rim);

    this.fill = new THREE.DirectionalLight(0x94a3b8, 0.35);
    this.fill.position.set(-6, 10, 12);
    this.scene.add(this.fill);

    this.grid = new THREE.GridHelper(40, 40, 0x1e3a5f, 0x1e293b);
    this.grid.position.y = 0.001;
    this.scene.add(this.grid);

    this.axes = new THREE.AxesHelper(2);
    this.scene.add(this.axes);

    // Subtle ground pad
    this.pad = new THREE.Mesh(
      new THREE.CircleGeometry(22, 48),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.1,
        roughness: 0.92,
      }),
    );
    this.pad.rotation.x = -Math.PI / 2;
    this.pad.position.y = -0.01;
    this.pad.receiveShadow = true;
    this.scene.add(this.pad);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.forceGroup = new THREE.Group();
    this.forceGroup.name = 'forces';
    this.scene.add(this.forceGroup);

    this.heatGroup = new THREE.Group();
    this.heatGroup.name = 'heat';
    this.scene.add(this.heatGroup);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    canvas.addEventListener('pointerdown', (e) => this._onPointer(e));

    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(canvas.parentElement || canvas);
    this.resize();

    const tick = () => {
      this.controls.update();
      this._tickSim();
      this._applyModeVisibility();
      this.renderer.render(this.scene, this.camera);
      this._raf = requestAnimationFrame(tick);
    };
    tick();
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    this._ro?.disconnect();
    this.renderer.dispose();
  }

  resize() {
    const parent = this.canvas.parentElement || this.canvas;
    const w = parent.clientWidth || 640;
    const h = parent.clientHeight || 480;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
  }

  setMode(mode) {
    if (!MODES.includes(mode)) return;
    this.mode = mode;
    if (mode !== 'Sim') {
      this.simRunning = false;
      this._resetDeformation();
    }
    this._applyModeVisibility();
  }

  setSimForces(f) {
    this.simForces = { ...this.simForces, ...f };
  }

  setSimRunning(on) {
    this.simRunning = !!on;
    if (!this.simRunning) this._resetDeformation();
  }

  getSimDeflection() {
    return this.simDeflection;
  }

  _onPointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.root.children, true);
    if (!hits.length) {
      this.selectedId = null;
      this.onSelect?.(null);
      this._highlight(null);
      return;
    }
    let obj = hits[0].object;
    while (obj && !obj.userData?.partId && obj.parent) obj = obj.parent;
    const id = obj?.userData?.partId;
    if (id) {
      this.selectedId = id;
      this.onSelect?.(id, this.objectMap.get(id)?.data);
      this._highlight(id);
    }
  }

  _resolveMat(data) {
    const mat = resolveMaterial(data.material || data.mat || data.type);
    let color = data.color || mat.color;
    // Prefer catalog when material known
    if (data.material) color = mat.color;
    return {
      color,
      metalness: typeof data.metalness === 'number' ? data.metalness : mat.metalness,
      roughness: typeof data.roughness === 'number' ? data.roughness : mat.roughness,
      opacity: typeof data.opacity === 'number' ? data.opacity : (mat.opacity ?? 1),
    };
  }

  _makeMat(data) {
    const m = this._resolveMat(data);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(m.color),
      metalness: THREE.MathUtils.clamp(m.metalness, 0, 1),
      roughness: THREE.MathUtils.clamp(m.roughness, 0.04, 1),
      transparent: m.opacity < 0.99,
      opacity: m.opacity,
      flatShading: false,
    });
    if (m.opacity < 0.9) {
      mat.transparent = true;
      mat.depthWrite = false;
      mat.side = THREE.DoubleSide;
    }
    return mat;
  }

  _geometry(data) {
    const s = data.size || [1, 1, 1];
    const t = (data.type || 'box').toLowerCase();
    switch (t) {
      case 'sphere':
        return new THREE.SphereGeometry(s[0] || 0.5, 32, 24);
      case 'cylinder':
      case 'column':
      case 'pipe':
        return new THREE.CylinderGeometry(
          s[0] || 0.2,
          typeof s[2] === 'number' && s[2] > 0 ? s[2] : (s[0] || 0.2),
          s[1] || 1,
          32,
        );
      case 'cone':
        return new THREE.ConeGeometry(s[0] || 0.4, s[1] || 1, 32);
      case 'plane':
      case 'slab':
      case 'plate':
        return new THREE.BoxGeometry(s[0] || 2, Math.max(s[1] || 0.1, 0.04), s[2] || 2);
      case 'torus':
        return new THREE.TorusGeometry(s[0] || 0.6, s[1] || 0.12, 16, 40);
      case 'beam':
        return new THREE.BoxGeometry(s[0] || 2, s[1] || 0.3, s[2] || 0.2);
      case 'wall':
        return new THREE.BoxGeometry(s[0] || 3, s[1] || 2.5, Math.max(s[2] || 0.15, 0.08));
      case 'roof':
      case 'wedge':
      case 'prism':
        return makeGableRoofGeometry(s[0] || 4, s[1] || 1.1, s[2] || 5);
      case 'arch':
        return new THREE.TorusGeometry(Math.max((s[0] || 2) * 0.45, 0.3), Math.max(s[2] || 0.12, 0.06), 12, 32, Math.PI);
      case 'box':
      case 'cube':
      default:
        return new THREE.BoxGeometry(s[0] || 1, s[1] || 1, s[2] || 1);
    }
  }

  _placeMesh(mesh, data) {
    const pos = data.pos || [0, 0, 0];
    const rot = data.rot || [0, 0, 0];
    const t = (data.type || 'box').toLowerCase();
    mesh.position.set(pos[0] || 0, pos[1] || 0, pos[2] || 0);
    mesh.rotation.set(
      THREE.MathUtils.degToRad(rot[0] || 0),
      THREE.MathUtils.degToRad(rot[1] || 0),
      THREE.MathUtils.degToRad(rot[2] || 0),
    );
    if (t === 'arch') mesh.rotation.x = Math.PI / 2;
  }

  _clearGroup(g) {
    while (g.children.length) {
      const c = g.children[0];
      g.remove(c);
      c.traverse?.((o) => {
        o.geometry?.dispose?.();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose?.();
        }
      });
    }
  }

  _clearRoot() {
    this._clearGroup(this.root);
    this.objectMap.clear();
    this._origPositions.clear();
  }

  _extentsFromObjects(objects) {
    let maxX = 1, maxY = 1, maxZ = 1;
    for (const o of objects || []) {
      const s = o.size || [1, 1, 1];
      const p = o.pos || [0, 0, 0];
      maxX = Math.max(maxX, Math.abs(p[0]) + (s[0] || 1) / 2);
      maxY = Math.max(maxY, Math.abs(p[1]) + (s[1] || 1) / 2);
      maxZ = Math.max(maxZ, Math.abs(p[2]) + (s[2] || 1) / 2);
    }
    return { x: maxX, y: maxY, z: maxZ };
  }

  _buildForceArrows(loads, extents) {
    this._clearGroup(this.forceGroup);
    if (!loads?.length) {
      // Default gravity arrow for educational Forces mode
      loads = [{ type: 'dead', magnitude: 10, unit: 'kN', direction: 'down' }];
    }
    loads.forEach((load, idx) => {
      const dir = loadDirection(load.direction);
      const mag = Math.min(Math.max(Math.abs(load.magnitude || 5) / 12, 0.6), 4);
      const color = LOAD_HEX[String(load.type || '').toLowerCase()] || LOAD_HEX.default;
      const angle = (idx / Math.max(loads.length, 1)) * Math.PI * 2;
      const spread = Math.max(extents.x, extents.z) * 0.55;
      const origin = new THREE.Vector3(
        Math.cos(angle) * spread,
        extents.y * 0.65,
        Math.sin(angle) * spread,
      );
      const arrow = new THREE.ArrowHelper(dir, origin, mag, color, mag * 0.28, mag * 0.16);
      arrow.userData.load = load;
      this.forceGroup.add(arrow);
    });
  }

  _buildHeatmap(zones, extents) {
    this._clearGroup(this.heatGroup);
    if (!zones?.length) return;
    for (const zone of zones) {
      const risk = String(zone.risk || 'medium').toLowerCase();
      const color = RISK_HEX[risk] || RISK_HEX.medium;
      const r = (zone.radius || 0.35) * Math.max(extents.x, extents.y, extents.z) * 0.55;
      const geo = new THREE.SphereGeometry(Math.max(r, 0.25), 20, 16);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(
        (zone.position?.x || 0) * extents.x,
        Math.max(0.2, ((zone.position?.y || 0) * 0.5 + 0.5) * extents.y),
        (zone.position?.z || 0) * extents.z,
      );
      sphere.userData.zone = zone;
      this.heatGroup.add(sphere);
    }
  }

  applyScene(scene) {
    this.sceneData = scene;
    this.labelSprites = [];
    this._clearRoot();
    if (!scene) return;

    // Engineering dark sky (Structura) — override cartoon day if structure mode
    const isEng = !!(scene.structure || scene.version >= 2);
    if (isEng || !scene.sky) {
      const col = new THREE.Color(0x0f172a);
      this.renderer.setClearColor(col, 1);
      this.scene.background = col;
      this.scene.fog.color.copy(col);
    } else {
      try {
        const col = new THREE.Color(scene.sky);
        this.renderer.setClearColor(col, 1);
        this.scene.background = col;
        this.scene.fog.color.copy(col);
      } catch { /* */ }
    }

    this.grid.visible = scene.ground !== false;
    this.pad.visible = scene.ground !== false;
    this.axes.visible = true;

    for (const data of scene.objects || []) {
      const geo = this._geometry(data);
      const mat = this._makeMat(data);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.partId = data.id;
      mesh.userData.origOpacity = mat.opacity;
      mesh.userData.origTransparent = mat.transparent;
      this._placeMesh(mesh, data);

      // Wireframe overlay (engineering CAD)
      const wire = new THREE.Mesh(
        geo.clone(),
        new THREE.MeshBasicMaterial({
          color: 0x60a5fa,
          wireframe: true,
          transparent: true,
          opacity: 0.1,
        }),
      );

      // Edges
      let edges = null;
      try {
        edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo, 28),
          new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.45 }),
        );
      } catch { /* */ }

      const wrap = new THREE.Group();
      wrap.userData.partId = data.id;
      wrap.position.copy(mesh.position);
      wrap.rotation.copy(mesh.rotation);
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      wrap.add(mesh);
      wrap.add(wire);
      if (edges) wrap.add(edges);

      if (data.label && this.showLabels) {
        const sprite = this._makeLabel(data.label);
        const hh = (data.size?.[1] || 1) * 0.55 + 0.25;
        sprite.position.set(0, hh, 0);
        wrap.add(sprite);
        this.labelSprites.push(sprite);
      }

      this.root.add(wrap);
      this.objectMap.set(data.id, { mesh: wrap, data, solid: mesh });

      // Store original vertex positions for Sim mode
      const posAttr = mesh.geometry.getAttribute('position');
      if (posAttr) {
        this._origPositions.set(data.id, new Float32Array(posAttr.array));
      }
    }

    const extents = this._extentsFromObjects(scene.objects);
    const loads = scene.structure?.loads || scene.loads || [];
    this._buildForceArrows(loads, extents);
    const zones = scene.riskZones || scene.analysis?.zones || [];
    this._buildHeatmap(zones, extents);

    if (scene.camera) {
      const t = scene.camera.target || [0, 1.5, 0];
      this.controls.target.set(t[0] || 0, t[1] || 1.5, t[2] || 0);
      const dist = scene.camera.distance || 14;
      const theta = scene.camera.theta ?? 0.7;
      const phi = scene.camera.phi ?? 1.0;
      this.camera.position.set(
        this.controls.target.x + dist * Math.sin(phi) * Math.cos(theta),
        this.controls.target.y + dist * Math.cos(phi),
        this.controls.target.z + dist * Math.sin(phi) * Math.sin(theta),
      );
      this.controls.update();
    }

    this._applyModeVisibility();
    this._highlight(this.selectedId);
  }

  _applyModeVisibility() {
    const m = this.mode;
    this.forceGroup.visible = m === 'Forces';
    this.heatGroup.visible = m === 'Heat' || m === 'Sim';

    for (const { solid } of this.objectMap.values()) {
      if (!solid?.material) continue;
      const origO = solid.userData.origOpacity ?? 1;
      const origT = solid.userData.origTransparent ?? false;
      if (m === 'Forces') {
        solid.material.opacity = Math.min(0.5, origO);
        solid.material.transparent = true;
      } else if (m === 'Heat') {
        solid.material.opacity = Math.min(0.28, origO);
        solid.material.transparent = true;
      } else {
        solid.material.opacity = origO;
        solid.material.transparent = origT || origO < 0.99;
        solid.material.depthWrite = !(origO < 0.9);
      }
    }

    // Heat pulse
    if (m === 'Heat' || m === 'Sim') {
      const t = (performance.now() - this._t0) * 0.001;
      this.heatGroup.children.forEach((c, i) => {
        if (c.material) {
          c.material.opacity = 0.35 + 0.2 * Math.sin(t * 2 + i);
          c.material.emissiveIntensity = 0.4 + 0.3 * Math.abs(Math.sin(t * 2.2 + i));
        }
      });
    }

    // Forces pulse
    if (m === 'Forces') {
      const t = (performance.now() - this._t0) * 0.001;
      this.forceGroup.children.forEach((child, i) => {
        if (child.isArrowHelper || child.line) {
          const p = 0.65 + 0.35 * Math.sin(t * 2 + i);
          if (child.line?.material) child.line.material.opacity = p;
          if (child.cone?.material) child.cone.material.opacity = p;
        }
      });
    }
  }

  _tickSim() {
    if (this.mode !== 'Sim' || !this.simRunning) return;
    const t = (performance.now() - this._t0) * 0.001;
    const forces = this.simForces;
    const g = (forces.gravity || 0) * 0.1;
    const w = (forces.wind || 0) * 0.0025;
    const s = (forces.seismic || 0) * 0.15;
    let windX = 0, windZ = 0;
    if (forces.windDir === 'X+') windX = w;
    if (forces.windDir === 'X−' || forces.windDir === 'X-') windX = -w;
    if (forces.windDir === 'Z+') windZ = w;
    if (forces.windDir === 'Z−' || forces.windDir === 'Z-') windZ = -w;
    const seisX = Math.sin(t * 8) * s;
    const seisZ = Math.cos(t * 7.3) * s * 0.7;

    let maxDefl = 0;
    for (const [id, entry] of this.objectMap) {
      const mesh = entry.solid;
      if (!mesh) continue;
      const orig = this._origPositions.get(id);
      const posAttr = mesh.geometry.getAttribute('position');
      if (!orig || !posAttr) continue;
      for (let i = 0; i < posAttr.count; i++) {
        const ox = orig[i * 3];
        const oy = orig[i * 3 + 1];
        const oz = orig[i * 3 + 2];
        const normH = Math.max(0, oy + entry.mesh.position.y);
        const nx = ox + windX * normH + seisX * normH * 0.5;
        const ny = oy - g * normH * 0.35 - g * ox * ox * 0.02;
        const nz = oz + windZ * normH + seisZ * normH * 0.5;
        posAttr.setXYZ(i, nx, ny, nz);
        const d = Math.hypot(nx - ox, ny - oy, nz - oz);
        if (d > maxDefl) maxDefl = d;
      }
      posAttr.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    }
    this.simDeflection = maxDefl;
  }

  _resetDeformation() {
    for (const [id, entry] of this.objectMap) {
      const mesh = entry.solid;
      const orig = this._origPositions.get(id);
      const posAttr = mesh?.geometry?.getAttribute('position');
      if (!orig || !posAttr) continue;
      for (let i = 0; i < posAttr.count; i++) {
        posAttr.setXYZ(i, orig[i * 3], orig[i * 3 + 1], orig[i * 3 + 2]);
      }
      posAttr.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    }
    this.simDeflection = 0;
  }

  _makeLabel(text, color = '#e2e8f0') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const pad = 10;
    const label = String(text || '').slice(0, 28);
    ctx.font = '600 20px Segoe UI, system-ui, sans-serif';
    const w = Math.ceil(ctx.measureText(label).width) + pad * 2;
    const h = 34;
    canvas.width = w;
    canvas.height = h;
    ctx.font = '600 20px Segoe UI, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(15,23,42,0.88)';
    ctx.strokeStyle = 'rgba(96,165,250,0.35)';
    ctx.lineWidth = 2;
    roundRect(ctx, 1, 1, w - 2, h - 2, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pad, h / 2);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(w * 0.006, h * 0.006, 1);
    return sprite;
  }

  setShowLabels(on) {
    this.showLabels = !!on;
    if (this.sceneData) this.applyScene(this.sceneData);
  }

  _highlight(id) {
    for (const [oid, entry] of this.objectMap) {
      entry.mesh.traverse((o) => {
        if (o.isMesh && o.material && o.material.emissive) {
          o.material.emissive.setHex(oid === id ? 0x1e3a5f : 0x000000);
          o.material.emissiveIntensity = oid === id ? 0.35 : 0;
        }
      });
    }
  }

  select(id) {
    this.selectedId = id;
    this._highlight(id);
  }

  frameAll() {
    if (!this.objectMap.size) {
      this.controls.target.set(0, 1.5, 0);
      this.camera.position.set(12, 8, 14);
      this.controls.update();
      return;
    }
    const box = new THREE.Box3();
    for (const { mesh } of this.objectMap.values()) box.expandByObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    this.controls.target.copy(center);
    this.camera.position.set(
      center.x + maxDim * 1.6,
      center.y + maxDim * 0.9,
      center.z + maxDim * 1.6,
    );
    this.controls.update();
  }

  getSceneData() {
    return this.sceneData;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
