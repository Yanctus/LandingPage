import * as THREE from "three";

/* global gsap, ScrollTrigger */
gsap.registerPlugin(ScrollTrigger);

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
scene.background = new THREE.Color(0xdfe8f2);
scene.fog = new THREE.Fog(0xdfe8f2, 130, 400);

const camera = new THREE.PerspectiveCamera(
  24,
  window.innerWidth / window.innerHeight,
  0.5,
  700
);

/* ------------------------------------------------------------------ */
/*  Lights                                                             */
/* ------------------------------------------------------------------ */

scene.add(new THREE.HemisphereLight(0xe9f2ff, 0xb8c8de, 1.6));

const sun = new THREE.DirectionalLight(0xffffff, 0.95);
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

/* the glowing comet tints nearby geometry */
const beamLight = new THREE.PointLight(0x6fd6ff, 60, 55, 1.8);
scene.add(beamLight);

/* ------------------------------------------------------------------ */
/*  Materials & helpers                                                */
/* ------------------------------------------------------------------ */

const MAT = {
  white: new THREE.MeshStandardMaterial({ color: 0xf5f8fc, roughness: 0.92, emissive: 0xe8eef5, emissiveIntensity: 0.22 }),
  light: new THREE.MeshStandardMaterial({ color: 0xe8eef7, roughness: 0.92, emissive: 0xdde6f0, emissiveIntensity: 0.18 }),
  grey: new THREE.MeshStandardMaterial({ color: 0xd6dfeb, roughness: 0.92, emissive: 0xcdd8e6, emissiveIntensity: 0.12 }),
  dark: new THREE.MeshStandardMaterial({ color: 0xc3cedd, roughness: 0.92 }),
  blue: new THREE.MeshStandardMaterial({
    color: 0x2b2bd6,
    roughness: 0.55,
    emissive: 0x12128a,
    emissiveIntensity: 0.35,
  }),
  trunk: new THREE.MeshStandardMaterial({ color: 0xcfc4b8, roughness: 0.95 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0xaccbad, roughness: 0.95, emissive: 0x9dbd9e, emissiveIntensity: 0.15 }),
};

function box(w, h, d, mat, x = 0, y = null, z = 0, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y === null ? h / 2 : y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/* triangular prism for gabled roofs */
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

/* ------------------------------------------------------------------ */
/*  Ground                                                             */
/* ------------------------------------------------------------------ */

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(1200, 1200),
  new THREE.MeshStandardMaterial({ color: 0xe2eaf4, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(130, 0, 0);
ground.receiveShadow = true;
scene.add(ground);

/* ------------------------------------------------------------------ */
/*  The main route: junction -> company HQ -> clubhouse -> pitch ->    */
/*  grandstand -> trophy -> member tile                                */
/* ------------------------------------------------------------------ */

const JUNCTION = new THREE.Vector3(16, 0.5, 6);
const FIELD = { x: 140, z: 14, len: 42, wid: 27 };
const MEMBER = new THREE.Vector3(252, 0.5, 14);

const curve = new THREE.CatmullRomCurve3(
  [
    JUNCTION.clone(),
    new THREE.Vector3(28, 0.5, 9),
    new THREE.Vector3(42, 0.5, 5),
    new THREE.Vector3(56, 0.5, 6),
    new THREE.Vector3(66, 0.5, 6), /* straight through the HQ entrance */
    new THREE.Vector3(76, 0.5, 7),
    new THREE.Vector3(90, 0.5, 3),
    new THREE.Vector3(104, 0.5, 4), /* through the clubhouse */
    new THREE.Vector3(116, 0.5, 9),
    new THREE.Vector3(128, 0.5, 13),
    new THREE.Vector3(140, 0.5, 14), /* across the pitch centre */
    new THREE.Vector3(152, 0.5, 14),
    new THREE.Vector3(160.6, 0.5, 14), /* right through the east goal */
    new THREE.Vector3(172, 0.5, 11),
    new THREE.Vector3(186, 0.5, 8),
    new THREE.Vector3(197, 0.5, 7),
    new THREE.Vector3(202, 4.5, 7.5),
    new THREE.Vector3(205, 11.2, 8), /* leaps up into the cup... */
    new THREE.Vector3(208, 4.5, 9), /* ...and back out */
    new THREE.Vector3(213, 0.5, 9.5),
    new THREE.Vector3(226, 0.5, 10),
    new THREE.Vector3(239, 0.5, 11),
    MEMBER.clone(), /* the member's tile: centre of the grid */
  ],
  false,
  "catmullrom",
  0.5
);

/* ------------------------------------------------------------------ */
/*  World construction                                                 */
/* ------------------------------------------------------------------ */

const world = new THREE.Group();
scene.add(world);

/* --- skyscraper district (start) ----------------------------------- */
function skyscraper(x, z, w, h, d, ry = 0) {
  const g = new THREE.Group();
  g.add(box(w, h, d, MAT.white));
  for (let yy = 2.2; yy < h - 1.2; yy += 2.2) {
    g.add(box(w + 0.12, 0.38, d + 0.12, MAT.dark, 0, yy, 0));
  }
  g.add(box(w + 0.5, 0.6, d + 0.5, MAT.grey, 0, h + 0.3, 0));
  if (h > 20) g.add(box(w * 0.45, 2.2, d * 0.45, MAT.light, w * 0.1, h + 1.7, -d * 0.1));
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

/* low city blocks filling the district */
for (let i = 0; i < 14; i++) {
  const x = -18 + Math.random() * 52;
  const z = -32 + Math.random() * 22;
  if (towers.some((t) => Math.abs(t.x - x) < 5 && Math.abs(t.z - z) < 5)) continue;
  world.add(box(2.5 + Math.random() * 3.5, 1.5 + Math.random() * 4, 2.5 + Math.random() * 3.5, MAT.light, x, null, z, Math.random() * 0.4));
}

/* --- company HQ with logo and a real entrance ----------------------- */
function buildHQ() {
  const g = new THREE.Group();
  g.add(box(9, 11, 9, MAT.white, 0, null, 0));
  /* annexes kept clear of the beam, which passes through along x */
  g.add(box(6, 7.5, 6, MAT.light, -5.5, null, -7.5));
  g.add(box(5, 5, 6, MAT.light, 5.8, null, -7));
  g.add(box(9.6, 0.7, 9.6, MAT.grey, 0, 11.1, 0));

  /* window strips above the ground floor */
  for (let i = 0; i < 4; i++) {
    g.add(box(9.12, 0.35, 9.12, MAT.dark, 0, 3.6 + i * 2.0, 0));
  }

  /* entrance + exit portals at ground level: the beam runs through them */
  for (const sgn of [-1, 1]) {
    g.add(box(0.5, 3.2, 4.6, MAT.grey, sgn * 4.45, 1.6, 0)); /* portal frame */
    g.add(box(0.4, 2.7, 3.4, MAT.dark, sgn * 4.75, 1.35, 0)); /* dark doorway */
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

  g.position.set(66, 0, 6);
  return g;
}
world.add(buildHQ());

/* --- clubhouse (Vereinsheim), beam passes through it ------------------ */
function clubhouse(x, z) {
  const g = new THREE.Group();
  g.add(box(10, 3.4, 6.5, MAT.white));
  const roof = new THREE.Mesh(prismGeometry(6.9, 2.2, 10.4), MAT.light);
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 3.4;
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  /* terrace + front door + windows on the pitch side */
  g.add(box(10.6, 0.3, 2.4, MAT.grey, 0, 0.15, 4.3));
  g.add(box(1.4, 2.2, 0.15, MAT.dark, -2.2, 1.1, 3.3));
  g.add(box(1.6, 0.9, 0.12, MAT.dark, 1.6, 1.9, 3.3));
  g.add(box(1.6, 0.9, 0.12, MAT.dark, 3.6, 1.9, 3.3));
  /* pass-through doorways for the beam (west + east gable walls) */
  for (const sgn of [-1, 1]) {
    g.add(box(0.3, 2.4, 2.0, MAT.dark, sgn * 5.05, 1.2, 0));
  }
  /* flag pole */
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 6.5, 8), MAT.grey);
  pole.position.set(6.4, 3.25, 4);
  pole.castShadow = true;
  g.add(pole);
  g.add(box(1.7, 1.0, 0.06, MAT.blue, 7.3, 6, 4));
  g.position.set(x, 0, z);
  world.add(g);
}
clubhouse(104, 4);

/* --- football pitch --------------------------------------------------- */
function pitchTexture() {
  const c = document.createElement("canvas");
  c.width = 840;
  c.height = 540;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#cfe3d0";
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

/* --- spectators in loose clusters + trees ------------------------------ */
const peopleMat = new THREE.MeshStandardMaterial({ color: 0xb9c6d8, roughness: 0.9 });
const peopleMat2 = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.9 });

/* --- grandstand, aligned flush with the pitch's north touchline -------- */
function grandstand(cx, frontZ, length, rows) {
  const g = new THREE.Group();
  const seatW = 0.72;
  for (let j = 0; j < rows; j++) {
    const z = frontZ - j * 1.6 - 0.8;
    const y = j * 0.6;
    g.add(box(length, 0.6, 1.6, MAT.light, 0, y + 0.3, z - frontZ));
    /* individual seats on each step */
    const n = Math.floor(length / 1.35);
    for (let i = 0; i < n; i++) {
      const sx = -length / 2 + 0.9 + i * 1.35;
      const mat = Math.random() < 0.12 ? MAT.blue : MAT.white;
      g.add(box(seatW, 0.55, 0.6, mat, sx, y + 0.875, z - frontZ - 0.35));
      /* a seated supporter on some of the seats */
      if (Math.random() < 0.38) {
        const pm = Math.random() < 0.4 ? peopleMat2 : peopleMat;
        const fan = new THREE.Group();
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.3, 4, 8), pm);
        torso.position.y = 0.3;
        torso.castShadow = true;
        fan.add(torso);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 8), pm);
        head.position.y = 0.72;
        fan.add(head);
        fan.position.set(sx, y + 1.15, z - frontZ - 0.35);
        g.add(fan);
      }
    }
  }
  /* back wall */
  g.add(box(length, rows * 0.6 + 1.6, 0.5, MAT.white, 0, (rows * 0.6 + 1.6) / 2, -rows * 1.6 - 0.5));
  g.position.set(cx, 0, frontZ);
  world.add(g);
}
/* same centre + length as the pitch, sitting right on the touchline */
grandstand(FIELD.x, FIELD.z - FIELD.wid / 2 - 1.2, FIELD.len, 6);
function person(x, z, s = 1, mat = peopleMat) {
  const g = new THREE.Group();
  const bodyM = new THREE.Mesh(new THREE.CapsuleGeometry(0.16 * s, 0.5 * s, 4, 8), mat);
  bodyM.position.y = 0.45 * s;
  bodyM.castShadow = true;
  g.add(bodyM);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 10, 8), mat);
  head.position.y = 0.95 * s;
  g.add(head);
  g.position.set(x, 0, z);
  world.add(g);
  return g;
}

/* a loose huddle of 2-6 people around a point */
function crowdCluster(cx, cz, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.6 + Math.random() * 1.6;
    person(
      cx + Math.cos(a) * r,
      cz + Math.sin(a) * r,
      0.85 + Math.random() * 0.3,
      Math.random() < 0.4 ? peopleMat2 : peopleMat
    );
  }
}

/* clusters along the south touchline */
for (let i = 0; i < 5; i++) {
  crowdCluster(
    FIELD.x - FIELD.len / 2 + 5 + i * 8.5 + Math.random() * 3,
    FIELD.z + FIELD.wid / 2 + 2.8 + Math.random() * 1.6,
    2 + Math.floor(Math.random() * 4)
  );
}
/* a few groups elsewhere along the route */
crowdCluster(98, 12, 3);
crowdCluster(112, -2, 2);
crowdCluster(70, 14, 3);
crowdCluster(196, 6, 4);
crowdCluster(214, 2, 2);
crowdCluster(24, 12, 3);

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

for (let i = 0; i < 5; i++) tree(FIELD.x - 22 + i * 11 + Math.random() * 3, FIELD.z + FIELD.wid / 2 + 7 + Math.random() * 3, 0.9 + Math.random() * 0.5);
tree(FIELD.x - FIELD.len / 2 - 6, FIELD.z + 4, 1.1);
tree(FIELD.x + FIELD.len / 2 + 12, FIELD.z + 9, 1.0);
tree(96, -4, 1.2);
tree(114, 14, 1.0);
tree(86, 12, 0.9);

/* --- trophy (Pokal) ---------------------------------------------------- */
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
  const cup = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), MAT.white);
  cup.position.y = 2.7;
  cup.scale.setScalar(1.5);
  cup.castShadow = true;
  cup.receiveShadow = true;
  g.add(cup);
  for (const sgn of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.3, 10, 28), MAT.white);
    handle.position.set(sgn * 3.6, 9.0, 0);
    handle.castShadow = true;
    g.add(handle);
  }
  g.position.set(x, 0, z);
  world.add(g);
}
trophy(205, 8);

/* --- member tile field (finale) ---------------------------------------- */
/* a complete 5x5 square; the member's tile is the exact centre cell.
   every surrounding tile gets its own material so the outward pulse can
   lift it and flash it as the wave passes through. */
const tileGeo = new THREE.BoxGeometry(7.2, 1.0, 7.2);
const finaleTiles = [];
{
  const N = 5;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === 2 && j === 2) continue; /* centre = the member's tile */
      const mat = MAT.light.clone();
      const t = new THREE.Mesh(tileGeo, mat);
      const x = MEMBER.x + (i - (N - 1) / 2) * 8.4;
      const z = MEMBER.z + (j - (N - 1) / 2) * 8.4;
      t.position.set(x, 0.5, z);
      t.castShadow = true;
      t.receiveShadow = true;
      world.add(t);
      finaleTiles.push({
        mesh: t,
        mat,
        dist: Math.hypot(x - MEMBER.x, z - MEMBER.z),
      });
    }
  }
}
const tileEmissiveBase = new THREE.Color(0xdde6f0);
const tileEmissiveFlash = new THREE.Color(0x9fd8ff);
const tileEmissiveTmp = new THREE.Color();

const memberRings = (() => {
  /* the member's tile: blue, with a figure standing on it */
  const g = new THREE.Group();
  const tile = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.3, 7.2), MAT.blue);
  tile.position.y = 0.65;
  tile.castShadow = true;
  g.add(tile);
  const member = person(0, 0, 1.7, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
  member.position.set(MEMBER.x, 1.3, MEMBER.z);
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

  /* three staggered rings that pulse outward from the tile */
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
  return rings;
})();

/* --- confetti fountain above the member (club colours) ----------------- */
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

/* small filler blocks scattered along the route */
for (let i = 0; i < 22; i++) {
  const t = Math.random();
  const p = curve.getPointAt(t);
  const a = Math.random() * Math.PI * 2;
  const r = 26 + Math.random() * 26;
  const x = p.x + Math.cos(a) * r;
  const z = p.z + Math.sin(a) * r;
  if (Math.abs(x - FIELD.x) < 32 && Math.abs(z - FIELD.z) < 24) continue;
  if (x > 114 && x < 166 && z > -14 && z < 2) continue; /* grandstand */
  const s = 1.5 + Math.random() * 3;
  world.add(box(s, 0.8 + Math.random() * 2.4, s, MAT.light, x, null, z, Math.random()));
}

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

/* colA fades into colB along the line (tributaries: coral -> cyan at the
   junction); the comet head highlight uses `hot`. */
function beamMaterial(intensity, tail, progressUniform, colA, colB, hot) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: progressUniform,
      uColA: { value: colA },
      uColB: { value: colB },
      uHot: { value: hot },
      uIntensity: { value: intensity },
      uTail: { value: tail },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uProgress, uIntensity, uTail;
      uniform vec3 uColA, uColB, uHot;
      varying vec2 vUv;
      void main() {
        float t = vUv.x;
        float rel = uProgress - t;
        if (rel < 0.0) discard;
        float head = exp(-rel * 220.0);
        float body = exp(-rel * uTail);
        float a = (head * 1.6 + body * 0.6) * uIntensity;
        vec3 base = mix(uColA, uColB, smoothstep(0.72, 1.0, t));
        vec3 col = mix(base, uHot, clamp(head * 1.4, 0.0, 1.0));
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

const mainBeamMat = (i, tail) =>
  beamMaterial(i, tail, beamUniforms.uProgress, COL.cyan, COL.cyan, COL.cyanHot);
const tribBeamMat = (i, tail) =>
  beamMaterial(i, tail, tribUniforms.uProgress, COL.coral, COL.cyan, COL.coralHot);

const coreTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 700, 0.22, 8, false), mainBeamMat(1.4, 5.0));
const glowTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 700, 1.1, 10, false), mainBeamMat(0.32, 7.0));
const hazeTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 500, 2.4, 10, false), mainBeamMat(0.06, 9.0));
scene.add(coreTube, glowTube, hazeTube);

/* tributaries: a coral line down from every skyscraper, all merging at
   the junction where the colour blends into the main beam's cyan. */
for (const t of towers) {
  const dir = new THREE.Vector3(JUNCTION.x - t.x, 0, JUNCTION.z - t.z).normalize();
  const tCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(t.x, t.h, t.z),
      new THREE.Vector3(t.x + dir.x * 2.2, t.h * 0.45, t.z + dir.z * 2.2),
      new THREE.Vector3(t.x + dir.x * 4.5, 0.5, t.z + dir.z * 4.5),
      new THREE.Vector3(
        (t.x + JUNCTION.x) / 2 + dir.z * 2.5,
        0.5,
        (t.z + JUNCTION.z) / 2 - dir.x * 2.5
      ),
      JUNCTION.clone(),
    ],
    false,
    "catmullrom",
    0.4
  );
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(tCurve, 120, 0.16, 8, false), tribBeamMat(1.1, 2.0)));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(tCurve, 120, 0.7, 8, false), tribBeamMat(0.3, 2.5)));
}

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
/*  Halftone dot field that lights up around the comet                 */
/* ------------------------------------------------------------------ */

const dotSamples = [];
{
  const N = 900;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    dotSamples.push({ t, p: curve.getPointAt(t) });
  }
}
const dotData = [];
{
  const STEP = 1.9;
  const BAND = 17;
  for (let gx = 8; gx <= 258; gx += STEP) {
    let best = null;
    for (const s of dotSamples) {
      if (Math.abs(s.p.x - gx) > 8) continue;
      if (!best || Math.abs(s.p.x - gx) < Math.abs(best.p.x - gx)) best = s;
    }
    if (!best) continue;
    for (let dz = -BAND; dz <= BAND; dz += STEP) {
      if (Math.random() < 0.06) continue;
      const gz = best.p.z + dz;
      let near = best;
      let nd = Infinity;
      for (const s of dotSamples) {
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

const dotMat = new THREE.ShaderMaterial({
  uniforms: {
    uProgress: beamUniforms.uProgress,
    uColA: { value: new THREE.Color(0x39c2ff) },
    uColB: { value: new THREE.Color(0xd9f6ff) },
  },
  vertexShader: /* glsl */ `
    attribute float aT;
    attribute float aFade;
    varying float vT;
    varying float vFade;
    void main() {
      vT = aT;
      vFade = aFade;
      vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uProgress;
    uniform vec3 uColA, uColB;
    varying float vT;
    varying float vFade;
    void main() {
      float rel = uProgress - vT;
      float appear = smoothstep(-0.012, 0.0, rel);
      float burst = exp(-max(rel, 0.0) * 26.0);
      float residual = 0.5 * (1.0 - smoothstep(0.04, 0.30, rel));
      float i = appear * max(burst, residual) * vFade;
      if (i < 0.004) discard;
      vec3 col = mix(uColA, uColB, clamp(burst * 1.3, 0.0, 1.0));
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

/* ------------------------------------------------------------------ */
/*  Camera rig driven by scroll                                        */
/* ------------------------------------------------------------------ */

const MERGE_END = 0.1;

const camKeys = [
  { p: 0.0, az: 2.5, el: 0.5, dist: 145 }, /* wide on the skyline */
  { p: 0.12, az: 2.6, el: 0.65, dist: 112 },
  { p: 0.29, az: 2.7, el: 0.78, dist: 100 }, /* company HQ */
  { p: 0.45, az: 2.35, el: 0.8, dist: 105 }, /* clubhouse */
  { p: 0.57, az: 2.5, el: 1.0, dist: 130 }, /* pitch, near top-down */
  { p: 0.7, az: 2.35, el: 0.78, dist: 102 }, /* out through the goal */
  { p: 0.82, az: 2.2, el: 0.66, dist: 96 }, /* trophy leap, low + close */
  { p: 0.93, az: 2.3, el: 0.76, dist: 100 },
  { p: 1.0, az: 2.1, el: 0.82, dist: 112 }, /* member tile finale */
];

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
const stepThresholds = [0, 0.29, 0.57, 0.8];
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
const camTargetPos = new THREE.Vector3();
const camCurrentLook = new THREE.Vector3();
let firstFrame = true;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  const k = 1 - Math.exp(-dt * 3.2);
  progress.current += (progress.target - progress.current) * k;
  const p = progress.current;

  /* phase 1: coral lines flow down from the towers and merge */
  tribUniforms.uProgress.value = THREE.MathUtils.clamp(p / (MERGE_END * 0.85), 0, 1);

  /* phase 2: the merged beam travels the main route */
  const t = THREE.MathUtils.clamp(0.01 + ((p - MERGE_END) / (1 - MERGE_END)) * 0.99, 0.01, 1);
  beamUniforms.uProgress.value = t;

  curve.getPointAt(t, headPos);
  curve.getPointAt(Math.min(t + 0.04, 1), lookPos);

  headBig.position.copy(headPos);
  headMid.position.copy(headPos);
  headCore.position.copy(headPos);
  const charge = THREE.MathUtils.clamp(p / MERGE_END, 0.25, 1);
  const pulse = (1 + Math.sin(time * 6) * 0.07) * charge;
  headBig.scale.setScalar(13 * pulse);
  headMid.scale.setScalar(5.5 * pulse);
  headCore.scale.setScalar(2.0 * Math.max(charge, 0.5));
  beamLight.position.set(headPos.x, headPos.y + 3, headPos.z);
  beamLight.intensity = 60 * charge;

  /* member halo: staggered rings pulsing outward once the beam arrives */
  const arrive = THREE.MathUtils.smoothstep(p, 0.94, 1);
  const ringRadii = [];
  const ringStrengths = [];
  for (let i = 0; i < memberRings.length; i++) {
    const ring = memberRings[i];
    const phase = ((time * 0.42 + i / memberRings.length) % 1 + 1) % 1;
    const spread = 5 + phase * 30;
    ring.scale.setScalar(Math.max(spread * arrive, 0.001));
    ring.material.opacity = arrive * Math.pow(1 - phase, 1.6) * 0.6;
    ringRadii.push(spread / 2); /* the texture ring sits at half the plane size */
    ringStrengths.push(Math.pow(1 - phase, 1.6));
  }

  /* the surrounding tiles ride the wave: lift + flash as each pulse passes */
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

  /* the member celebrates: gentle bounce + confetti fountain */
  const memberFig = memberRings.figure;
  if (memberFig) {
    memberFig.scale.setScalar(1 + arrive * 0.07 * Math.max(Math.sin(time * 3.4), 0));
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
window.__viz = { scene, camera, renderer, curve };
