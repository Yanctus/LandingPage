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
scene.fog = new THREE.Fog(0xdfe8f2, 130, 380);

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
  red: new THREE.MeshBasicMaterial({ color: 0xff4d55 }),
  redSoft: new THREE.MeshBasicMaterial({ color: 0xff8a93 }),
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
ground.position.set(140, 0, 0);
ground.receiveShadow = true;
scene.add(ground);

/* ------------------------------------------------------------------ */
/*  The route the glowing signal travels                               */
/* ------------------------------------------------------------------ */

const curve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 1.4, 0),
    new THREE.Vector3(6, 0.5, 7),
    new THREE.Vector3(18, 0.5, 14),
    new THREE.Vector3(38, 0.5, 16),
    new THREE.Vector3(62, 0.5, 8),
    new THREE.Vector3(88, 0.5, 14),
    new THREE.Vector3(116, 0.5, 22),
    new THREE.Vector3(146, 0.5, 16),
    new THREE.Vector3(176, 0.5, 8),
    new THREE.Vector3(206, 0.5, 14),
    new THREE.Vector3(236, 0.5, 18),
    new THREE.Vector3(268, 0.5, 12),
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

/* --- HQ building (start) ------------------------------------------ */
function buildHQ() {
  const g = new THREE.Group();
  g.add(box(9, 11, 9, MAT.white, 0, null, 0));
  g.add(box(6, 7.5, 6, MAT.light, -6.5, null, 1.5));
  g.add(box(5, 5, 6, MAT.light, 6.2, null, -1.5));
  g.add(box(9.6, 0.7, 9.6, MAT.grey, 0, 11.1, 0));

  /* window strips */
  for (let i = 0; i < 4; i++) {
    g.add(box(9.12, 0.35, 9.12, MAT.dark, 0, 2.6 + i * 2.2, 0));
  }

  /* purple emblem panel */
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
    /* asterisk mark */
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

  /* incoming red signal ribbons (requests flowing into HQ) */
  const ribbons = new THREE.Group();
  const ribbonGeo = new THREE.BoxGeometry(0.55, 90, 0.1);
  ribbonGeo.translate(0, 45, 0); /* anchor at the bottom end */
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(ribbonGeo, i % 2 ? MAT.redSoft : MAT.red);
    r.position.set(-2.4 + i * 1.6, 11.2, -1 - i * 0.5);
    r.rotation.z = 0.42;
    r.rotation.x = -0.15;
    ribbons.add(r);
  }
  g.add(ribbons);

  g.position.set(-2, 0, -4);
  return g;
}
world.add(buildHQ());

/* --- cooling towers ------------------------------------------------ */
const smokeTex = radialTexture([
  [0, "rgba(255,255,255,0.85)"],
  [0.5, "rgba(255,255,255,0.35)"],
  [1, "rgba(255,255,255,0)"],
]);
const smokeSprites = [];

function coolingTower(x, z, s = 1) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    /* hyperboloid profile: wide base, narrow waist, slight flare at the lip */
    const r = 4.0 - 5.14 * t + 3.74 * t * t;
    pts.push(new THREE.Vector2(r * 0.9 * s, t * 13 * s));
  }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), MAT.white);
  m.position.set(x, 0, z);
  m.castShadow = true;
  m.receiveShadow = true;
  world.add(m);

  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: smokeTex,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
    );
    sp.userData = { x, z, h: 13 * s, seed: Math.random() * 100, s };
    smokeSprites.push(sp);
    world.add(sp);
  }
}
coolingTower(30, -16, 1.0);
coolingTower(40, -22, 1.25);
coolingTower(96, -26, 0.9);
coolingTower(104, -31, 1.1);

/* --- chimneys with smoke ------------------------------------------- */
function chimney(x, z, h = 9) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.0, h, 12), MAT.white);
  m.position.set(x, h / 2, z);
  m.castShadow = true;
  world.add(m);
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0.45, depthWrite: false })
  );
  sp.userData = { x, z, h, seed: Math.random() * 100, s: 0.6 };
  smokeSprites.push(sp);
  world.add(sp);
}

/* --- wind turbines -------------------------------------------------- */
const rotors = [];
function turbine(x, z, s = 1) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.4 * s, 8 * s, 10), MAT.white);
  pole.position.y = 4 * s;
  pole.castShadow = true;
  g.add(pole);
  const nacelle = new THREE.Mesh(new THREE.BoxGeometry(0.6 * s, 0.55 * s, 1.1 * s), MAT.light);
  nacelle.position.set(0, 8 * s, 0.1 * s);
  g.add(nacelle);
  const hub = new THREE.Group();
  hub.position.set(0, 8 * s, 0.75 * s);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 3.4 * s, 0.1 * s), MAT.white);
    blade.position.y = 1.7 * s;
    /* no blade shadows: long spinning streaks read as fallen poles */
    const arm = new THREE.Group();
    arm.add(blade);
    arm.rotation.z = (i / 3) * Math.PI * 2;
    hub.add(arm);
  }
  g.add(hub);
  rotors.push(hub);
  g.position.set(x, 0, z);
  world.add(g);
}
for (let i = 0; i < 8; i++) {
  turbine(10 + i * 6 + Math.random() * 2.5, 40 + (i % 3) * 9 + Math.random() * 3, 0.65 + Math.random() * 0.3);
}

/* --- container stacks ----------------------------------------------- */
function containers(x, z, rows, cols, ry = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const hN = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < hN; k++) {
        g.add(box(3.6, 1.5, 1.7, k % 2 ? MAT.light : MAT.white, i * 4.0, k * 1.6 + 0.75, j * 2.1));
      }
    }
  }
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  world.add(g);
}
containers(52, -16, 3, 4, 0.2);
containers(120, -14, 2, 5, -0.15);

/* --- tank farm ------------------------------------------------------ */
function tankRow(x, z, n, ry = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 4.6, 16), MAT.white);
    t.position.set(i * 3.2, 2.3, 0);
    t.castShadow = true;
    g.add(t);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.light);
    cap.position.set(i * 3.2, 4.6, 0);
    g.add(cap);
  }
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  world.add(g);
}
tankRow(58, -7, 6, 0.1);
tankRow(60, -11, 6, 0.1);
tankRow(126, -22, 7, -0.1);

/* --- gabled warehouses ---------------------------------------------- */
function warehouse(x, z, w = 8, h = 4, d = 12, ry = 0) {
  const g = new THREE.Group();
  g.add(box(w, h, d, MAT.white));
  const roof = new THREE.Mesh(prismGeometry(w + 0.3, h * 0.55, d + 0.3), MAT.light);
  roof.position.y = h;
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  world.add(g);
  return g;
}
warehouse(86, 2, 7, 3.5, 11, 0.3);
warehouse(95, -4, 7, 3.5, 11, 0.3);
warehouse(104, 0, 6, 3, 9, 0.3);
warehouse(140, 30, 8, 4, 13, -0.5);
warehouse(150, 36, 8, 4, 13, -0.5);

/* --- big barrel-roof hangar ----------------------------------------- */
function hangar(x, z, ry = 0) {
  const g = new THREE.Group();
  g.add(box(16, 4, 22, MAT.white));
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(8, 8, 22, 24, 1, false, 0, Math.PI),
    MAT.light
  );
  roof.rotation.x = Math.PI / 2;
  roof.rotation.z = Math.PI / 2;
  roof.scale.y = 1;
  roof.scale.x = 0.5;
  roof.position.y = 4;
  roof.castShadow = true;
  g.add(roof);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  world.add(g);
}
hangar(112, 4, 0.45);

/* --- factory with chimneys ------------------------------------------ */
function factory(x, z, ry = 0) {
  const g = new THREE.Group();
  g.add(box(10, 5, 8, MAT.white));
  g.add(box(6, 7.5, 6, MAT.light, 7.5, null, 0.5));
  /* sawtooth roof */
  for (let i = 0; i < 3; i++) {
    const tooth = new THREE.Mesh(prismGeometry(3.2, 1.6, 7.6), MAT.grey);
    tooth.position.set(-3.2 + i * 3.2, 5, 0);
    tooth.castShadow = true;
    g.add(tooth);
  }
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  world.add(g);
}
factory(78, -12, 0.15);
factory(132, 8, -0.25);
chimney(75, -15, 10);
chimney(78.5, -16.5, 12);
chimney(135, 5, 9);

/* --- water tower ----------------------------------------------------- */
function waterTower(x, z) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7, 6), MAT.grey);
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    leg.position.set(Math.cos(a) * 1.6, 3.5, Math.sin(a) * 1.6);
    leg.rotation.z = Math.cos(a) * 0.12;
    leg.rotation.x = -Math.sin(a) * 0.12;
    g.add(leg);
  }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3, 18), MAT.white);
  tank.position.y = 8.2;
  tank.castShadow = true;
  g.add(tank);
  const top = new THREE.Mesh(new THREE.ConeGeometry(2.35, 1.4, 18), MAT.light);
  top.position.y = 10.4;
  g.add(top);
  g.position.set(x, 0, z);
  world.add(g);
}
waterTower(70, -2);
waterTower(124, 28);

/* --- tiny people ------------------------------------------------------ */
const peopleMat = new THREE.MeshStandardMaterial({ color: 0xb9c6d8, roughness: 0.9 });
function person(x, z) {
  const g = new THREE.Group();
  const bodyM = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 4, 8), peopleMat);
  bodyM.position.y = 0.45;
  g.add(bodyM);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), peopleMat);
  head.position.y = 0.95;
  g.add(head);
  g.position.set(x, 0, z);
  world.add(g);
}
for (let i = 0; i < 36; i++) {
  const t = Math.random();
  const p = curve.getPointAt(t);
  const a = Math.random() * Math.PI * 2;
  const r = 4 + Math.random() * 14;
  person(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r);
}

/* --- tile / panel grid fields (zones 3 & 4) --------------------------- */
const tileGeo = new THREE.BoxGeometry(7.2, 1.0, 7.2);
function tileField(cx, cz, nx, nz, skip = 0.12, ry = 0.0) {
  const g = new THREE.Group();
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      if (Math.random() < skip) continue;
      const raised = Math.random() < 0.08;
      const t = new THREE.Mesh(tileGeo, raised ? MAT.white : MAT.light);
      t.position.set(i * 8.4 - (nx * 8.4) / 2, raised ? 1.1 : 0.5, j * 8.4 - (nz * 8.4) / 2);
      t.castShadow = true;
      t.receiveShadow = true;
      g.add(t);
      if (raised && Math.random() < 0.5) {
        const t2 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.9, 4.6), MAT.white);
        t2.position.copy(t.position);
        t2.position.y += 0.95;
        t2.castShadow = true;
        g.add(t2);
      }
    }
  }
  g.position.set(cx, 0, cz);
  g.rotation.y = ry;
  world.add(g);
  return g;
}
tileField(172, -16, 7, 6, 0.18, 0.1);
tileField(186, 34, 5, 4, 0.25, 0.1);
tileField(228, 16, 9, 8, 0.1, 0.05);

/* --- the blue "crew en route" tile with a little truck ----------------- */
function truckTile(x, z) {
  const g = new THREE.Group();
  const tile = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.3, 7.2), MAT.blue);
  tile.position.y = 0.65;
  tile.castShadow = true;
  g.add(tile);
  const whiteM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 1.6), whiteM);
  cab.position.set(-1.5, 1.85, 0);
  g.add(cab);
  const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 1.7), whiteM);
  cargo.position.set(0.6, 2.0, 0);
  g.add(cargo);
  for (const [wx, wz] of [[-1.6, 0.8], [-1.6, -0.8], [0.9, 0.8], [0.9, -0.8]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.25, 10), MAT.dark);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 1.45, wz);
    g.add(wheel);
  }
  g.position.set(x, 0, z);
  world.add(g);
}
truckTile(232.6, 19.5);

/* --- final chevron monument (the VECTR mark) --------------------------- */
function chevronMonument(x, z) {
  const shape = new THREE.Shape();
  /* a ">" chevron outline */
  shape.moveTo(-7, 9);
  shape.lineTo(-2.2, 9);
  shape.lineTo(7, 0);
  shape.lineTo(-2.2, -9);
  shape.lineTo(-7, -9);
  shape.lineTo(2.2, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 4, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.3 });
  const m = new THREE.Mesh(geo, MAT.white);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = -0.48; /* point the chevron along the final camera's view-right */
  m.scale.setScalar(1.35);
  m.position.set(x, 0.2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  world.add(m);

  /* concentric-square deco blocks around it */
  const spots = [
    [-14, -10, 2.4], [13, -12, 2.0], [16, 8, 2.6], [-12, 12, 2.0], [2, 16, 1.8], [-2, -17, 2.2],
  ];
  for (const [dx, dz, s] of spots) {
    for (let k = 0; k < 3; k++) {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(s * (3 - k * 0.8), 0.8, s * (3 - k * 0.8)),
        k === 2 ? MAT.white : MAT.light
      );
      b.position.set(x + dx, 0.4 + k * 0.8, z + dz);
      b.castShadow = true;
      b.receiveShadow = true;
      world.add(b);
    }
  }
}
chevronMonument(276, 4);

/* small filler blocks scattered around the whole map */
for (let i = 0; i < 26; i++) {
  const t = Math.random();
  const p = curve.getPointAt(t);
  const a = Math.random() * Math.PI * 2;
  const r = 22 + Math.random() * 26;
  const s = 1.5 + Math.random() * 3;
  world.add(box(s, 0.8 + Math.random() * 2.4, s, MAT.light, p.x + Math.cos(a) * r, null, p.z + Math.sin(a) * r, Math.random()));
}

/* ------------------------------------------------------------------ */
/*  Glowing beam along the curve                                       */
/* ------------------------------------------------------------------ */

const beamUniforms = {
  uProgress: { value: 0 },
  uColor: { value: new THREE.Color(0x55ccff) },
  uHot: { value: new THREE.Color(0xeaffff) },
};

function beamMaterial(intensity, tail) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: beamUniforms.uProgress,
      uColor: beamUniforms.uColor,
      uHot: beamUniforms.uHot,
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
      uniform vec3 uColor, uHot;
      varying vec2 vUv;
      void main() {
        float t = vUv.x;
        float rel = uProgress - t;
        if (rel < 0.0) discard;
        float head = exp(-rel * 220.0);
        float body = exp(-rel * uTail);
        float a = (head * 1.6 + body * 0.6) * uIntensity;
        vec3 col = mix(uColor, uHot, clamp(head * 1.4, 0.0, 1.0));
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

const coreTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 700, 0.22, 8, false), beamMaterial(1.4, 5.0));
const glowTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 700, 1.1, 10, false), beamMaterial(0.32, 7.0));
const hazeTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 500, 2.4, 10, false), beamMaterial(0.06, 9.0));
scene.add(coreTube, glowTube, hazeTube);

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

/* ordered halftone grid: world-aligned dots in a band around the curve */
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
  for (let gx = -8; gx <= 290; gx += STEP) {
    /* candidate curve samples near this x */
    let best = null;
    for (const s of dotSamples) {
      if (Math.abs(s.p.x - gx) > 8) continue;
      if (!best || Math.abs(s.p.x - gx) < Math.abs(best.p.x - gx)) best = s;
    }
    if (!best) continue;
    for (let dz = -BAND; dz <= BAND; dz += STEP) {
      if (Math.random() < 0.06) continue;
      const gz = best.p.z + dz;
      /* refine: nearest sample in 2D within the x window */
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
      /* dots pop in just as the head reaches them */
      float appear = smoothstep(-0.012, 0.0, rel);
      /* bright burst at the head, easing to a residual glow, then gone */
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

/* keyframed orbit around the comet head: azimuth (rad), elevation, dist */
const camKeys = [
  { p: 0.0, az: 2.35, el: 0.82, dist: 108 },
  { p: 0.22, az: 2.7, el: 0.74, dist: 112 },
  { p: 0.46, az: 2.25, el: 0.82, dist: 118 },
  { p: 0.7, az: 2.6, el: 0.88, dist: 124 },
  { p: 0.88, az: 2.3, el: 0.74, dist: 102 },
  { p: 1.0, az: 2.1, el: 0.84, dist: 120 },
];

function camAt(p) {
  let i = 0;
  while (i < camKeys.length - 2 && camKeys[i + 1].p < p) i++;
  const a = camKeys[i];
  const b = camKeys[i + 1];
  let f = THREE.MathUtils.clamp((p - a.p) / (b.p - a.p), 0, 1);
  f = f * f * (3 - 2 * f); /* smoothstep between keys */
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
const stepThresholds = [0, 0.26, 0.52, 0.78];
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

  /* smooth the scroll progress */
  const k = 1 - Math.exp(-dt * 3.2);
  progress.current += (progress.target - progress.current) * k;
  const p = progress.current;

  /* comet travels the curve; keep a touch of lead-in so it starts at HQ */
  const t = THREE.MathUtils.clamp(0.012 + p * 0.985, 0, 1);
  beamUniforms.uProgress.value = t;

  curve.getPointAt(t, headPos);
  curve.getPointAt(Math.min(t + 0.04, 1), lookPos);

  headBig.position.copy(headPos);
  headMid.position.copy(headPos);
  headCore.position.copy(headPos);
  const pulse = 1 + Math.sin(time * 6) * 0.07;
  headBig.scale.setScalar(13 * pulse);
  headMid.scale.setScalar(5.5 * pulse);
  beamLight.position.set(headPos.x, headPos.y + 3, headPos.z);

  /* camera orbit around the head */
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

  /* sun + shadow frustum follow the action */
  sun.position.set(headPos.x - 22, 95, headPos.z + 16);
  sun.target.position.copy(headPos);

  /* step list */
  let idx = 0;
  for (let i = 0; i < stepThresholds.length; i++) if (p >= stepThresholds[i]) idx = i;
  setActiveStep(idx);

  /* ambient animation */
  for (const r of rotors) r.rotation.z = time * 1.4;
  for (const sp of smokeSprites) {
    const u = ((time * 0.16 + sp.userData.seed) % 1 + 1) % 1;
    const s = sp.userData.s;
    sp.position.set(
      sp.userData.x + Math.sin(sp.userData.seed + u * 4) * 1.2 * s + u * 2.5 * s,
      sp.userData.h + u * 9 * s,
      sp.userData.z + Math.cos(sp.userData.seed) * 0.6
    );
    sp.scale.setScalar((2.2 + u * 6) * s);
    sp.material.opacity = 0.34 * Math.sin(u * Math.PI) * Math.min(1, s);
  }

  renderer.render(scene, camera);
}

gsap.ticker.add(tick);
gsap.ticker.fps(0); /* uncapped, rAF-driven */

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
