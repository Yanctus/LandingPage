import * as THREE from "three";

/* global gsap, ScrollTrigger */
gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ */
/*  Themes: "clean" (default) and "premium" — a warm, colourful        */
/*  isometric SaaS miniature-world look. Same scene, same effects.     */
/*  Select via <html data-theme="premium"> or ?theme=premium           */
/* ------------------------------------------------------------------ */

const THEMES = {
  clean: {
    bg: 0xdfe8f2,
    white: 0xf5f8fc, light: 0xe8eef7, grey: 0xd6dfeb, dark: 0xc3cedd,
    trunk: 0xcfc4b8, leaf: 0xaccbad, leafEm: 0x9dbd9e,
    plazaMat: 0xd9e2ee, water: 0xaecde2,
    hemi: 0xe9f2ff, hemiGround: 0xb8c8de, sunCol: 0xffffff,
    windowBase: "#f5f8fc", windowWin: "#c8d4e3",
    groundBase: "#e3ebf5", groundBaseHex: 0xe3ebf5,
    blotchA: "210,222,238", blotchB: "235,242,250",
    green: "196,219,198", plaza: "205,216,231",
    path: "255,255,255", dash: "160,178,200",
    speckleA: "rgba(168,184,205,0.10)", speckleB: "rgba(255,255,255,0.13)",
    pitch: "#cfe3d0", sand: "#e6dcc2", court: "#c2d6cb", courtB: "#bcc9dd",
    roofs: [], /* empty -> houses keep the neutral roof */
  },
  premium: {
    bg: 0xf3ecdf,
    white: 0xfdfaf3, light: 0xf3ead9, grey: 0xe3d8c3, dark: 0xbfae93,
    trunk: 0xa9886a, leaf: 0x7db86a, leafEm: 0x6aa858,
    plazaMat: 0xe6dcc8, water: 0x7fc0dd,
    hemi: 0xfff6e6, hemiGround: 0xd9c6a9, sunCol: 0xfff1d6,
    windowBase: "#fdfaf3", windowWin: "#cfc0a8",
    groundBase: "#ece3d1", groundBaseHex: 0xece3d1,
    blotchA: "222,210,188", blotchB: "246,239,226",
    green: "168,206,140", plaza: "226,214,194",
    path: "255,250,238", dash: "152,134,106",
    speckleA: "rgba(178,160,132,0.10)", speckleB: "rgba(255,252,244,0.14)",
    pitch: "#8cc474", sand: "#eed9a8", court: "#7fae93", courtB: "#8fa9cf",
    roofs: [0xe8806e, 0x5fb3a1, 0xe8b54d, 0x5b8dd6, 0xd97f86],
  },
};
const THEME_NAME =
  new URLSearchParams(location.search).get("theme") ||
  document.documentElement.dataset.theme ||
  "clean";
const T = THEMES[THEME_NAME] || THEMES.clean;

/* ------------------------------------------------------------------ */
/*  Renderer / scene / camera                                          */
/* ------------------------------------------------------------------ */

const container = document.getElementById("webgl");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(T.bg);
scene.fog = new THREE.Fog(T.bg, 130, 400);

const camera = new THREE.PerspectiveCamera(
  24,
  window.innerWidth / window.innerHeight,
  0.5,
  700
);

/* ------------------------------------------------------------------ */
/*  Lights                                                             */
/* ------------------------------------------------------------------ */

scene.add(new THREE.HemisphereLight(T.hemi, T.hemiGround, 1.5));

const sun = new THREE.DirectionalLight(T.sunCol, 1.05);
sun.position.set(-22, 95, 16);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -70;
sun.shadow.camera.right = 70;
sun.shadow.camera.top = 70;
sun.shadow.camera.bottom = -70;
sun.shadow.camera.far = 250;
sun.shadow.bias = -0.0006;
sun.shadow.radius = 6;
scene.add(sun);
scene.add(sun.target);

/* cool rim light from the far side gives the volumes more depth */
const rim = new THREE.DirectionalLight(0xcfe2ff, 0.4);
rim.position.set(60, 35, -70);
scene.add(rim);
scene.add(rim.target);

/* the glowing comet tints nearby geometry */
const beamLight = new THREE.PointLight(0x6fd6ff, 60, 55, 1.8);
scene.add(beamLight);

/* ------------------------------------------------------------------ */
/*  Materials & helpers                                                */
/* ------------------------------------------------------------------ */

const MAT = {
  white: new THREE.MeshStandardMaterial({ color: T.white, roughness: 0.92, emissive: T.white, emissiveIntensity: 0.16 }),
  light: new THREE.MeshStandardMaterial({ color: T.light, roughness: 0.92, emissive: T.light, emissiveIntensity: 0.14 }),
  grey: new THREE.MeshStandardMaterial({ color: T.grey, roughness: 0.92, emissive: T.grey, emissiveIntensity: 0.1 }),
  dark: new THREE.MeshStandardMaterial({ color: T.dark, roughness: 0.92 }),
  blue: new THREE.MeshStandardMaterial({
    color: 0x2b2bd6,
    roughness: 0.55,
    emissive: 0x12128a,
    emissiveIntensity: 0.35,
  }),
  trunk: new THREE.MeshStandardMaterial({ color: T.trunk, roughness: 0.95 }),
  leaf: new THREE.MeshStandardMaterial({ color: T.leaf, roughness: 0.95, emissive: T.leafEm, emissiveIntensity: 0.15 }),
  cone: new THREE.MeshStandardMaterial({ color: 0xf2b27d, roughness: 0.85, emissive: 0xd99e6c, emissiveIntensity: 0.15 }),
  plaza: new THREE.MeshStandardMaterial({ color: T.plazaMat, roughness: 1 }),
};

/* shared tinted-material cache (people, roofs, props) */
const matCache = new Map();
function cmat(hex) {
  if (!matCache.has(hex)) matCache.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85 }));
  return matCache.get(hex);
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
/* in the premium theme, roofs come in accent colours */
const roofMat = () => (T.roofs.length ? cmat(pick(T.roofs)) : MAT.light);

function box(w, h, d, mat, x = 0, y = null, z = 0, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y === null ? h / 2 : y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function prismGeometry(w, h, d) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  return geo;
}

function radialTexture(stops, size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* facade with a window grid — far more depth than flat boxes.
   also bakes a "lit windows" emissive map so a building can glow warmly
   from the inside while the beam travels through it */
function windowMaterial(cols, rows, base = T.windowBase, win = T.windowWin) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  const lc = document.createElement("canvas");
  lc.width = 256;
  lc.height = 256;
  const lctx = lc.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  lctx.fillStyle = "#000000";
  lctx.fillRect(0, 0, 256, 256);
  const cw = 256 / cols;
  const ch = 256 / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const lit = Math.random();
      ctx.fillStyle = lit < 0.12 ? "#e9f1fb" : lit < 0.8 ? win : "#b9c7d9";
      ctx.fillRect(i * cw + cw * 0.22, j * ch + ch * 0.25, cw * 0.56, ch * 0.5);
      lctx.fillStyle = lit < 0.5 ? "#ffd98a" : "#ffc868";
      lctx.fillRect(i * cw + cw * 0.22, j * ch + ch * 0.25, cw * 0.56, ch * 0.5);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const litTex = new THREE.CanvasTexture(lc);
  litTex.colorSpace = THREE.SRGBColorSpace;
  const side = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.9,
    emissiveMap: litTex,
    emissive: 0xffd98a,
    emissiveIntensity: 0,
  });
  /* box faces: +x -x +y -y +z -z */
  const arr = [side, side, MAT.white, MAT.white, side, side];
  arr.side = side;
  return arr;
}

/* window materials that glow while the comet is inside their building */
const litWindows = { hq: null, club: null, bank: null };

/* a small classic football */
function footballTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#1a2030";
  for (const [px, py] of [[20, 28], [70, 14], [112, 40], [42, 72], [96, 88], [16, 104], [64, 116]]) {
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const ballTex = footballTexture();

/* sign plaque with text */
function signMaterial(text, sub = "", w = 512, h = 128) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#c3cedd";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = "#11151c";
  ctx.textAlign = "center";
  ctx.font = `800 ${sub ? 44 : 54}px Helvetica, Arial, sans-serif`;
  ctx.fillText(text, w / 2, sub ? 58 : h / 2 + 18);
  if (sub) {
    ctx.font = "600 26px Helvetica, Arial, sans-serif";
    ctx.fillStyle = "#5c6675";
    ctx.fillText(sub, w / 2, 98);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
}

/* ------------------------------------------------------------------ */
/*  Ground with subtle texture                                         */
/* ------------------------------------------------------------------ */

/* the detailed, hand-painted ground is created after the route exists
   (it paints a walkway underneath the beam's path) */

/* ------------------------------------------------------------------ */
/*  The route                                                          */
/* ------------------------------------------------------------------ */

const JUNCTION = new THREE.Vector3(16, 0.5, 6);
const HQ_POS = { x: 70, z: 6 };
const CLUB_POS = { x: 108, z: 2 };
const FIELD = { x: 140, z: 14, len: 42, wid: 27 };
const APP_POS = { x: 178, z: -5 };
const TRAIN_POS = { x: 203, z: -17 };
const TROPHY_POS = { x: 232, z: -14 };
const BANK_POS = { x: 258, z: -4, ry: -Math.atan2(8, 12) };
const MEMBER = new THREE.Vector3(300, 0.5, 14);

const curve = new THREE.CatmullRomCurve3(
  [
    JUNCTION.clone(),
    new THREE.Vector3(24, 0.5, 14),
    new THREE.Vector3(34, 0.5, 21),
    new THREE.Vector3(46, 0.5, 23),
    new THREE.Vector3(56, 0.5, 18),
    new THREE.Vector3(62, 0.5, 10),
    new THREE.Vector3(66, 0.5, 6.4),
    new THREE.Vector3(70, 0.5, 6), /* through the HQ entrance */
    new THREE.Vector3(75, 0.5, 5.8),
    new THREE.Vector3(85, 0.5, 0),
    new THREE.Vector3(94, 0.5, -2),
    new THREE.Vector3(101, 0.5, 1),
    new THREE.Vector3(105.5, 0.5, 2),
    new THREE.Vector3(110, 0.5, 2), /* through the clubhouse */
    new THREE.Vector3(115, 0.5, 2.6),
    new THREE.Vector3(123, 0.5, 7),
    new THREE.Vector3(131, 0.5, 12),
    new THREE.Vector3(140, 0.5, 14), /* across the pitch centre */
    new THREE.Vector3(152, 0.5, 14),
    new THREE.Vector3(160.6, 0.5, 14), /* right through the east goal */
    new THREE.Vector3(169, 0.5, 11),
    new THREE.Vector3(175, 0.5, 3),
    new THREE.Vector3(178, 0.5, -4), /* past the two app users */
    new THREE.Vector3(186, 0.5, -10),
    new THREE.Vector3(196, 0.5, -13),
    new THREE.Vector3(206, 0.5, -14.5), /* past the training corner */
    new THREE.Vector3(214, 0.5, -14.3),
    new THREE.Vector3(222, 0.5, -14),
    new THREE.Vector3(226.8, 0.7, -14), /* rise steeply outside the cup... */
    new THREE.Vector3(227.6, 6.5, -14),
    new THREE.Vector3(228.8, 12.9, -14), /* ...hop over the rim... */
    new THREE.Vector3(232, 9.6, -14), /* ...dip inside the bowl... */
    new THREE.Vector3(235.2, 12.9, -14), /* ...and hop back out over the rim */
    new THREE.Vector3(236.4, 6.5, -13.8),
    new THREE.Vector3(237.2, 0.7, -13.6),
    new THREE.Vector3(241, 0.5, -12.5),
    new THREE.Vector3(247, 0.5, -10.3),
    new THREE.Vector3(252.6, 0.5, -7.6), /* the finance hall's entrance */
    new THREE.Vector3(258, 0.5, -4), /* straight through the hall */
    new THREE.Vector3(263.4, 0.5, -0.4),
    new THREE.Vector3(272, 0.5, 3.4),
    new THREE.Vector3(282, 0.5, 8),
    new THREE.Vector3(292, 0.5, 11.8),
    MEMBER.clone(), /* the member's tile: centre of the grid */
  ],
  false,
  "catmullrom",
  0.5
);

const routeSamples = [];
{
  const N = 900;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    routeSamples.push({ t, p: curve.getPointAt(t) });
  }
}
function nearestT(x, z) {
  let bt = 0;
  let bd = Infinity;
  for (const s of routeSamples) {
    const d = (s.p.x - x) ** 2 + (s.p.z - z) ** 2;
    if (d < bd) {
      bd = d;
      bt = s.t;
    }
  }
  return bt;
}

/* spots that get filled with neighbourhood life (also painted green) */
const PARKS = [
  [36, 42, 16], [58, 36, 11], [78, 30, 10], [92, 40, 12], [124, 36, 10],
  [152, 44, 14], [170, -30, 12], [190, 14, 9], [216, 12, 12], [256, -26, 12],
  [140, -28, 11], [30, -44, 12], [104, 26, 8], [244, 26, 10],
];

/* ------------------------------------------------------------------ */
/*  Ground: one big painted map — a walkway follows the whole route,   */
/*  green park zones, plaza slabs, speckle. No repeating tiles.        */
/* ------------------------------------------------------------------ */

{
  const GR = { x0: -70, z0: -160, size: 470 };
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const ctx = c.getContext("2d");
  const px = (wx) => ((wx - GR.x0) / GR.size) * 1024;
  const pz = (wz) => (1 - (wz - GR.z0) / GR.size) * 1024; /* plane v flips z */
  const S = 1024 / GR.size; /* world unit -> pixels */

  ctx.fillStyle = T.groundBase;
  ctx.fillRect(0, 0, 1024, 1024);

  /* large soft tonal blotches */
  for (let i = 0; i < 34; i++) {
    const r = 40 + Math.random() * 120;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    const tint = Math.random() < 0.5 ? T.blotchA : T.blotchB;
    g.addColorStop(0, `rgba(${tint},0.55)`);
    g.addColorStop(1, `rgba(${tint},0)`);
    ctx.save();
    ctx.translate(Math.random() * 1024, Math.random() * 1024);
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  /* pale green park zones (pitch surroundings, training corner, groves) */
  const greens = [
    [FIELD.x, FIELD.z, 42], [FIELD.x - 26, FIELD.z + 16, 18], [FIELD.x + 28, FIELD.z + 12, 16],
    [TRAIN_POS.x, TRAIN_POS.z, 22], [44, 16, 16], [88, 14, 14], [172, 20, 16], [240, -22, 14],
    ...PARKS,
  ];
  for (const [gx, gz, gr] of greens) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, gr * S);
    g.addColorStop(0, `rgba(${T.green},0.5)`);
    g.addColorStop(1, `rgba(${T.green},0)`);
    ctx.save();
    ctx.translate(px(gx), pz(gz));
    ctx.fillStyle = g;
    ctx.fillRect(-gr * S, -gr * S, gr * S * 2, gr * S * 2);
    ctx.restore();
  }

  /* plaza slabs near HQ, bank and the city block */
  ctx.fillStyle = `rgba(${T.plaza},0.5)`;
  ctx.fillRect(px(HQ_POS.x - 17), pz(HQ_POS.z + 12), 34 * S, 28 * S);
  ctx.fillRect(px(BANK_POS.x - 13), pz(BANK_POS.z + 10), 26 * S, 21 * S);
  ctx.fillRect(px(-20), pz(-6), 56 * S, 30 * S);

  /* the walkway that the beam follows: wide soft band + crisp light core */
  const drawPath = (width, style) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < routeSamples.length; i += 4) {
      const s = routeSamples[i].p;
      if (i === 0) ctx.moveTo(px(s.x), pz(s.z));
      else ctx.lineTo(px(s.x), pz(s.z));
    }
    ctx.stroke();
  };
  drawPath(9 * S, `rgba(${T.path},0.22)`);
  drawPath(4.5 * S, `rgba(${T.path},0.34)`);
  /* dashed centre line like a marked route */
  ctx.setLineDash([3 * S, 2.2 * S]);
  drawPath(0.5 * S, `rgba(${T.dash},0.55)`);
  ctx.setLineDash([]);

  /* fine speckle on top */
  for (let i = 0; i < 5200; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? T.speckleA : T.speckleB;
    const s = Math.random() * 2 + 0.5;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, s, s);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const painted = new THREE.Mesh(
    new THREE.PlaneGeometry(GR.size, GR.size),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 1 })
  );
  painted.rotation.x = -Math.PI / 2;
  painted.position.set(GR.x0 + GR.size / 2, 0.01, GR.z0 + GR.size / 2);
  painted.receiveShadow = true;
  scene.add(painted);

  /* plain backdrop plane beyond the painted area */
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 2400),
    new THREE.MeshStandardMaterial({ color: T.groundBaseHex, roughness: 1 })
  );
  backdrop.rotation.x = -Math.PI / 2;
  backdrop.position.set(140, -0.05, 20);
  backdrop.receiveShadow = true;
  scene.add(backdrop);
}

/* keep-clear zones so decoration never blocks the set pieces */
const CLEAR = [
  { x: HQ_POS.x, z: HQ_POS.z, r: 17 },
  { x: CLUB_POS.x, z: CLUB_POS.z, r: 12 },
  { x: APP_POS.x, z: APP_POS.z, r: 9 },
  { x: TRAIN_POS.x, z: TRAIN_POS.z, r: 13 },
  { x: TROPHY_POS.x, z: TROPHY_POS.z, r: 11 },
  { x: BANK_POS.x, z: BANK_POS.z, r: 14 },
  { x: MEMBER.x, z: MEMBER.z, r: 24 },
];
const tribSamples = []; /* filled when tributaries are built */
function isClear(x, z) {
  if (Math.abs(x - FIELD.x) < 34 && Math.abs(z - FIELD.z) < 26) return false;
  if (x > 114 && x < 166 && z > -14 && z < 2) return false; /* grandstand */
  for (const c of CLEAR) {
    if (Math.hypot(x - c.x, z - c.z) < c.r) return false;
  }
  let minD = Infinity;
  for (const s of routeSamples) {
    const d = Math.hypot(s.p.x - x, s.p.z - z);
    if (d < minD) minD = d;
  }
  if (minD <= 7) return false;
  for (const s of tribSamples) {
    if (Math.hypot(s.x - x, s.z - z) < 3.6) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/*  World construction                                                 */
/* ------------------------------------------------------------------ */

const world = new THREE.Group();
scene.add(world);

const doors = [];
function registerDoor(panelA, panelB, slide, wx, wz) {
  doors.push({ panelA, panelB, slide, wx, wz, td: 0, baseA: panelA.position.clone(), baseB: panelB.position.clone() });
}

/* --- skyscraper district (start) ----------------------------------- */
function skyscraper(x, z, w, h, d, ry = 0) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    windowMaterial(Math.max(3, Math.round(w / 1.4)), Math.max(6, Math.round(h / 2)))
  );
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  g.add(box(w + 0.5, 0.6, d + 0.5, MAT.grey, 0, h + 0.3, 0));
  if (h > 20) g.add(box(w * 0.45, 2.2, d * 0.45, MAT.light, w * 0.1, h + 1.7, -d * 0.1));
  /* rooftop clutter: AC units, vents, antenna */
  g.add(box(1.1, 0.55, 0.8, MAT.light, -w * 0.25, h + 0.88, d * 0.22, 0.2));
  g.add(box(0.7, 0.45, 0.7, MAT.dark, w * 0.28, h + 0.83, d * 0.28, -0.3));
  if (h > 18) {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.6, 6), MAT.dark);
    ant.position.set(-w * 0.3, h + 1.9, -d * 0.3);
    g.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), cmat(0xff6a72));
    tip.position.set(-w * 0.3, h + 3.25, -d * 0.3);
    g.add(tip);
  }
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  world.add(g);
  return { x, z, h: h + 0.6 };
}

const towers = [
  skyscraper(-6, -20, 7, 26, 7, 0.1),
  skyscraper(4, -26, 6, 31, 6, -0.05),
  skyscraper(13, -19, 6.5, 22, 6.5, 0.15),
  skyscraper(-13, -10, 6, 18, 6, 0.05),
  skyscraper(24, -25, 5.5, 17, 5.5, -0.1),
  skyscraper(31, -15, 5, 13, 5, 0.08),
];

/* --- company HQ with logo, windows, plaza and sliding doors ----------- */
function buildHQ() {
  const g = new THREE.Group();
  const towerMats = windowMaterial(5, 6);
  litWindows.hq = towerMats.side;
  const tower = new THREE.Mesh(new THREE.BoxGeometry(9, 11, 9), towerMats);
  tower.position.y = 5.5;
  tower.castShadow = true;
  tower.receiveShadow = true;
  g.add(tower);
  const annexA = new THREE.Mesh(new THREE.BoxGeometry(6, 7.5, 6), windowMaterial(4, 4, "#e8eef7", "#c2cfdf"));
  annexA.position.set(-5.5, 3.75, -7.5);
  annexA.castShadow = true;
  annexA.receiveShadow = true;
  g.add(annexA);
  const annexB = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 6), windowMaterial(3, 3, "#e8eef7", "#c2cfdf"));
  annexB.position.set(5.8, 2.5, -7);
  annexB.castShadow = true;
  annexB.receiveShadow = true;
  g.add(annexB);
  g.add(box(9.6, 0.7, 9.6, MAT.grey, 0, 11.1, 0));
  /* rooftop: AC units + antenna */
  g.add(box(1.5, 0.7, 1.1, MAT.light, 2.2, 11.8, -2, 0.15));
  g.add(box(1.0, 0.55, 1.0, MAT.dark, -2.4, 11.72, 1.8, -0.2));
  const hqAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 3, 6), MAT.dark);
  hqAnt.position.set(-3.2, 13, -3);
  g.add(hqAnt);

  for (const sgn of [-1, 1]) {
    g.add(box(0.5, 3.2, 4.6, MAT.grey, sgn * 4.45, 1.6, 0));
    g.add(box(0.3, 2.7, 3.6, MAT.dark, sgn * 4.4, 1.35, 0));
    const panelA = box(0.18, 2.6, 1.7, MAT.white, sgn * 4.68, 1.3, -0.85);
    const panelB = box(0.18, 2.6, 1.7, MAT.white, sgn * 4.68, 1.3, 0.85);
    g.add(panelA, panelB);
    registerDoor(panelA, panelB, 1.78, HQ_POS.x + sgn * 4.6, HQ_POS.z);
  }

  /* logo panel (placeholder mark — swap the canvas drawing for the real logo) */
  const emblemTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#4a35c9";
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 240, 48);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 22;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(128 - Math.cos(a) * 62, 128 - Math.sin(a) * 62);
      ctx.lineTo(128 + Math.cos(a) * 62, 128 + Math.sin(a) * 62);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const emblem = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 4.4),
    new THREE.MeshBasicMaterial({ map: emblemTex, transparent: true })
  );
  emblem.position.set(2.2, 7.4, 4.56);
  g.add(emblem);

  g.position.set(HQ_POS.x, 0, HQ_POS.z);
  return g;
}
world.add(buildHQ());

{
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(30, 24), MAT.plaza);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(HQ_POS.x, 0.03, HQ_POS.z - 2);
  plaza.receiveShadow = true;
  world.add(plaza);
}

/* --- clubhouse (Vereinsheim), clearly labelled ------------------------- */
function clubhouse(x, z) {
  const g = new THREE.Group();
  g.add(box(10, 3.4, 6.5, MAT.white));
  const roof = new THREE.Mesh(prismGeometry(6.9, 2.2, 10.4), roofMat());
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 3.4;
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  g.add(box(10.5, 0.12, 0.24, MAT.grey, 0, 5.56, 0));
  g.add(box(0.55, 1.1, 0.55, MAT.grey, -3, 5.1, 0.8));
  g.add(box(0.7, 0.12, 0.7, MAT.dark, -3, 5.7, 0.8));
  g.add(box(10.6, 0.3, 2.4, MAT.grey, 0, 0.15, 4.3));
  const clubWin = new THREE.MeshStandardMaterial({ color: T.dark, roughness: 0.7, emissive: 0xffd98a, emissiveIntensity: 0 });
  litWindows.club = clubWin;
  g.add(box(1.4, 2.2, 0.15, clubWin, -2.2, 1.1, 3.3));
  g.add(box(1.6, 0.9, 0.12, clubWin, 1.6, 1.9, 3.3));
  g.add(box(1.6, 0.9, 0.12, clubWin, 3.6, 1.9, 3.3));
  /* big VEREINSHEIM sign on the roof front */
  const sign = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.15, 0.18), [
    MAT.grey, MAT.grey, MAT.grey, MAT.grey,
    signMaterial("VEREINSHEIM"),
    MAT.grey,
  ]);
  sign.position.set(0, 4.3, 3.0);
  sign.rotation.x = -0.18;
  sign.castShadow = true;
  g.add(sign);
  /* a football waiting on the terrace */
  const cball = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 14, 12),
    new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.45 })
  );
  cball.position.set(-4.2, 0.62, 4.3);
  cball.castShadow = true;
  g.add(cball);
  /* beam doorways in the gable walls, with sliding panels */
  for (const sgn of [-1, 1]) {
    g.add(box(0.3, 2.5, 2.6, MAT.grey, sgn * 4.95, 1.25, 0));
    g.add(box(0.25, 2.4, 2.0, MAT.dark, sgn * 4.9, 1.2, 0));
    const panelA = box(0.16, 2.3, 1.0, MAT.white, sgn * 5.15, 1.15, -0.5);
    const panelB = box(0.16, 2.3, 1.0, MAT.white, sgn * 5.15, 1.15, 0.5);
    g.add(panelA, panelB);
    registerDoor(panelA, panelB, 1.05, x + sgn * 5, z);
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 6.5, 8), MAT.grey);
  pole.position.set(6.4, 3.25, 4);
  pole.castShadow = true;
  g.add(pole);
  flagMesh = box(1.7, 1.0, 0.06, MAT.blue, 7.3, 6, 4);
  flagMesh.geometry.translate(0.85, 0, 0); /* pivot at the pole */
  flagMesh.position.x = 6.45;
  g.add(flagMesh);
  g.position.set(x, 0, z);
  world.add(g);
}
let flagMesh = null;
clubhouse(CLUB_POS.x, CLUB_POS.z);

/* --- football pitch --------------------------------------------------- */
function pitchTexture() {
  const c = document.createElement("canvas");
  c.width = 840;
  c.height = 540;
  const ctx = c.getContext("2d");
  ctx.fillStyle = T.pitch;
  ctx.fillRect(0, 0, 840, 540);
  for (let i = 0; i < 10; i++) {
    if (i % 2) continue;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(i * 84, 0, 84, 540);
  }
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 800, 500);
  ctx.beginPath();
  ctx.moveTo(420, 20);
  ctx.lineTo(420, 520);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(420, 270, 70, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(20, 140, 120, 260);
  ctx.strokeRect(700, 140, 120, 260);
  ctx.strokeRect(20, 200, 50, 140);
  ctx.strokeRect(770, 200, 50, 140);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

{
  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(FIELD.len, FIELD.wid),
    new THREE.MeshStandardMaterial({ map: pitchTexture(), roughness: 1 })
  );
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.set(FIELD.x, 0.04, FIELD.z);
  pitch.receiveShadow = true;
  world.add(pitch);

  const goalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  for (const gx of [FIELD.x - FIELD.len / 2 + 0.4, FIELD.x + FIELD.len / 2 - 0.4]) {
    const goal = new THREE.Group();
    const r = 0.09;
    const post1 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.6, 8), goalMat);
    post1.position.set(0, 0.8, -2.2);
    const post2 = post1.clone();
    post2.position.z = 2.2;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 4.4, 8), goalMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.y = 1.6;
    goal.add(post1, post2, bar);
    goal.position.set(gx, 0, FIELD.z);
    world.add(goal);
  }
}

/* a ball waits on the centre line — the comet kicks it into the goal */
const kickBall = new THREE.Mesh(
  new THREE.SphereGeometry(0.32, 14, 12),
  new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.45 })
);
kickBall.position.set(146, 0.32, 14);
kickBall.castShadow = true;
world.add(kickBall);
const T_KICK = nearestT(146, 14);
const T_GOAL = T_KICK + 0.016;

/* GOAL celebration: expanding shockwave ring, particle burst, light */
const goalFx = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.strokeStyle = "rgba(140,225,255,0.95)";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(128, 128, 98, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 30;
  ctx.beginPath();
  ctx.arc(128, 128, 84, 0, Math.PI * 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const ring = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  ring.position.set(160.6, 1.4, 14);
  scene.add(ring);

  const N = 56;
  const burst = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.22, 0.22),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    N
  );
  burst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const col = new THREE.Color();
  const data = [];
  for (let i = 0; i < N; i++) {
    burst.setColorAt(i, col.setHex(i % 3 ? 0x8fe0ff : 0xffffff));
    const a = Math.random() * Math.PI * 2;
    const elv = Math.random() * 1.2;
    data.push({
      dx: Math.cos(a) * Math.cos(elv),
      dy: Math.sin(elv) + 0.3,
      dz: Math.sin(a) * Math.cos(elv),
      speed: 4 + Math.random() * 6,
      spin: Math.random() * 9,
    });
  }
  burst.visible = false;
  scene.add(burst);

  const light = new THREE.PointLight(0x9fe4ff, 0, 30, 1.8);
  light.position.set(160.6, 2, 14);
  scene.add(light);
  return { ring, burst, data, light, m4: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3() };
})();

/* --- people: little humans with legs, arms, shirts and hair ------------- */
const SKIN = [0xf0d6c0, 0xe3bd9a, 0xc98e6b, 0xf3e0cd];
const SHIRT = [0x7f9fc9, 0xd97f86, 0x8fc9a0, 0xe8e3d5, 0x6f7fae, 0xc9b27f, 0xa8c4d4, 0x2b2bd6];
const PANTS = [0x5c6675, 0x8694a8, 0x4a4f5c, 0x7a8294, 0x3e4654];
const HAIR = [0x3a3128, 0x6b5638, 0xa8825c, 0x22242a, 0x8a8d94, 0x5c4330];
const allPeople = [];

const gesturers = [];
function person(x, z, s = 1, opts = {}) {
  const g = new THREE.Group();
  const shirt = opts.shirtMat ?? cmat(pick(SHIRT));
  const pants = opts.pantsMat ?? cmat(pick(PANTS));
  const skin = cmat(pick(SKIN));
  const hair = cmat(pick(HAIR));
  const shoes = cmat(0x2e3340);
  const female = opts.female ?? Math.random() < 0.45;
  const skirt = female && Math.random() < 0.5;

  /* legs on hip pivots, with shoes — walkers can swing them */
  const legs = [];
  for (const sgn of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.058 * s, 0.3 * s, 3, 6), skirt ? skin : pants);
    leg.geometry = leg.geometry.clone();
    leg.geometry.translate(0, -0.18 * s, 0);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.06 * s, 0.17 * s), shoes);
    shoe.position.set(0, -0.36 * s, 0.03 * s);
    const hip = new THREE.Group();
    hip.position.set(sgn * 0.08 * s, 0.43 * s, 0);
    hip.add(leg);
    hip.add(shoe);
    g.add(hip);
    legs.push(hip);
  }
  /* hips / skirt */
  if (skirt) {
    const sk = new THREE.Mesh(new THREE.ConeGeometry(0.17 * s, 0.26 * s, 10), shirt);
    sk.position.y = 0.44 * s;
    g.add(sk);
  } else {
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.24 * s, 0.16 * s, 0.16 * s), pants);
    hips.position.y = 0.46 * s;
    g.add(hips);
  }
  /* torso with shoulders */
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.13 * s, 0.3 * s, 4, 8), shirt);
  torso.position.y = 0.68 * s;
  torso.castShadow = true;
  g.add(torso);
  /* neck */
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.045 * s, 0.07 * s, 8), skin);
  neck.position.y = 0.93 * s;
  g.add(neck);
  /* arms on shoulder pivots, with skin hands */
  const arms = [];
  for (const sgn of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04 * s, 0.26 * s, 3, 6), shirt);
    arm.geometry = arm.geometry.clone();
    arm.geometry.translate(0, -0.15 * s, 0);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045 * s, 8, 6), skin);
    hand.position.y = -0.31 * s;
    const pivot = new THREE.Group();
    pivot.position.set(sgn * 0.185 * s, 0.86 * s, 0);
    pivot.rotation.z = sgn * 0.14;
    pivot.userData.sgn = sgn;
    pivot.add(arm);
    pivot.add(hand);
    g.add(pivot);
    arms.push(pivot);
  }
  /* head (slightly oval) + hair variants */
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115 * s, 12, 10), skin);
  head.scale.y = 1.12;
  head.position.y = 1.06 * s;
  g.add(head);
  const style = Math.random();
  if (style > 0.12) {
    /* short hair cap */
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.122 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
    cap.position.y = 1.085 * s;
    cap.rotation.x = -0.2;
    g.add(cap);
  }
  if (female && style > 0.35) {
    /* ponytail */
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.035 * s, 0.16 * s, 3, 6), hair);
    tail.position.set(0, 1.0 * s, -0.13 * s);
    tail.rotation.x = 0.5;
    g.add(tail);
  } else if (!female && style > 0.78) {
    /* baseball cap with brim */
    const capHat = new THREE.Mesh(new THREE.SphereGeometry(0.125 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), cmat(pick(SHIRT)));
    capHat.position.y = 1.09 * s;
    g.add(capHat);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.14 * s, 0.02 * s, 0.12 * s), capHat.material);
    brim.position.set(0, 1.08 * s, 0.14 * s);
    g.add(brim);
  }

  g.position.set(x, 0, z);
  g.rotation.y = opts.face ?? Math.random() * Math.PI * 2;
  g.userData.arms = arms;
  g.userData.legs = legs;
  g.userData.swayPhase = Math.random() * Math.PI * 2;
  allPeople.push(g);
  /* some people talk with their hands */
  if (!opts.noGesture && Math.random() < 0.22) {
    gesturers.push({ pivot: arms[0], phase: Math.random() * Math.PI * 2 });
  }
  world.add(g);
  return g;
}

function crowdCluster(cx, cz, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.6 + Math.random() * 1.6;
    person(cx + Math.cos(a) * r, cz + Math.sin(a) * r, 0.85 + Math.random() * 0.3);
  }
}

/* --- grandstand, flush with the pitch's north touchline ---------------- */
const stadiumFans = [];
function grandstand(cx, frontZ, length, rows) {
  const g = new THREE.Group();
  const seatW = 0.72;
  for (let j = 0; j < rows; j++) {
    const z = frontZ - j * 1.6 - 0.8;
    const y = j * 0.6;
    g.add(box(length, 0.6, 1.6, MAT.light, 0, y + 0.3, z - frontZ));
    const n = Math.floor(length / 1.35);
    for (let i = 0; i < n; i++) {
      const sx = -length / 2 + 0.9 + i * 1.35;
      const mat = Math.random() < 0.12 ? MAT.blue : MAT.white;
      g.add(box(seatW, 0.55, 0.6, mat, sx, y + 0.875, z - frontZ - 0.35));
      if (Math.random() < 0.38) {
        /* a seated supporter: coloured shirt, skin head, hair */
        const fan = new THREE.Group();
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.3, 4, 8), cmat(pick(SHIRT)));
        torso.position.y = 0.3;
        torso.castShadow = true;
        fan.add(torso);
        const thighs = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.13, 0.34), cmat(pick(PANTS)));
        thighs.position.set(0, 0.08, 0.22);
        fan.add(thighs);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), cmat(pick(SKIN)));
        head.position.y = 0.72;
        fan.add(head);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.136, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), cmat(pick(HAIR)));
        cap.position.y = 0.74;
        fan.add(cap);
        fan.position.set(sx, y + 1.15, z - frontZ - 0.35);
        g.add(fan);
        stadiumFans.push({ grp: fan, baseY: y + 1.15, phase: Math.random() * 6 });
      }
    }
  }
  g.add(box(length, rows * 0.6 + 1.6, 0.5, MAT.white, 0, (rows * 0.6 + 1.6) / 2, -rows * 1.6 - 0.5));
  g.position.set(cx, 0, frontZ);
  world.add(g);
}
grandstand(FIELD.x, FIELD.z - FIELD.wid / 2 - 1.2, FIELD.len, 6);

for (let i = 0; i < 5; i++) {
  crowdCluster(
    FIELD.x - FIELD.len / 2 + 5 + i * 8.5 + Math.random() * 3,
    FIELD.z + FIELD.wid / 2 + 2.8 + Math.random() * 1.6,
    2 + Math.floor(Math.random() * 4)
  );
}
crowdCluster(100, 10, 3);
crowdCluster(118, -4, 2);
crowdCluster(76, 16, 3);
crowdCluster(24, 12, 3);
crowdCluster(212, -22, 2);
crowdCluster(248, 8, 3);
crowdCluster(78, 27, 3);
crowdCluster(124, 32, 2);
crowdCluster(152, 40, 3);
crowdCluster(190, 10, 2);
crowdCluster(58, 32, 2);
crowdCluster(216, 8, 2);

/* a small kick-about on the pitch (clear of the beam's centre line) */
{
  const teamA = cmat(0x2b2bd6);
  const teamB = cmat(0xd97f86);
  person(130, 7.5, 0.95, { shirtMat: teamA, face: 0.9 });
  person(133.5, 9.5, 0.95, { shirtMat: teamB, face: -2.2 });
  person(149, 19.5, 0.95, { shirtMat: teamA, face: 2.4 });
  person(121.5, 14, 0.95, { shirtMat: teamB, face: Math.PI / 2 }); /* keeper */
  const playBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 14, 12),
    new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.45 })
  );
  playBall.position.set(131.8, 0.3, 8.4);
  playBall.castShadow = true;
  world.add(playBall);
}

/* a few birds circling high above bring the sky to life */
const birds = [];
{
  const birdMat = cmat(0x6b7686);
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.42, 3, 6), birdMat);
    body.rotation.z = Math.PI / 2;
    b.add(body);
    const wings = [];
    for (const sgn of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 1.1), birdMat);
      wing.geometry = wing.geometry.clone();
      wing.geometry.translate(0, 0, sgn * 0.55);
      b.add(wing);
      wings.push(wing);
    }
    b.userData = {
      cx: 50 + Math.random() * 200,
      cz: -20 + Math.random() * 40,
      r: 14 + Math.random() * 18,
      h: 24 + Math.random() * 10,
      speed: 0.12 + Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2,
      flap: 6 + Math.random() * 3,
      wings,
    };
    scene.add(b);
    birds.push(b);
  }
}

/* pedestrians that actually walk — short patrols beside the route */
const walkers = [];
{
  const UPv = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 10; i++) {
    const tt = 0.06 + Math.random() * 0.88;
    const p = curve.getPointAt(tt);
    const tan = curve.getTangentAt(tt);
    const side = new THREE.Vector3().crossVectors(tan, UPv).normalize();
    const off = (Math.random() < 0.5 ? -1 : 1) * (4.5 + Math.random() * 3);
    const ax = p.x + side.x * off - tan.x * 5;
    const az = p.z + side.z * off - tan.z * 5;
    const bx = p.x + side.x * off + tan.x * 5;
    const bz = p.z + side.z * off + tan.z * 5;
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    if (Math.abs(mx - FIELD.x) < 34 && Math.abs(mz - FIELD.z) < 26) continue;
    if (mx > 114 && mx < 166 && mz > -14 && mz < 2) continue;
    const w = person(ax, az, 0.9 + Math.random() * 0.25, { noGesture: true });
    walkers.push({ g: w, ax, az, bx, bz, speed: 0.045 + Math.random() * 0.04, phase: Math.random() });
  }
}

/* --- trees, hedges, bushes ---------------------------------------------- */
function tree(x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.24 * s, 1.6 * s, 8), MAT.trunk);
  trunk.position.y = 0.8 * s;
  trunk.castShadow = true;
  g.add(trunk);
  const blobs = [
    [0, 2.4, 0, 1.15],
    [0.6, 1.9, 0.2, 0.8],
    [-0.55, 2.0, -0.15, 0.75],
  ];
  for (const [bx, by, bz, br] of blobs) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(br * s, 12, 10), MAT.leaf);
    leaf.position.set(bx * s, by * s, bz * s);
    leaf.castShadow = true;
    g.add(leaf);
  }
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * Math.PI;
  world.add(g);
}

function bush(x, z, s = 1) {
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.7 * s, 10, 8), MAT.leaf);
  leaf.position.set(x, 0.5 * s, z);
  leaf.scale.y = 0.75;
  leaf.castShadow = true;
  world.add(leaf);
}

function hedge(x, z, n, ry = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), MAT.leaf);
    leaf.position.set(i * 0.85, 0.45, 0);
    leaf.scale.y = 0.8;
    leaf.castShadow = true;
    g.add(leaf);
  }
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  world.add(g);
}

/* --- street furniture ---------------------------------------------------- */
function lamp(x, z) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.2, 8), MAT.grey);
  pole.position.y = 1.6;
  pole.castShadow = true;
  g.add(pole);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xfff7dd, emissive: 0xfff3c8, emissiveIntensity: 0.9, roughness: 0.4 })
  );
  head.position.y = 3.3;
  g.add(head);
  g.position.set(x, 0, z);
  world.add(g);
}

function bench(x, z, ry = 0) {
  const g = new THREE.Group();
  g.add(box(1.7, 0.1, 0.45, MAT.trunk, 0, 0.45, 0));
  g.add(box(1.7, 0.45, 0.08, MAT.trunk, 0, 0.7, -0.22));
  g.add(box(0.1, 0.45, 0.4, MAT.grey, -0.7, 0.22, 0));
  g.add(box(0.1, 0.45, 0.4, MAT.grey, 0.7, 0.22, 0));
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  world.add(g);
}

function car(x, z, ry = 0) {
  const g = new THREE.Group();
  const bodyMat = Math.random() < 0.4 ? MAT.white : Math.random() < 0.5 ? MAT.grey : MAT.dark;
  g.add(box(2.1, 0.55, 1.0, bodyMat, 0, 0.5, 0));
  g.add(box(1.15, 0.42, 0.92, MAT.light, -0.1, 0.98, 0));
  for (const [wx, wz] of [[-0.7, 0.5], [-0.7, -0.5], [0.7, 0.5], [0.7, -0.5]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.18, 10), MAT.dark);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 0.2, wz);
    g.add(wheel);
  }
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  world.add(g);
}

function house(x, z, ry = 0, s = 1) {
  const g = new THREE.Group();
  g.add(box(4.2 * s, 2.6 * s, 5.2 * s, MAT.white));
  const roof = new THREE.Mesh(prismGeometry(4.5 * s, 1.7 * s, 5.6 * s), roofMat());
  roof.position.y = 2.6 * s;
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  /* ridge cap, chimney with crown, door step and window sills */
  g.add(box(0.2 * s, 0.1 * s, 5.7 * s, MAT.grey, 0, 4.31 * s, 0));
  g.add(box(0.45 * s, 0.95 * s, 0.45 * s, MAT.grey, 1.25 * s, 3.65 * s, -1.2 * s));
  g.add(box(0.6 * s, 0.12 * s, 0.6 * s, MAT.dark, 1.25 * s, 4.16 * s, -1.2 * s));
  g.add(box(0.9 * s, 1.6 * s, 0.1, MAT.dark, 0.8 * s, 0.8 * s, 2.62 * s));
  g.add(box(1.1 * s, 0.1 * s, 0.5 * s, MAT.grey, 0.8 * s, 0.05 * s, 2.85 * s));
  g.add(box(1.1 * s, 0.8 * s, 0.1, MAT.dark, -1.1 * s, 1.5 * s, 2.62 * s));
  g.add(box(1.2 * s, 0.08 * s, 0.16 * s, MAT.grey, -1.1 * s, 1.06 * s, 2.66 * s));
  g.add(box(0.9 * s, 0.7 * s, 0.1, MAT.dark, 0, 1.5 * s, -2.62 * s));
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  world.add(g);
}

/* HQ surroundings */
{
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(13, 8), new THREE.MeshStandardMaterial({ color: 0xcdd8e6, roughness: 1 }));
  lot.rotation.x = -Math.PI / 2;
  lot.position.set(HQ_POS.x - 1, 0.05, HQ_POS.z + 12.5);
  lot.receiveShadow = true;
  world.add(lot);
  car(HQ_POS.x - 5, HQ_POS.z + 11.5, 0.04);
  car(HQ_POS.x - 2, HQ_POS.z + 11.5, -0.06);
  car(HQ_POS.x + 1, HQ_POS.z + 11.5, 0.02);
  car(HQ_POS.x + 4, HQ_POS.z + 13.8, 0.6);

  hedge(HQ_POS.x - 13, HQ_POS.z + 6, 7, 1.2);
  hedge(HQ_POS.x + 9, HQ_POS.z + 9, 6, 0.2);
  bench(HQ_POS.x - 8, HQ_POS.z + 7.5, 0.4);
  bench(HQ_POS.x + 10, HQ_POS.z + 3, -1.1);
  lamp(HQ_POS.x - 11, HQ_POS.z + 9);
  lamp(HQ_POS.x + 12, HQ_POS.z + 7);
  tree(HQ_POS.x - 15, HQ_POS.z - 3, 1.1);
  tree(HQ_POS.x + 14, HQ_POS.z + 11, 0.9);
  tree(HQ_POS.x + 16, HQ_POS.z - 5, 1.2);
  bush(HQ_POS.x - 9, HQ_POS.z + 4.5, 1.1);
  bush(HQ_POS.x + 8, HQ_POS.z + 6.2, 0.9);
  world.add(box(6, 9, 6, MAT.white, HQ_POS.x + 19, null, HQ_POS.z + 13, -0.2));
}

/* residential pockets along the route */
house(48, 6, 0.4);
house(54, 0, 0.2, 0.9);
house(88, 10, -0.3);
house(95, 14, 0.1, 1.1);
house(170, 18, -0.2);
house(177, 23, 0.3, 0.9);
house(244, -22, 0.15);
house(208, 4, -0.4, 0.9);

/* ------------------------------------------------------------------ */
/*  Neighbourhood life: districts, pond, playground, courts, gardens   */
/*  — fills the empty plains so the world feels inhabited              */
/* ------------------------------------------------------------------ */

function district(cx, cz) {
  const n = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    house(
      cx + (i % 2) * 7.5 - 3.75 + Math.random() * 2,
      cz + Math.floor(i / 2) * 7.5 - 3.75 + Math.random() * 2,
      Math.random() * 0.6 - 0.3,
      0.8 + Math.random() * 0.35
    );
  }
  hedge(cx - 5.5, cz + 5, 5, Math.random() * 1.2);
  tree(cx + 6, cz - 4.5, 0.9 + Math.random() * 0.4);
  bush(cx - 6, cz - 4, 0.9);
  if (Math.random() < 0.7) lamp(cx, cz - 6.5);
  if (Math.random() < 0.7) bench(cx + 4.5, cz + 5.5, Math.random());
  if (Math.random() < 0.5) car(cx - 6.5, cz + 1, 1.55);
}

function flatCanvasCourt(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = 64 * w;
  c.height = 64 * h;
  const ctx = c.getContext("2d");
  draw(ctx, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 1 })
  );
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

function tennisCourt(x, z, ry = 0) {
  const court = flatCanvasCourt(12, 6, (ctx, w, h) => {
    ctx.fillStyle = T.court;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.strokeRect(28, 28, w - 56, h - 56);
    ctx.beginPath();
    ctx.moveTo(w / 2, 28);
    ctx.lineTo(w / 2, h - 28);
    ctx.moveTo(28, h / 2);
    ctx.lineTo(w - 28, h / 2);
    ctx.stroke();
  });
  court.position.set(x, 0.05, z);
  court.rotation.z = ry;
  world.add(court);
  const net = box(0.08, 0.55, 5.4, MAT.dark, x, 0.28, z, ry);
  world.add(net);
  lamp(x - 7, z + 3.8);
}

function basketballCourt(x, z, ry = 0) {
  const court = flatCanvasCourt(9, 6, (ctx, w, h) => {
    ctx.fillStyle = T.courtB;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(20, h / 2 - 60, 90, 120);
    ctx.strokeRect(w - 110, h / 2 - 60, 90, 120);
  });
  court.position.set(x, 0.05, z);
  court.rotation.z = ry;
  world.add(court);
  for (const sgn of [-1, 1]) {
    const hoop = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.6, 8), MAT.grey);
    pole.position.y = 1.3;
    hoop.add(pole);
    const board = box(0.08, 0.7, 1.0, MAT.white, sgn * -0.3, 2.5, 0);
    hoop.add(board);
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 16), MAT.cone);
    ringM.rotation.x = Math.PI / 2;
    ringM.position.set(sgn * -0.55, 2.2, 0);
    hoop.add(ringM);
    hoop.position.set(x + sgn * (4.5 * Math.cos(ry)), 0, z - sgn * (4.5 * Math.sin(ry)));
    hoop.rotation.y = ry + (sgn < 0 ? Math.PI : 0);
    world.add(hoop);
  }
}

function playground(x, z) {
  const sand = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 22),
    new THREE.MeshStandardMaterial({ color: T.sand, roughness: 1 })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(x, 0.045, z);
  world.add(sand);
  /* slide */
  const slide = new THREE.Group();
  slide.add(box(0.5, 1.4, 0.5, MAT.grey, 0, null, 0));
  const ramp = box(0.55, 0.08, 2.4, cmat(0xd97f86), 0, 0.95, 1.25);
  ramp.rotation.x = 0.55;
  slide.add(ramp);
  slide.position.set(x - 1.2, 0, z - 0.8);
  world.add(slide);
  /* swing */
  const swing = new THREE.Group();
  for (const sgn of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.0, 8), MAT.grey);
    leg.position.set(sgn * 1.1, 1.0, 0);
    swing.add(leg);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 8), MAT.grey);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 2.0;
  swing.add(bar);
  for (const sx of [-0.45, 0.45]) {
    swing.add(box(0.04, 1.1, 0.04, MAT.dark, sx, 1.4, 0));
    swing.add(box(0.4, 0.06, 0.2, cmat(0x5b8dd6), sx, 0.85, 0));
  }
  swing.position.set(x + 1.6, 0, z + 1.2);
  swing.rotation.y = 0.4;
  world.add(swing);
  bench(x - 3.2, z + 2.6, 0.6);
  tree(x + 4, z - 2.5, 0.9);
}

function allotments(x, z, ry = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const plot = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 1.8),
        new THREE.MeshStandardMaterial({ color: (i + j) % 2 ? 0xcfe0c2 : 0xd9c9a8, roughness: 1 })
      );
      plot.rotation.x = -Math.PI / 2;
      plot.position.set(i * 3.0 - 3, 0.05, j * 2.2 - 1.1);
      g.add(plot);
    }
  }
  const hut = box(1.3, 1.1, 1.1, MAT.white, 4.6, null, 0);
  g.add(hut);
  const hutRoof = new THREE.Mesh(prismGeometry(1.5, 0.6, 1.3), roofMat());
  hutRoof.position.set(4.6, 1.1, 0);
  g.add(hutRoof);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  world.add(g);
  hedge(x - 4, z + 2.8, 6, ry);
}

function grove(cx, cz, n = 5, spread = 7) {
  for (let i = 0; i < n; i++) {
    tree(cx + (Math.random() - 0.5) * spread * 2, cz + (Math.random() - 0.5) * spread * 2, 0.75 + Math.random() * 0.6);
  }
}

district(36, 42);
district(92, 40);
district(152, 44);
district(216, 12);
district(256, -26);
grove(58, 36, 4, 5);
bench(58, 32, 0.3);
playground(78, 30);
tennisCourt(124, 36, 0.08);
basketballCourt(190, 14, -0.15);
allotments(170, -30, 0.1);
grove(140, -28, 6);
grove(30, -44, 7);
grove(104, 26, 4, 5);
grove(244, 26, 5);
grove(20, 28, 4, 5);

/* --- scene: a giant glowing phone, supporters gathered around it -------- */
const phoneScreens = [];
{
  /* app UI mock for the screen */
  const ui = document.createElement("canvas");
  ui.width = 256;
  ui.height = 512;
  const ctx = ui.getContext("2d");
  ctx.fillStyle = "#f3f6fb";
  ctx.fillRect(0, 0, 256, 512);
  ctx.fillStyle = "#2b2bd6";
  ctx.fillRect(0, 0, 256, 88);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 30px Helvetica, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("VereinsKern\u203A", 18, 56);
  for (let i = 0; i < 3; i++) {
    const y = 112 + i * 102;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(16, y, 224, 84, 14);
    ctx.fill();
    ctx.fillStyle = i === 0 ? "#66ccff" : i === 1 ? "#8fc9a0" : "#ffb35c";
    ctx.beginPath();
    ctx.arc(48, y + 42, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c3cedd";
    ctx.fillRect(82, y + 22, 130, 13);
    ctx.fillRect(82, y + 48, 88, 11);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 440, 256, 72);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 1 ? "#2b2bd6" : "#c3cedd";
    ctx.beginPath();
    ctx.arc(64 + i * 64, 476, 11, 0, Math.PI * 2);
    ctx.fill();
  }
  const uiTex = new THREE.CanvasTexture(ui);
  uiTex.colorSpace = THREE.SRGBColorSpace;

  const phone = new THREE.Group();
  const frame = box(2.5, 4.9, 0.3, cmat(0x1a2030), 0, 2.45, 0);
  phone.add(frame);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 4.5),
    new THREE.MeshStandardMaterial({
      map: uiTex,
      emissive: 0xffffff,
      emissiveMap: uiTex,
      emissiveIntensity: 0.5,
      roughness: 0.35,
    })
  );
  screen.position.set(0, 2.45, 0.17);
  screen.userData.base = 0.5;
  phone.add(screen);
  phoneScreens.push(screen);
  /* soft glow light in front of the screen */
  const screenLight = new THREE.PointLight(0x86c8ff, 9, 11, 1.8);
  screenLight.position.set(0, 2.6, 1.6);
  phone.add(screenLight);
  phone.position.set(178.6, 0, -7.4);
  phone.rotation.y = -0.73; /* facing the camera side */
  phone.rotation.x = -0.05;
  world.add(phone);

  /* supporters looking up at the big screen */
  const watchers = [
    [176.7, -5.4, 1.15],
    [179.8, -5.2, 1.05],
    [178.2, -4.6, 0.95],
  ];
  for (const [wx, wz, ws] of watchers) {
    const face = Math.atan2(178.6 - wx, -7.4 - wz);
    const w = person(wx, wz, ws, { face });
    /* one arm points at the screen */
    if (Math.random() < 0.7) w.userData.arms[1].rotation.x = -1.5;
  }
  bush(APP_POS.x - 4.5, APP_POS.z - 4, 0.8);
  lamp(APP_POS.x + 4.5, APP_POS.z - 4);
}

/* --- scene: 100+ training sessions -------------------------------------- */
{
  const boardTex = (() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 320;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 320);
    ctx.strokeStyle = "#c3cedd";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 310);
    ctx.fillStyle = "#11151c";
    ctx.font = "800 92px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("100+", 256, 128);
    ctx.font = "700 30px Helvetica, Arial, sans-serif";
    ctx.fillStyle = "#5c6675";
    ctx.fillText("TRAININGSEINHEITEN", 256, 178);
    ctx.strokeStyle = "#2b2bd6";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(120, 245, 18, 0, Math.PI * 2);
    ctx.moveTo(150, 245);
    ctx.lineTo(240, 245);
    ctx.lineTo(225, 232);
    ctx.moveTo(240, 245);
    ctx.lineTo(225, 258);
    ctx.stroke();
    ctx.strokeStyle = "#ff6a72";
    ctx.beginPath();
    ctx.moveTo(300, 230);
    ctx.lineTo(330, 260);
    ctx.moveTo(330, 230);
    ctx.lineTo(300, 260);
    ctx.moveTo(370, 230);
    ctx.lineTo(400, 260);
    ctx.moveTo(400, 230);
    ctx.lineTo(370, 260);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const board = new THREE.Group();
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 4.0, 0.18),
    [MAT.grey, MAT.grey, MAT.grey, MAT.grey, new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.7 }), MAT.grey]
  );
  panel.position.y = 3.1;
  panel.castShadow = true;
  board.add(panel);
  for (const sgn of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 2.4, 8), MAT.grey);
    leg.position.set(sgn * 2.6, 1.2, 0);
    leg.castShadow = true;
    board.add(leg);
  }
  board.position.set(TRAIN_POS.x, 0, TRAIN_POS.z - 3.5);
  board.rotation.y = 0.15;
  world.add(board);

  const coneGeo = new THREE.ConeGeometry(0.34, 0.7, 10);
  for (let i = 0; i < 5; i++) {
    for (const dz of [0, 2.2]) {
      const cone = new THREE.Mesh(coneGeo, MAT.cone);
      cone.position.set(TRAIN_POS.x - 5 + i * 2.4 + (dz ? 1.2 : 0), 0.35, TRAIN_POS.z + 1.5 + dz);
      cone.castShadow = true;
      world.add(cone);
    }
  }
  const ballMat = new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.45 });
  for (const [bx, bz] of [[-6.5, 3.2], [4.8, 0.6], [6.2, 3.6]]) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 12), ballMat);
    ball.position.set(TRAIN_POS.x + bx, 0.38, TRAIN_POS.z + bz);
    ball.castShadow = true;
    world.add(ball);
  }
  person(TRAIN_POS.x - 2.8, TRAIN_POS.z - 1.6, 1.15, { face: 0.4 });
  person(TRAIN_POS.x + 2.4, TRAIN_POS.z - 0.8, 1.0, { face: -2.6 });
}

/* --- trophy (Pokal), solid inside --------------------------------------- */
function trophy(x, z) {
  const g = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    g.add(box(9 - k * 2.2, 0.9, 9 - k * 2.2, k === 2 ? MAT.white : MAT.light, 0, 0.45 + k * 0.9, 0));
  }
  const pts = [];
  pts.push(new THREE.Vector2(1.7, 0));
  pts.push(new THREE.Vector2(1.7, 0.3));
  pts.push(new THREE.Vector2(0.55, 0.6));
  pts.push(new THREE.Vector2(0.45, 1.7));
  pts.push(new THREE.Vector2(1.2, 2.3));
  pts.push(new THREE.Vector2(2.0, 3.4));
  pts.push(new THREE.Vector2(2.4, 4.7));
  pts.push(new THREE.Vector2(2.55, 5.7));
  pts.push(new THREE.Vector2(2.4, 5.8));
  pts.push(new THREE.Vector2(2.3, 5.55));
  const cupMat = MAT.white.clone();
  cupMat.side = THREE.DoubleSide; /* the bowl must look solid from inside */
  const cup = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), cupMat);
  cup.position.y = 2.7;
  cup.scale.setScalar(1.5);
  cup.castShadow = true;
  cup.receiveShadow = true;
  g.add(cup);
  /* handles sit fully outside the bowl so nothing pokes into the cup */
  for (const sgn of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.26, 10, 28), MAT.white);
    handle.position.set(sgn * 4.65, 8.7, 0);
    handle.castShadow = true;
    g.add(handle);
  }
  g.position.set(x, 0, z);
  world.add(g);
}
trophy(TROPHY_POS.x, TROPHY_POS.z);

/* --- finance hall (Beiträge & Finanzen): classical bank ------------------ */
function bank() {
  const { x, z, ry } = BANK_POS;
  const g = new THREE.Group();
  /* two shallow steps */
  g.add(box(16.5, 0.3, 12, MAT.grey, 0, 0.15, 0));
  g.add(box(15.4, 0.3, 11, MAT.light, 0, 0.45, 0));
  /* hall: solid white walls, visible from inside for the first-person ride */
  const wallMat = MAT.white.clone();
  wallMat.side = THREE.DoubleSide;
  const hall = new THREE.Mesh(new THREE.BoxGeometry(13, 6.2, 9), wallMat);
  hall.position.y = 3.7;
  hall.castShadow = true;
  hall.receiveShadow = true;
  g.add(hall);
  /* interior floor */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 8.6), MAT.plaza);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.68;
  g.add(floor);
  /* pilasters + tall dark windows along both long walls */
  const bankWin = new THREE.MeshStandardMaterial({ color: T.dark, roughness: 0.7, emissive: 0xffd98a, emissiveIntensity: 0 });
  litWindows.bank = bankWin;
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const lx = -5.4 + i * 2.16;
      g.add(box(0.5, 5.4, 0.35, MAT.light, lx, 3.6, sgn * 4.62));
      if (i < 5) {
        g.add(box(1.15, 3.2, 0.12, bankWin, lx + 1.08, 4.1, sgn * 4.56));
      }
    }
  }
  /* cornice + roof + shallow dome */
  g.add(box(13.9, 0.6, 9.9, MAT.grey, 0, 7.1, 0));
  g.add(box(13.1, 0.4, 9.1, MAT.light, 0, 7.55, 0));
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2.7, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    MAT.white
  );
  dome.scale.y = 0.72;
  dome.position.y = 7.7;
  dome.castShadow = true;
  g.add(dome);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.9, 10), MAT.light);
  lantern.position.y = 9.9;
  g.add(lantern);

  /* front portico: porch, four columns, architrave and pediment */
  g.add(box(8, 0.35, 3.0, MAT.light, 0, 0.62, 5.9));
  for (let i = 0; i < 4; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 5.2, 12), MAT.white);
    col.position.set(-3 + i * 2, 3.4, 6.5);
    col.castShadow = true;
    g.add(col);
    g.add(box(0.85, 0.25, 0.85, MAT.light, -3 + i * 2, 6.1, 6.5));
  }
  const architrave = box(8.4, 0.8, 3.2, MAT.white, 0, 6.6, 5.9);
  g.add(architrave);
  const pediment = new THREE.Mesh(prismGeometry(8.4, 1.6, 3.2), MAT.white);
  pediment.position.set(0, 7.0, 5.9);
  pediment.castShadow = true;
  g.add(pediment);
  /* euro medallion in the pediment */
  const euroTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#2b2bd6";
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 78px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("€", 64, 92);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const euro = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({ map: euroTex, transparent: true })
  );
  euro.position.set(0, 7.55, 7.52);
  g.add(euro);
  /* sign on the architrave, between the columns */
  const sign = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.78, 0.12), [
    MAT.grey, MAT.grey, MAT.grey, MAT.grey,
    signMaterial("BEITRÄGE", "", 512, 64),
    MAT.grey,
  ]);
  sign.position.set(0, 6.6, 7.52);
  sign.castShadow = true;
  g.add(sign);

  /* doors on both gable ends — the beam rides straight through */
  for (const sgn of [-1, 1]) {
    g.add(box(0.4, 3.4, 4.4, MAT.grey, sgn * 6.4, 1.95, 0));
    g.add(box(0.3, 3.1, 3.6, MAT.dark, sgn * 6.35, 1.85, 0));
    const panelA = box(0.16, 3.0, 1.7, MAT.white, sgn * 6.62, 1.8, -0.85);
    const panelB = box(0.16, 3.0, 1.7, MAT.white, sgn * 6.62, 1.8, 0.85);
    g.add(panelA, panelB);
    registerDoor(
      panelA,
      panelB,
      1.78,
      x + Math.cos(ry) * sgn * 6.5,
      z - Math.sin(ry) * sgn * 6.5
    );
  }
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  world.add(g);
}
bank();

/* --- member tile field (finale) ---------------------------------------- */
const tileGeo = new THREE.BoxGeometry(7.2, 1.0, 7.2);
const finaleTiles = [];
{
  const N = 5;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === 2 && j === 2) continue;
      const mat = MAT.light.clone();
      const t = new THREE.Mesh(tileGeo, mat);
      const x = MEMBER.x + (i - (N - 1) / 2) * 8.4;
      const z = MEMBER.z + (j - (N - 1) / 2) * 8.4;
      t.position.set(x, 0.5, z);
      t.castShadow = true;
      t.receiveShadow = true;
      world.add(t);
      finaleTiles.push({ mesh: t, mat, dist: Math.hypot(x - MEMBER.x, z - MEMBER.z) });
    }
  }
}
const tileEmissiveBase = new THREE.Color(0xdde6f0);
const tileEmissiveFlash = new THREE.Color(0x9fd8ff);
const tileEmissiveTmp = new THREE.Color();

const memberRings = (() => {
  const g = new THREE.Group();
  const tile = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.3, 7.2), MAT.blue);
  tile.position.y = 0.65;
  tile.castShadow = true;
  g.add(tile);

  /* the new member: a proper little human whose jersey turns club blue */
  const memberBodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const memberPantsMat = new THREE.MeshStandardMaterial({ color: 0x3e4654, roughness: 0.85 });
  const member = person(0, 0, 1.7, { shirtMat: memberBodyMat, pantsMat: memberPantsMat, face: -0.7, noGesture: true });
  member.position.set(MEMBER.x, 1.3, MEMBER.z);

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 14),
    new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.45 })
  );
  ball.position.set(MEMBER.x + 0.95, 1.3 + 0.42, MEMBER.z + 0.55);
  ball.castShadow = true;
  ball.scale.setScalar(0.001);
  world.add(ball);

  g.position.set(MEMBER.x, 0, MEMBER.z);
  world.add(g);

  const ringTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    ctx.strokeStyle = "rgba(120,215,255,0.9)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(128, 128, 100, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(190,240,255,0.5)";
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(128, 128, 88, 0, Math.PI * 2);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();

  const rings = [];
  for (let k = 0; k < 3; k++) {
    const ring = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: ringTex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(MEMBER.x, 1.45 + k * 0.02, MEMBER.z);
    scene.add(ring);
    rings.push(ring);
  }
  rings.figure = member;
  rings.bodyMat = memberBodyMat;
  rings.ball = ball;
  rings.arms = member.userData.arms;
  return rings;
})();

/* --- confetti fountain --------------------------------------------------- */
const CONFETTI = 130;
const confetti = (() => {
  const geo = new THREE.PlaneGeometry(0.26, 0.38);
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, CONFETTI);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const palette = [0x2b2bd6, 0xffffff, 0x66ccff, 0xff6a72, 0xdfe6ee];
  const color = new THREE.Color();
  const data = [];
  for (let i = 0; i < CONFETTI; i++) {
    mesh.setColorAt(i, color.setHex(palette[i % palette.length]));
    data.push({
      angle: Math.random() * Math.PI * 2,
      radial: 1.5 + Math.random() * 5.5,
      up: 7 + Math.random() * 5,
      phase: Math.random(),
      speed: 0.4 + Math.random() * 0.25,
      spinX: (Math.random() - 0.5) * 9,
      spinY: (Math.random() - 0.5) * 9,
    });
  }
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, data };
})();
const confM4 = new THREE.Matrix4();
const confQ = new THREE.Quaternion();
const confE = new THREE.Euler();
const confP = new THREE.Vector3();
const confS = new THREE.Vector3();

/* ------------------------------------------------------------------ */
/*  Glowing beams                                                      */
/* ------------------------------------------------------------------ */

const COL = {
  cyan: new THREE.Color(0x55ccff),
  cyanHot: new THREE.Color(0xeaffff),
  coral: new THREE.Color(0xff6a72),
  coralHot: new THREE.Color(0xffe3e5),
};

const beamUniforms = { uProgress: { value: 0 } };
const tribUniforms = { uProgress: { value: 0 } };

/* the colour flips from colA to colB exactly at uSwitch (HQ entrance) */
const T_SWITCH = nearestT(HQ_POS.x, HQ_POS.z);
/* the cyan line + comet are born at the HQ's exit door */
const T_START = nearestT(HQ_POS.x + 4.6, HQ_POS.z);

function beamMaterial(intensity, tail, progressUniform, colA, colB, hot, tSwitch = T_SWITCH, tStart = 0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: progressUniform,
      uColA: { value: colA },
      uColB: { value: colB },
      uHot: { value: hot },
      uIntensity: { value: intensity },
      uTail: { value: tail },
      uSwitch: { value: tSwitch },
      uStart: { value: tStart },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uProgress, uIntensity, uTail, uSwitch, uStart;
      uniform vec3 uColA, uColB, uHot;
      varying vec2 vUv;
      void main() {
        float t = vUv.x;
        float rel = uProgress - t;
        if (rel < 0.0 || t < uStart) discard;
        float head = exp(-rel * 220.0);
        float body = exp(-rel * uTail);
        float a = (head * 1.6 + body * 0.6) * uIntensity;
        vec3 base = mix(uColA, uColB, smoothstep(uSwitch - 0.012, uSwitch + 0.012, t));
        vec3 col = mix(base, uHot, clamp(head * 1.4, 0.0, 1.0));
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/* main beam: coral until the HQ, cyan afterwards */
const mainBeamMat = (i, tail) =>
  beamMaterial(i, tail, beamUniforms.uProgress, COL.coral, COL.cyan, COL.cyanHot, T_SWITCH, T_START);
/* tributaries stay coral the whole way (switch beyond range) */
const tribBeamMat = (i, tail) =>
  beamMaterial(i, tail, tribUniforms.uProgress, COL.coral, COL.coral, COL.coralHot, 2);

const coreTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 800, 0.22, 8, false), mainBeamMat(1.4, 5.0));
const glowTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 800, 1.1, 10, false), mainBeamMat(0.32, 7.0));
const hazeTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 600, 2.4, 10, false), mainBeamMat(0.06, 9.0));
scene.add(coreTube, glowTube, hazeTube);

/* tributaries: coral lines descend from the towers, then run as a
   parallel bundle alongside the main line all the way to the HQ door */
{
  const UP = new THREE.Vector3(0, 1, 0);
  const T_DOOR = nearestT(HQ_POS.x - 1.2, HQ_POS.z); /* lanes run inside the hall */
  const T_JOIN = 0.012;
  towers.forEach((tw, i) => {
    const lane = (i - (towers.length - 1) / 2) * 0.55; /* tight, never touching */
    const pts = [];
    const p0 = curve.getPointAt(T_JOIN);
    const dir0 = new THREE.Vector3(p0.x - tw.x, 0, p0.z - tw.z).normalize();
    pts.push(new THREE.Vector3(tw.x, tw.h, tw.z));
    pts.push(new THREE.Vector3(tw.x + dir0.x * 2.2, tw.h * 0.42, tw.z + dir0.z * 2.2));
    pts.push(new THREE.Vector3(tw.x + dir0.x * 4.8, 0.5, tw.z + dir0.z * 4.8));
    const SEG = 12;
    for (let k = 0; k <= SEG; k++) {
      const tt = T_JOIN + (T_DOOR - T_JOIN) * (k / SEG);
      const cp = curve.getPointAt(tt);
      const tan = curve.getTangentAt(tt);
      const side = new THREE.Vector3().crossVectors(tan, UP).normalize();
      /* the lanes stay strictly parallel all the way into the hall */
      pts.push(new THREE.Vector3(cp.x + side.x * lane, 0.5, cp.z + side.z * lane));
    }
    const tCurve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.3);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(tCurve, 160, 0.15, 8, false), tribBeamMat(1.1, 2.0)));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(tCurve, 160, 0.6, 8, false), tribBeamMat(0.28, 2.5)));
    for (let s = 0; s <= 50; s++) tribSamples.push(tCurve.getPoint(s / 50));
  });
}

/* low city blocks — placed last so they never collide with the lines */
for (let i = 0; i < 22; i++) {
  const x = -18 + Math.random() * 54;
  const z = -34 + Math.random() * 26;
  if (towers.some((t) => Math.abs(t.x - x) < 5.5 && Math.abs(t.z - z) < 5.5)) continue;
  if (tribSamples.some((s) => Math.hypot(s.x - x, s.z - z) < 4)) continue;
  let minD = Infinity;
  for (const s of routeSamples) minD = Math.min(minD, Math.hypot(s.p.x - x, s.p.z - z));
  if (minD < 7) continue;
  world.add(box(2.5 + Math.random() * 3.5, 1.5 + Math.random() * 4, 2.5 + Math.random() * 3.5, MAT.light, x, null, z, Math.random() * 0.4));
}

/* greenery + filler along the route (after tributaries exist) */
for (let i = 0; i < 26; i++) {
  const t = Math.random();
  const p = curve.getPointAt(t);
  const a = Math.random() * Math.PI * 2;
  const r = 10 + Math.random() * 22;
  const x = p.x + Math.cos(a) * r;
  const z = p.z + Math.sin(a) * r;
  if (!isClear(x, z)) continue;
  if (Math.random() < 0.55) tree(x, z, 0.8 + Math.random() * 0.6);
  else bush(x, z, 0.8 + Math.random() * 0.6);
}
for (let i = 1; i <= 9; i++) {
  const t = i / 10;
  const p = curve.getPointAt(t);
  const tangent = curve.getTangentAt(t);
  const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
  const sgn = i % 2 ? 1 : -1;
  const x = p.x + side.x * 6.5 * sgn;
  const z = p.z + side.z * 6.5 * sgn;
  if (Math.abs(x - FIELD.x) < 34 && Math.abs(z - FIELD.z) < 26) continue;
  if (CLEAR.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
  lamp(x, z);
}
for (let i = 0; i < 18; i++) {
  const t = Math.random();
  const p = curve.getPointAt(t);
  const a = Math.random() * Math.PI * 2;
  const r = 26 + Math.random() * 26;
  const x = p.x + Math.cos(a) * r;
  const z = p.z + Math.sin(a) * r;
  if (!isClear(x, z)) continue;
  const s = 1.5 + Math.random() * 3;
  world.add(box(s, 0.8 + Math.random() * 2.4, s, MAT.light, x, null, z, Math.random()));
}
for (let i = 0; i < 5; i++) tree(FIELD.x - 22 + i * 11 + Math.random() * 3, FIELD.z + FIELD.wid / 2 + 7 + Math.random() * 3, 0.9 + Math.random() * 0.5);
tree(FIELD.x - FIELD.len / 2 - 6, FIELD.z + 4, 1.1);
tree(FIELD.x + FIELD.len / 2 + 12, FIELD.z + 9, 1.0);

/* resolve door trigger points */
for (const d of doors) d.td = nearestT(d.wx, d.wz);

/* building intervals: the comet's glow hides while it travels indoors.
   doors were registered in entry/exit pairs per building. */
const hideIntervals = [];
for (let i = 0; i + 1 < doors.length; i += 2) {
  const a = Math.min(doors[i].td, doors[i + 1].td);
  const b = Math.max(doors[i].td, doors[i + 1].td);
  hideIntervals.push([a, b]);
}
const litMatsArr = [litWindows.hq, litWindows.club, litWindows.bank];
function headVisibility(t) {
  let v = 1;
  for (const [a, b] of hideIntervals) {
    const inside =
      THREE.MathUtils.smoothstep(t, a - 0.004, a + 0.006) *
      (1 - THREE.MathUtils.smoothstep(t, b - 0.006, b + 0.004));
    v *= 1 - inside;
  }
  return v;
}

/* a ring flash at the HQ entrance marks the coral -> cyan hand-over */
const switchFlash = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  ctx.strokeStyle = "rgba(150,225,255,0.95)";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(64, 64, 50, 0, Math.PI * 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  m.position.set(HQ_POS.x + 4.8, 1.6, HQ_POS.z);
  m.rotation.y = Math.PI / 2;
  scene.add(m);
  return m;
})();

/* comet head sprites */
const glowTexBig = radialTexture([
  [0, "rgba(190,242,255,0.9)"],
  [0.35, "rgba(120,210,255,0.32)"],
  [1, "rgba(120,210,255,0)"],
]);
const glowTexCore = radialTexture([
  [0, "rgba(255,255,255,1)"],
  [0.4, "rgba(210,245,255,0.85)"],
  [1, "rgba(160,225,255,0)"],
]);

function headSprite(tex, size, opacity) {
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  );
  sp.scale.setScalar(size);
  scene.add(sp);
  return sp;
}
const headBig = headSprite(glowTexBig, 13, 0.4);
const headMid = headSprite(glowTexBig, 5.5, 0.65);
const headCore = headSprite(glowTexCore, 2.0, 0.95);

/* ------------------------------------------------------------------ */
/*  Halftone dot field — circular halo around the comet                */
/* ------------------------------------------------------------------ */

const dotData = [];
{
  const STEP = 1.9;
  const BAND = 17;
  for (let gx = 8; gx <= 322; gx += STEP) {
    let best = null;
    for (const s of routeSamples) {
      if (Math.abs(s.p.x - gx) > 8) continue;
      if (!best || Math.abs(s.p.x - gx) < Math.abs(best.p.x - gx)) best = s;
    }
    if (!best) continue;
    for (let dz = -BAND; dz <= BAND; dz += STEP) {
      if (Math.random() < 0.06) continue;
      const gz = best.p.z + dz;
      let near = best;
      let nd = Infinity;
      for (const s of routeSamples) {
        if (Math.abs(s.p.x - gx) > 8) continue;
        const d = (s.p.x - gx) ** 2 + (s.p.z - gz) ** 2;
        if (d < nd) {
          nd = d;
          near = s;
        }
      }
      const dist = Math.sqrt(nd);
      if (dist > BAND) continue;
      const fade = Math.max(0, 1 - dist / BAND);
      dotData.push({
        x: gx + (Math.random() - 0.5) * 0.25,
        z: gz + (Math.random() - 0.5) * 0.25,
        t: near.t,
        fade: fade * fade,
        size: 0.28 + fade * 1.5,
      });
    }
  }
}

const DOTS = dotData.length;
const dotGeo = new THREE.CircleGeometry(0.34, 10);
dotGeo.rotateX(-Math.PI / 2);

const mouseUniforms = {
  uMouse: { value: new THREE.Vector2(9999, 9999) },
  uMouseStr: { value: 0 },
};

const dotMat = new THREE.ShaderMaterial({
  uniforms: {
    uProgress: beamUniforms.uProgress,
    uColA: { value: new THREE.Color(0x39c2ff) },
    uColB: { value: new THREE.Color(0xd9f6ff) },
    uColCoral: { value: new THREE.Color(0xff8088) },
    uSwitch: { value: T_SWITCH },
    uMouse: mouseUniforms.uMouse,
    uMouseStr: mouseUniforms.uMouseStr,
  },
  vertexShader: /* glsl */ `
    attribute float aT;
    attribute float aFade;
    varying float vT;
    varying float vFade;
    varying vec2 vWorld;
    void main() {
      vT = aT;
      vFade = aFade;
      vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      vWorld = wp.xz;
      vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uProgress, uSwitch, uMouseStr;
    uniform vec3 uColA, uColB, uColCoral;
    uniform vec2 uMouse;
    varying float vT;
    varying float vFade;
    varying vec2 vWorld;
    void main() {
      float rel = uProgress - vT;
      /* circular halo: dots glow on BOTH sides of the head */
      float burst = exp(-abs(rel) * 26.0);
      /* a residual trail only lingers behind */
      float residual = rel > 0.0 ? 0.5 * (1.0 - smoothstep(0.04, 0.30, rel)) : 0.0;
      /* the cursor carries its own little dot halo */
      float md = length(vWorld - uMouse);
      float mglow = exp(-md * md / 20.0) * uMouseStr;
      float i = max(max(burst, residual) * vFade, mglow * max(vFade, 0.3));
      if (i < 0.004) discard;
      vec3 tone = mix(uColCoral, uColA, smoothstep(uSwitch - 0.012, uSwitch + 0.012, vT));
      vec3 col = mix(tone, uColB, clamp(max(burst, mglow) * 1.3, 0.0, 1.0));
      gl_FragColor = vec4(col, i);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const dots = new THREE.InstancedMesh(dotGeo, dotMat, DOTS);
{
  const aT = new Float32Array(DOTS);
  const aFade = new Float32Array(DOTS);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pos = new THREE.Vector3();

  for (let i = 0; i < DOTS; i++) {
    const d = dotData[i];
    pos.set(d.x, 0.07, d.z);
    sc.setScalar(d.size);
    m4.compose(pos, q, sc);
    dots.setMatrixAt(i, m4);
    aT[i] = d.t;
    aFade[i] = d.fade;
  }
  dotGeo.setAttribute("aT", new THREE.InstancedBufferAttribute(aT, 1));
  dotGeo.setAttribute("aFade", new THREE.InstancedBufferAttribute(aFade, 1));
}
scene.add(dots);

/* ambient dot grid across the WHOLE ground: invisible until the mouse
   (or its halo) passes over — so the cursor effect works everywhere,
   not just along the beam's corridor */
{
  /* coarse lookup of cells close to the route (those already have dots) */
  const CELL = 2.4;
  const nearRoute = new Set();
  for (const s of routeSamples) {
    const cx = Math.round(s.p.x / CELL);
    const cz = Math.round(s.p.z / CELL);
    const R = Math.ceil(16 / CELL);
    for (let i = -R; i <= R; i++) {
      for (let j = -R; j <= R; j++) {
        if (i * i + j * j <= R * R) nearRoute.add((cx + i) + ":" + (cz + j));
      }
    }
  }
  const pts = [];
  for (let gx = -120; gx <= 380; gx += CELL) {
    for (let gz = -180; gz <= 240; gz += CELL) {
      if (Math.random() < 0.08) continue;
      if (nearRoute.has(Math.round(gx / CELL) + ":" + Math.round(gz / CELL))) continue;
      pts.push([gx + (Math.random() - 0.5) * 0.3, gz + (Math.random() - 0.5) * 0.3]);
    }
  }
  const geo = new THREE.CircleGeometry(0.32, 8);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColA: { value: new THREE.Color(0x39c2ff) },
      uColB: { value: new THREE.Color(0xd9f6ff) },
      uMouse: mouseUniforms.uMouse,
      uMouseStr: mouseUniforms.uMouseStr,
    },
    vertexShader: /* glsl */ `
      varying vec2 vWorld;
      void main() {
        vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vWorld = wp.xz;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColA, uColB;
      uniform vec2 uMouse;
      uniform float uMouseStr;
      varying vec2 vWorld;
      void main() {
        float md = length(vWorld - uMouse);
        float i = exp(-md * md / 20.0) * uMouseStr;
        if (i < 0.004) discard;
        vec3 col = mix(uColA, uColB, clamp(i * 1.3, 0.0, 1.0));
        gl_FragColor = vec4(col, i);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const amb = new THREE.InstancedMesh(geo, mat, pts.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3(1, 1, 1);
  const pos = new THREE.Vector3();
  for (let i = 0; i < pts.length; i++) {
    pos.set(pts[i][0], 0.06, pts[i][1]);
    m4.compose(pos, q, sc);
    amb.setMatrixAt(i, m4);
  }
  amb.frustumCulled = false;
  scene.add(amb);
}

/* the mouse paints its own dot halo on the ground */
const mouseFx = { tx: 9999, tz: 9999, x: 9999, z: 9999, str: 0, lastMove: -10 };
{
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  window.addEventListener("pointermove", (e) => {
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) {
      if (mouseFx.x > 9000) {
        mouseFx.x = hit.x;
        mouseFx.z = hit.z;
      }
      mouseFx.tx = hit.x;
      mouseFx.tz = hit.z;
      mouseFx.lastMove = clock.elapsedTime;
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Camera rig driven by scroll                                        */
/* ------------------------------------------------------------------ */

const MERGE_END = 0.1;

function pAt(x, z) {
  return MERGE_END + ((nearestT(x, z) - 0.01) / 0.99) * (1 - MERGE_END);
}
const P_HQ = pAt(HQ_POS.x, HQ_POS.z);
const P_CLUB = pAt(CLUB_POS.x, CLUB_POS.z);
const P_PITCH = pAt(FIELD.x, FIELD.z);
const P_GOAL = pAt(FIELD.x + FIELD.len / 2, FIELD.z);
const P_APP = pAt(APP_POS.x, APP_POS.z + 1);
const P_TRAIN = pAt(TRAIN_POS.x, TRAIN_POS.z + 2.5);
const P_TROPHY = pAt(TROPHY_POS.x, TROPHY_POS.z);
const P_BANK = pAt(BANK_POS.x, BANK_POS.z);
/* first-person window: a little before the entry door to after the exit */
const P_BANK_IN = pAt(BANK_POS.x + Math.cos(BANK_POS.ry) * -6.5, BANK_POS.z - Math.sin(BANK_POS.ry) * -6.5);
const P_BANK_OUT = pAt(BANK_POS.x + Math.cos(BANK_POS.ry) * 6.5, BANK_POS.z - Math.sin(BANK_POS.ry) * 6.5);

const camKeys = [
  { p: 0.0, az: 2.5, el: 0.5, dist: 145 },
  { p: 0.12, az: 2.6, el: 0.65, dist: 112 },
  { p: P_HQ, az: 2.7, el: 0.78, dist: 100 },
  { p: P_CLUB, az: 2.35, el: 0.8, dist: 105 },
  { p: P_PITCH, az: 2.5, el: 1.0, dist: 130 },
  { p: P_GOAL, az: 2.4, el: 0.8, dist: 105 },
  { p: P_APP, az: 2.3, el: 0.5, dist: 40 },
  { p: P_TRAIN, az: 2.55, el: 0.68, dist: 72 },
  { p: P_TROPHY, az: 2.2, el: 0.66, dist: 96 },
  { p: P_BANK, az: 2.3, el: 0.6, dist: 60 },
  { p: Math.min(P_BANK_OUT + 0.04, 0.97), az: 2.3, el: 0.8, dist: 88 },
  { p: 1.0, az: 2.15, el: 1.05, dist: 34 },
].sort((a, b) => a.p - b.p);

function camAt(p) {
  let i = 0;
  while (i < camKeys.length - 2 && camKeys[i + 1].p < p) i++;
  const a = camKeys[i];
  const b = camKeys[i + 1];
  let f = THREE.MathUtils.clamp((p - a.p) / (b.p - a.p), 0, 1);
  f = f * f * (3 - 2 * f);
  return {
    az: THREE.MathUtils.lerp(a.az, b.az, f),
    el: THREE.MathUtils.lerp(a.el, b.el, f),
    dist: THREE.MathUtils.lerp(a.dist, b.dist, f),
  };
}

const progress = { target: 0, current: 0 };

ScrollTrigger.create({
  trigger: document.body,
  start: 0,
  end: () => document.body.scrollHeight - window.innerHeight,
  onUpdate(self) {
    progress.target = self.progress;
  },
});

/* ------------------------------------------------------------------ */
/*  Step list activation                                               */
/* ------------------------------------------------------------------ */

const stepEls = Array.from(document.querySelectorAll(".step"));
const stepThresholds = [
  0,
  P_HQ - 0.04,
  P_CLUB - 0.03,
  P_APP - 0.03,
  P_TRAIN - 0.02,
  P_BANK_IN - 0.025,
  0.955,
];
let activeStep = -1;

function setActiveStep(idx) {
  if (idx === activeStep) return;
  activeStep = idx;
  stepEls.forEach((el, i) => el.classList.toggle("active", i === idx));
}
setActiveStep(0);

/* ------------------------------------------------------------------ */
/*  Render loop                                                        */
/* ------------------------------------------------------------------ */

const clock = new THREE.Clock();
const headPos = new THREE.Vector3();
const lookPos = new THREE.Vector3();
const headTan = new THREE.Vector3();
const camTargetPos = new THREE.Vector3();
const camCurrentLook = new THREE.Vector3();
const memberWhite = new THREE.Color(0xffffff);
const memberBlue = new THREE.Color(0x2b2bd6);
const lightCoral = new THREE.Color(0xff8a8f);
const lightCyan = new THREE.Color(0x6fd6ff);
let firstFrame = true;
let tickFansReset = false;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  const k = 1 - Math.exp(-dt * 3.2);
  progress.current += (progress.target - progress.current) * k;
  const p = progress.current;

  /* phase 1: the coral bundle flows from the towers towards the HQ */
  tribUniforms.uProgress.value = THREE.MathUtils.clamp(p / Math.max(P_HQ, 0.001), 0, 1);

  /* phase 2: the comet travels the main route */
  const t = THREE.MathUtils.clamp(0.01 + ((p - MERGE_END) / (1 - MERGE_END)) * 0.99, 0.01, 1);
  beamUniforms.uProgress.value = t;

  curve.getPointAt(t, headPos);
  curve.getPointAt(Math.min(t + 0.04, 1), lookPos);
  curve.getTangentAt(t, headTan);

  headBig.position.copy(headPos);
  headMid.position.copy(headPos);
  headCore.position.copy(headPos);
  /* the glow is alive from the very first frame */
  const charge = 0.85 + 0.15 * THREE.MathUtils.clamp(p / MERGE_END, 0, 1);
  /* the comet only exists once it leaves the HQ; hidden inside buildings */
  const born = THREE.MathUtils.smoothstep(t, T_START - 0.002, T_START + 0.01);
  const vis = headVisibility(t) * born;
  const pulse = (1 + Math.sin(time * 6) * 0.07) * charge * Math.max(vis, 0.001);
  headBig.scale.setScalar(13 * pulse);
  headMid.scale.setScalar(5.5 * pulse);
  headCore.scale.setScalar(2.0 * Math.max(charge, 0.5) * Math.max(vis, 0.001));
  beamLight.position.set(headPos.x, headPos.y + 3, headPos.z);
  beamLight.intensity = 60 * charge * vis;

  /* birth flash at the HQ exit, right when the comet appears */
  const flashAmt = Math.exp(-Math.pow((t - T_START) * 80, 2));
  switchFlash.material.opacity = flashAmt * 0.85;
  switchFlash.scale.setScalar(3 + 8 * THREE.MathUtils.clamp((t - T_SWITCH) * 30 + 0.5, 0, 1));

  /* the club flag waves gently */
  if (flagMesh) flagMesh.rotation.y = Math.sin(time * 2.4) * 0.22 + Math.sin(time * 5.1) * 0.06;

  /* cursor dot halo follows the mouse across the ground */
  const wantStr = time - mouseFx.lastMove < 1.4 ? 1 : 0;
  mouseFx.str += (wantStr - mouseFx.str) * (1 - Math.exp(-dt * 5));
  mouseFx.x += (mouseFx.tx - mouseFx.x) * (1 - Math.exp(-dt * 12));
  mouseFx.z += (mouseFx.tz - mouseFx.z) * (1 - Math.exp(-dt * 12));
  mouseUniforms.uMouse.value.set(mouseFx.x, mouseFx.z);
  mouseUniforms.uMouseStr.value = mouseFx.str;

  /* everyone sways a little — no more statues */
  for (let i = 0; i < allPeople.length; i++) {
    const g = allPeople[i];
    g.rotation.z = Math.sin(time * 1.5 + g.userData.swayPhase) * 0.045;
  }

  /* birds circle and flap */
  for (const b of birds) {
    const d = b.userData;
    const a = time * d.speed * Math.PI * 2 + d.phase;
    b.position.set(d.cx + Math.cos(a) * d.r, d.h + Math.sin(time * 0.7 + d.phase) * 1.5, d.cz + Math.sin(a) * d.r);
    b.rotation.y = -a - Math.PI / 2;
    const flap = Math.sin(time * d.flap) * 0.55;
    d.wings[0].rotation.x = flap;
    d.wings[1].rotation.x = -flap;
  }

  /* pedestrians stroll along the walkway, legs and arms swinging */
  for (const w of walkers) {
    const u0 = (time * w.speed + w.phase) % 2;
    const u = u0 < 1 ? u0 : 2 - u0;
    w.g.position.x = THREE.MathUtils.lerp(w.ax, w.bx, u);
    w.g.position.z = THREE.MathUtils.lerp(w.az, w.bz, u);
    w.g.position.y = Math.abs(Math.sin(time * 7 + w.phase * 9)) * 0.03;
    const dir = u0 < 1 ? 1 : -1;
    w.g.rotation.y = Math.atan2((w.bx - w.ax) * dir, (w.bz - w.az) * dir);
    const swing = Math.sin(time * 7 + w.phase * 9);
    w.g.userData.legs[0].rotation.x = swing * 0.55;
    w.g.userData.legs[1].rotation.x = -swing * 0.55;
    w.g.userData.arms[0].rotation.x = -swing * 0.32;
    w.g.userData.arms[1].rotation.x = swing * 0.32;
  }

  /* some people talk with their hands */
  for (const ge of gesturers) {
    ge.pivot.rotation.x = -0.45 + Math.sin(time * 1.9 + ge.phase) * 0.3;
  }
  /* the light matches the line colour: coral before the HQ, cyan after */
  beamLight.color.lerpColors(lightCoral, lightCyan, THREE.MathUtils.smoothstep(t, T_SWITCH - 0.012, T_SWITCH + 0.012));

  /* sliding doors */
  for (const d of doors) {
    const open =
      THREE.MathUtils.smoothstep(t, d.td - 0.045, d.td - 0.012) *
      (1 - THREE.MathUtils.smoothstep(t, d.td + 0.05, d.td + 0.09));
    d.panelA.position.z = d.baseA.z - open * d.slide;
    d.panelB.position.z = d.baseB.z + open * d.slide;
  }

  /* warm window glow while the comet is inside a building */
  for (let i = 0; i < hideIntervals.length && i < litMatsArr.length; i++) {
    const [ha, hb] = hideIntervals[i];
    const inside =
      THREE.MathUtils.smoothstep(t, ha - 0.012, ha + 0.004) *
      (1 - THREE.MathUtils.smoothstep(t, hb - 0.004, hb + 0.012));
    const m = litMatsArr[i];
    if (m) m.emissiveIntensity = inside * (i === 0 ? 1.9 : 1.3);
  }

  /* GOAL! the comet kicks the waiting ball into the net */
  {
    const ku = THREE.MathUtils.clamp((t - T_KICK) / 0.016, 0, 1);
    const ke = ku * ku * (3 - 2 * ku);
    kickBall.position.set(
      THREE.MathUtils.lerp(146, 160.2, ke),
      0.32 + Math.sin(ke * Math.PI) * 1.5,
      THREE.MathUtils.lerp(14, 15.4, ke)
    );
    kickBall.rotation.z = -ke * 9;

    /* celebration: shockwave + burst + flash + the crowd jumps up */
    const gu = THREE.MathUtils.clamp((t - T_GOAL) / 0.05, 0, 1);
    const active = gu > 0 && gu < 1;
    goalFx.ring.material.opacity = active ? Math.pow(1 - gu, 1.6) * 0.95 : 0;
    goalFx.ring.scale.setScalar(active ? 2 + gu * 18 : 0.001);
    goalFx.light.intensity = active ? (1 - gu) * 50 : 0;
    goalFx.burst.visible = active;
    if (active) {
      for (let i = 0; i < goalFx.data.length; i++) {
        const d = goalFx.data[i];
        const r = gu * d.speed;
        goalFx.p.set(160.6 + d.dx * r, 1.2 + d.dy * r - 5 * gu * gu, 14 + d.dz * r);
        goalFx.e.set(time * d.spin, time * d.spin * 0.7, 0);
        goalFx.q.setFromEuler(goalFx.e);
        goalFx.s.setScalar(Math.max((1 - gu) * 1.1, 0.001));
        goalFx.m4.compose(goalFx.p, goalFx.q, goalFx.s);
        goalFx.burst.setMatrixAt(i, goalFx.m4);
      }
      goalFx.burst.instanceMatrix.needsUpdate = true;
    }
    const hopAmp = Math.sin(Math.min(gu * 1.3, 1) * Math.PI);
    if (hopAmp > 0.001) {
      for (const f of stadiumFans) {
        f.grp.position.y = f.baseY + Math.abs(Math.sin(time * 8 + f.phase)) * 0.42 * hopAmp;
      }
    } else if (tickFansReset) {
      for (const f of stadiumFans) f.grp.position.y = f.baseY;
      tickFansReset = false;
    }
    if (hopAmp > 0.001) tickFansReset = true;
  }

  for (let i = 0; i < phoneScreens.length; i++) {
    const base = phoneScreens[i].userData.base ?? 1.2;
    phoneScreens[i].material.emissiveIntensity = base * (1 + Math.sin(time * 5 + i * 2.1) * 0.18);
  }

  /* member halo + reactive tiles + celebration */
  const arrive = THREE.MathUtils.smoothstep(p, 0.94, 1);
  const ringRadii = [];
  const ringStrengths = [];
  for (let i = 0; i < memberRings.length; i++) {
    const ring = memberRings[i];
    const phase = ((time * 0.42 + i / memberRings.length) % 1 + 1) % 1;
    const spread = 5 + phase * 30;
    ring.scale.setScalar(Math.max(spread * arrive, 0.001));
    ring.material.opacity = arrive * Math.pow(1 - phase, 1.6) * 0.6;
    ringRadii.push(spread / 2);
    ringStrengths.push(Math.pow(1 - phase, 1.6));
  }
  for (const tile of finaleTiles) {
    let bump = 0;
    for (let r = 0; r < ringRadii.length; r++) {
      const d = tile.dist - ringRadii[r];
      bump += Math.exp(-(d * d) / 7) * ringStrengths[r];
    }
    bump = Math.min(bump, 1) * arrive;
    tile.mesh.position.y = 0.5 + bump * 1.25;
    tile.mat.emissiveIntensity = 0.18 + bump * 0.65;
    tileEmissiveTmp.lerpColors(tileEmissiveBase, tileEmissiveFlash, bump);
    tile.mat.emissive.copy(tileEmissiveTmp);
  }
  memberRings.bodyMat.color.lerpColors(memberWhite, memberBlue, arrive);
  memberRings.ball.scale.setScalar(Math.max(arrive, 0.001));
  memberRings.ball.rotation.y = time * 0.8;
  memberRings.figure.scale.setScalar(1 + arrive * 0.07 * Math.max(Math.sin(time * 3.4), 0));
  /* arms shoot up in celebration as the beam arrives */
  for (const pivot of memberRings.arms) {
    const sgn = pivot.userData.sgn;
    pivot.rotation.z = sgn * (0.16 + arrive * (2.3 + Math.sin(time * 3.4) * 0.12));
  }

  confetti.mesh.visible = arrive > 0.01;
  if (confetti.mesh.visible) {
    for (let i = 0; i < CONFETTI; i++) {
      const d = confetti.data[i];
      const u = ((time * d.speed + d.phase) % 1 + 1) % 1;
      const y = 1.6 + d.up * u - 7.5 * u * u;
      confP.set(
        MEMBER.x + Math.cos(d.angle) * d.radial * u,
        Math.max(y, 0.25),
        MEMBER.z + Math.sin(d.angle) * d.radial * u
      );
      confE.set(time * d.spinX + i, time * d.spinY, 0);
      confQ.setFromEuler(confE);
      const fade = arrive * (y > 0.3 ? 1 - u * 0.35 : 0);
      confS.setScalar(Math.max(fade, 0.001));
      confM4.compose(confP, confQ, confS);
      confetti.mesh.setMatrixAt(i, confM4);
    }
    confetti.mesh.instanceMatrix.needsUpdate = true;
  }

  /* camera: keyframed orbit around the comet */
  const ck = camAt(p);
  camTargetPos.set(
    headPos.x + Math.cos(ck.az) * Math.cos(ck.el) * ck.dist,
    headPos.y + Math.sin(ck.el) * ck.dist,
    headPos.z + Math.sin(ck.az) * Math.cos(ck.el) * ck.dist
  );
  if (firstFrame) {
    camera.position.copy(camTargetPos);
    camCurrentLook.copy(headPos);
    firstFrame = false;
  } else {
    const ck2 = 1 - Math.exp(-dt * 4.5);
    camera.position.lerp(camTargetPos, ck2);
    camCurrentLook.lerp(lookPos, ck2);
  }
  camera.lookAt(camCurrentLook);

  sun.position.set(headPos.x - 22, 95, headPos.z + 16);
  sun.target.position.copy(headPos);
  rim.position.set(headPos.x + 55, 35, headPos.z - 65);
  rim.target.position.copy(headPos);

  let idx = 0;
  for (let i = 0; i < stepThresholds.length; i++) if (p >= stepThresholds[i]) idx = i;
  setActiveStep(idx);

  renderer.render(scene, camera);
}

gsap.ticker.add(tick);
gsap.ticker.fps(0);

/* ------------------------------------------------------------------ */
/*  Resize                                                             */
/* ------------------------------------------------------------------ */

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  ScrollTrigger.refresh();
});

/* fade the page in once everything is built */
gsap.from(container, { opacity: 0, duration: 0.9, ease: "power2.out" });

/* debug hooks for automated visual checks */
window.__viz = {
  scene,
  camera,
  renderer,
  curve,
  progress,
  marks: { P_HQ, P_CLUB, P_PITCH, P_GOAL, P_APP, P_TRAIN, P_TROPHY, P_BANK, P_BANK_IN, P_BANK_OUT },
  /* test helper: jump to a progress value with the camera snapped in place */
  snap(p) {
    progress.target = p;
    progress.current = p;
    firstFrame = true;
  },
};
