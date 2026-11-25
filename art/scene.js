import { createHarness } from './harness.js';
import { makeCard, prismFold, paperMaterial } from 'papercraft/lib/paperkit-3d.js';
import { makeDoll } from './doll.js';

// Cream, clay and olive printed cardstock at a 4.4-unit figure scale.
// 27-degree macro lens at 29–33 degrees, paired with a soft warm key and coloured contact shadows.
// Three sets: rubber gym tiles and window light, terracotta running lanes, and a tiled kitchen with warm wood.
const params = new URLSearchParams(location.search);
const continuous = params.get('motion') === 'workout';
const sceneKey = ['gym', 'track', 'kitchen'].includes(params.get('scene')) ? params.get('scene') : 'gym';
const motion = ['arrival', 'to-track', 'to-kitchen'].includes(params.get('motion')) ? params.get('motion') : null;
const authored = {
  gym: { ground: '#b7aa90', stock: '#f7edda', leak: '#87604a', target: [.40, 1.90, -.65], yaw: 9, pitch: 29, dist: 46.2 },
  track: { ground: '#929765', stock: '#f9edda', leak: '#8c593e', target: [.65, .88, -1.2], yaw: 3, pitch: 33, dist: 49 },
  kitchen: { ground: '#d6ba8f', stock: '#fff0d4', leak: '#925d39', target: [.20, 1.65, -.7], yaw: 8, pitch: 29, dist: 43.2 },
};
let cfg = authored[sceneKey];
const defaults = { gym: 'arrival', track: 'stocker', kitchen: 'cook' };
const poses = { gym: ['arrival', 'squat', 'second-set'], track: ['stocker', 'lidride', 'soundrift'], kitchen: ['cook', 'finish'] };
const poseKey = poses[sceneKey].includes(params.get('pose')) ? params.get('pose') : defaults[sceneKey];
const isFinish = poseKey === 'finish';
const bookend = continuous || motion === 'arrival' || isFinish;
let poseTime = 0;
let H;

try {
  H = createHarness({
    bounds: { x0: continuous ? -47 : -33, x1: continuous ? 47 : 33, z0: -31, z1: 26 },
    ground: cfg.ground, stock: cfg.stock, heroHeight: 4.4,
    view: { target: cfg.target, yaw: cfg.yaw, pitch: cfg.pitch, dist: cfg.dist, fov: 27, closer: 1.1 },
    testView: { target: [0, 1.4, 0], dist: 17 },
    subject: [0, 1.75, 1],
    focus: [0, 1.8, 0],
    light: { keyColor: '#ffe6c0', leak: cfg.leak, mapSize: 2048, softness: .24, maxPenumbra: 1.05 },
    lens: { greenDesat: .065, exposure: .97, focusBand: .79, maxBlur: 0, sharpen: .36, hazeAmount: 0, vignette: 0, grain: 0, chroma: 0, shadowTint: cfg.leak },
  });
} catch (error) {
  document.documentElement.dataset.failed = 'webgl';
  throw error;
}

const { THREE, P2 } = H;
const D = P2.draw2;
const R = P2.shape.rect;
const { rng } = P2;
const color = {
  ink: '#33382e', nearBlack: '#282e2b', cream: '#ead6ae', pale: '#f3e2bc', wood: '#a87651', terracotta: '#a9523e',
  coral: '#db875f', olive: '#768050', fern: '#546445', teal: '#3c6261', metal: '#51605b',
};
const rect = (x, y, w, h, r = 0) => (g) => D.rect(g, x, y, w, h, r);
const ell = (x, y, rx, ry, a = 0) => (g) => D.ell(g, x, y, rx, ry, a);
const circle = (r, cy = r, cx = 0, n = 28) => Array.from({ length: n }, (_, i) => {
  const a = i * Math.PI * 2 / n;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
});
const toward = (a, b, f) => a + (b - a) * f;

function ink(P, label, x, y, size, tint = color.ink, align = 'center', font = 'Arial') {
  const { g } = P;
  g.save();
  g.scale(1, -1);
  g.font = '800 ' + size + 'px ' + font;
  g.fillStyle = tint;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillText(label, x, -y);
  g.restore();
}

function sheet(base, stripe, accent = color.pale) {
  return (P) => {
    const { box } = P;
    P.gradient(P2.shade(base, -.19), base, .45);
    P.layer(rect(box.x0 + .08, box.y0 + .15, box.w - .16, box.h * .58, .05), stripe, { depth: .54, rim: .4 });
    P.layer(rect(box.x0 + .11, box.y0 + box.h * .72, box.w - .22, Math.min(.11, box.h * .08)), accent, { depth: .32 });
  };
}
function plate(x, z, width, height, fill, print = null, options = {}) {
  return H.popup(R(width, height), print || sheet(fill, P2.shade(fill, .17)), { x, z, res: .76, ...options });
}
function objectCard(name, points, paint, options = {}) {
  const node = makeCard(points, { ...H.cardOpts(0, 0, 1, null, .95), paint, ...options });
  node.name = name;
  return node;
}
function raisedCard(name, points, paint, options) {
  return H.popup(points, paint, { res: .74, ...options });
}
function carton(name, x, z, w, d, h, front, top, angle = 0) {
  const footprint = [[-w / 2, d / 2], [w / 2, d / 2], [w / 2, -d / 2], [-w / 2, -d / 2]];
  const node = prismFold(footprint, {
    h, paper: H.paper, seed: 54 + Math.round((x + 15) * 23),
    paints: { wall: front, roof: top },
    print: H.cardOpts(x, z, 1, null, .8),
  });
  node.name = name;
  return H.popup(null, null, { node, height: h, x, z, yaw: angle, self: true });
}
function pane(P, x, y, w, h, tint = '#93a4a1') {
  P.layer(rect(x - .11, y - .11, w + .22, h + .22, .02), '#705948', { depth: .66, rim: .6 });
  P.layer(rect(x, y, w, h), tint, { depth: .46 });
  P.layer([[x, y + h * .2], [x + w, y + h * .72], [x + w, y + h], [x + w * .73, y + h]], '#c4c0a2', { depth: .45, alpha: .54 });
  P.layer(rect(x + w * .49, y, .082, h), '#6e5e51', { depth: .4 });
  P.layer(rect(x, y + h * .49, w, .082), '#6e5e51', { depth: .4 });
}

function pot(x, z, scale, seed, accent = '#b8a260') {
  const random = rng(seed);
  const tips = P2.shape.radial(random, { rx: 1.05, ry: .82, cy: 1.82, lobes: 8, n: 58, stalk: { w: .36, base: .27 } });
  H.popup(tips, (P) => {
    P.gradient('#425a39', '#607c52', .45);
    for (let i = 0; i < 10; i++) {
      const a = i * 2.399, radius = .12 + .63 * Math.sqrt(i / 10);
      P.layer(ell(Math.cos(a) * radius, 1.83 + Math.sin(a) * radius * .86, .22 + random() * .13, .11, a), [accent, '#80935b', '#a5a371', '#426147'][i % 4], { depth: .38 });
    }
  }, { x, z, scale, res: .60, cross: 'half', sway: .23 });
  const points = [[-.4, 0], [.4, 0], [.51, .64], [.51, .73], [-.51, .73], [-.51, .64]];
  H.popup(points, sheet('#9d5942', '#c17a55', '#e9b786'), { x, z: z + .11, scale, cross: true, res: .54 });
}
function lowBunch(x, z, seed, scale) {
  const outline = P2.shape.mound(rng(seed), { w: 2.85, h: 1.35, lobes: 5, n: 38 });
  H.popup(outline, (P) => {
    P.gradient('#435c3e', '#798857');
    for (let i = 0; i < 9; i++) {
      const xx = -1.07 + i * .26;
      const yy = .28 + .62 * Math.sin(i / 8 * Math.PI);
      P.layer(ell(xx, yy, .28, .115, (i % 2 * 2 - 1) * .46), ['#a7ae66', '#758d5a', '#c1b177', '#516a46'][i % 4], { depth: .36 });
    }
  }, { x, z, scale, res: .60, sway: .32, cross: 'half' });
}
function disks(x, z, radius, shades) {
  for (let i = 0; i < shades.length; i++) {
    const r = radius - i * .11;
    H.popup(circle(r), (P) => {
      P.gradient('#252e2a', shades[i]);
      P.layer(ell(0, r, r * .73, r * .73), P2.shade(shades[i], .18), { depth: .47 });
      P.layer(ell(0, r, r * .28, r * .28), '#3c3930', { depth: .52 });
      ink(P, '10', 0, r * 1.53, r * .32, color.pale);
    }, { x: x + i * .04, z: z + i * .18, yaw: .12, res: .65 });
  }
}
function groundGym() {
  return H.printGround(({ g, X, Z, ppu, line, torn, washes }) => {
    washes(['#a79787', '#c1ae92', '#8e877a']);
    torn([[-17, -7], [16, -7], [17, 7], [10, 13], [-16, 13]], '#77796e', '#d4be9d');
    for (let d = -16; d < 19; d += 1.48) {
      line([[d, -9], [d, 16]], .034, '#515b52');
      line([[-19, d], [17, d]], .031, '#646b5e');
    }
    for (const x of [-4.1, 4.0]) {
      line([[x, -5.3], [x, 6.1]], .10, '#c9ac76');
      for (let z = -4.5; z < 7; z += 1.64) line([[x - .27, z], [x + .28, z]], .062, '#bb9c68');
    }
    const random = rng(809);
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = i % 3 ? '#d4b89342' : '#333b3545';
      g.fillRect(X(random() * 32 - 16), Z(random() * 21 - 8), ppu * .045, ppu * .037);
    }
    g.fillStyle = '#d9bb80';
    g.font = 'bold ' + .66 * ppu + 'px Arial';
    g.fillText('01', X(2.75), Z(4.7));
  }, { ppu: 23 });
}

const rackPosition = { front: -.64, back: -2.8, cup: -2.46, seat: 2.86, pull: 4.50 };
const squatDepth = -1.48;

function buildGym() {
  const floor = groundGym();
  const backWall = plate(-.38, -7.0, 17.2, 7.5, '#8e7563', (P) => {
    P.gradient('#776653', '#b39a80');
    const mortar = '#cbb194';
    for (let row = 0; row < 9; row++) {
      for (let x = -12 + (row % 2) * .72; x < 12; x += 1.44) {
        const tile = ['#997e66', '#a3886e', '#ab8e74', '#8e7868'][(Math.round((x + 12) * 2) + row * 3) % 4];
        const lo = row * .74 + .15;
        P.g.fillStyle = tile;
        D.rect(P.g, x, lo, 1.39, .67, .035);
      }
    }
    P.layer(rect(-12, .24, 24, .94), '#4e584c', { depth: .72 });
    P.layer(rect(-12, .68, 24, .10), '#b6956f', { depth: .50 });
    P.layer(rect(-12, 7.13, 24, .29), '#624e43', { depth: .66 });
    P.layer(rect(-12, 7.38, 24, .085), mortar, { depth: .4 });
    pane(P, -8.1, 3.55, 4.3, 2.78);
    pane(P, -3.34, 3.55, 4.3, 2.78);
    P.layer(rect(2.0, 3.44, 5.45, 2.35, .06), '#425549', { depth: .9, rim: .7 });
    P.layer(rect(2.24, 3.68, 4.97, 1.88, .06), '#6b7858', { depth: .47 });
    ink(P, 'THE LONG REP', 4.72, 4.78, .59, color.pale);
    ink(P, 'TRAINING ROOM', 4.70, 4.14, .25, '#d1bc8b');
  }, { yaw: .02, res: .74, level: true });
  backWall.group.position.y = -.065;
  cornerWall(-8.94, -3.35, 7.18, 7.5, 'gym');
  for (const [x, shade] of [[-7.88, '#516455'], [-6.39, '#656f55'], [-4.88, '#687861']]) {
    plate(x, -4.45, 1.5, 4.75, shade, (P) => {
      P.gradient(P2.shade(shade, -.25), shade);
      P.layer(rect(-.62, .34, 1.2, 3.91, .08), P2.shade(shade, .14), { depth: .62, rim: .5 });
      for (let r = 0; r < 4; r++) P.layer(rect(-.29, 3.60 + .12 * r, .58, .033), '#3c4b40', { depth: .22 });
      P.layer(rect(.33, 1.97, .14, .39, .04), '#d8b47d', { depth: .46 });
    }, { yaw: .025 });
  }

  const uprights = (w, h, header = .50) => [[-w/2, 0], [-1.66, 0], [-1.66, h-header], [1.66, h-header], [1.66, 0], [w/2, 0], [w/2, h], [-w/2, h]];
  const rackPaint = (P) => {
    P.gradient('#31413d', '#647468', .36);
    P.layer(rect(-2.15, .09, .21, 5.12), '#7c8b72', { depth: .58 });
    P.layer(rect(1.73, .09, .20, 5.12), '#8a8972', { depth: .48 });
    P.layer(rect(-2.13, 5.24, 4.26, .074), '#b69a68', { depth: .52 });
    for (let y = .8; y < 4.88; y += .29) {
      P.g.fillStyle = '#313b36'; D.ell(P.g, -1.90, y, .055, .055); D.ell(P.g, 1.90, y, .055, .055);
    }
  };
  const rackFront = raisedCard('rack front', uprights(4.4, 5.4, .23), rackPaint, { x: 0, z: rackPosition.front, yaw: 0, order: 3.4 });
  const rackBack = raisedCard('rack back', uprights(4.4, 5.4), rackPaint, { x: 0, z: rackPosition.back, yaw: 0, order: 2.8 });
  const rackBraces = [];
  const sideRack = [[-.98, 0], [.98, 0], [1.05, .30], [-1.03, .30]];
  for (const x of [-2.02, 2.02]) {
    raisedCard('base brace', sideRack, sheet('#566458', '#75826d'), { x, z: -1.60, yaw: -Math.PI / 2, res: .65 });
    const top = objectCard('top brace', sideRack, sheet('#465849', '#64775f'));
    top.position.set(x, 4.93, -1.69);
    top.rotation.y = Math.PI / 2;
    H.scene.add(top);
    rackBraces.push(top);
  }

  for (const x of [-1.94, 1.94]) {
    const receiver = objectCard('rear barbell J-cup', [[-.44,-.35],[-.44,.31],[-.27,.31],[-.27,.00],[.16,.00],[.16,.14],[.31,.14],[.31,-.17],[-.22,-.17],[-.22,-.35]], (P) => {
      P.gradient('#59452e', '#8a6940', .34);
      P.layer(rect(-.42, -.29, .132, .58, .022), '#a38a57', { depth: .36 });
      P.layer(rect(-.23, -.06, .40, .075, .014), '#cfaa68', { depth: .37 });
      P.layer(rect(.18, -.13, .087, .25, .016), '#bc9255', { depth: .30 });
      P.layer(ell(-.35, .19, .042, .043), '#484337', { depth: .25 });
      P.layer(ell(-.35, -.18, .042, .043), '#484337', { depth: .25 });
    }, { thickness: .19, contact: null, folds: [] });
    receiver.position.set(x, rackPosition.seat - .018, rackPosition.cup);
    receiver.rotation.y = -Math.PI / 2;
    H.scene.add(receiver);
    rackBraces.push(receiver);
  }

  carton('plywood jump box', 4.3, -3.9, 2.35, 1.45, 1.33,
    (P) => { sheet('#a87748', '#c09c63')(P); ink(P, '30', 0, .54, .45, '#5b4a34'); }, sheet('#bb9265', '#d5ae74'), -.12);
  carton('bench base', 3.65, 2.92, 3.05, 1.05, .65, sheet('#45544b', '#576952'), sheet('#5f4b41', '#876251'), -.21);
  carton('bench cushion', 3.65, 2.92, 3.36, 1.22, .18, sheet('#63463d', '#835948'), sheet('#754d42', '#a97458'), -.21).group.position.y = .69;
  plate(5.8, -4.92, 1.45, 4.25, '#433f37', (P) => {
    P.gradient('#3e4034', '#545344');
    P.layer(rect(-.48, .24, .96, 3.69, .12), '#725e4b', { depth: .58 });
    ink(P, '3', 0, 3.3, .49, color.pale);
  }, { yaw: -.23 });
  disks(4.48, -.78, .76, ['#384d46', '#875142', '#9d7754']);
  disks(-4.42, -1.77, .91, ['#586747', '#414e43', '#a45f48']);
  pot(7.15, -2.65, 1.34, 147);
  pot(-7.05, .6, .87, 129, '#c19964');
  pot(-7.73, 4.6, .88, 153);
  const duffel = [[-1.04, 0], [1.04, 0], [1.03, .47], [.72, .78], [.46, .84], [.35, 1.11], [.05, 1.20], [-.38, 1.13], [-.49, .84], [-.80, .78], [-1.12, .48]];
  raisedCard('training bag', duffel, (P) => {
    P.gradient('#455448', '#697858');
    P.layer(rect(-.87, .13, 1.73, .36, .09), '#80906a', { depth: .55 });
    P.layer(rect(-.61, .35, .14, .49), '#bd965f', { depth: .36 });
    P.layer(rect(.44, .35, .14, .49), '#c09963', { depth: .36 });
    P.layer(rect(-.22, .9, .4, .11, .032), '#424e41', { depth: .57 });
  }, { x: -3.0, z: 2.4, yaw: .22, cross: 'half' });
  plate(-4.72, 2.17, .31, 1.08, '#b67646', (P) => {
    P.fill('#b46543');
    P.layer(rect(-.13, .45, .27, .28), '#dbab70', { depth: .35 });
    P.layer(rect(-.13, .91, .27, .13), '#505b4b', { depth: .30 });
  }, { cross: true, yaw: -.19 });

  const bellOutline = [[-.42,0],[.42,0],[.57,.24],[.56,.54],[.38,.75],[.30,.80],[.34,1.11],[.23,1.26],[-.23,1.26],[-.33,1.12],[-.31,.80],[-.49,.66],[-.58,.42],[-.53,.18]];
  const bellHole = [[-.17,.88],[.17,.88],[.21,1.075],[.14,1.12],[-.14,1.12],[-.21,1.075]];
  for (const [x, z, base, highlight, kg, scale] of [[2.62,3.76,'#885639','#bb8151','12',.92],[3.44,3.92,'#51624e','#7b8965','16',1.05],[-4.57,-3.20,'#4d5756','#809388','16',1.05]]) {
    raisedCard('kettlebell', bellOutline, (P) => {
      P.gradient(P2.shade(base, -.26), base, .51);
      P.layer(ell(0, .44, .37, .30), highlight, { depth: .5 });
      P.layer(rect(-.25, .24, .50, .33, .035), base, { depth: .35 });
      ink(P, kg, 0, .40, .23, color.pale);
    }, { x, z, scale, yaw: .17, holes: [bellHole], res: .64 });
  }
  const towel = objectCard('folded terracotta gym towel', [[-.64,-.40],[.62,-.42],[.59,.38],[-.58,.40]], (P) => {
    P.gradient('#994b35', '#b86845', .23);
    for (const [a, tint] of [[-.42,'#d89460'],[-.30,'#783b2e'],[.32,'#db9f66']]) {
      P.layer(rect(a, -.37, .078, .72), tint, { depth: .31 });
    }
    for (let i = 0; i < 9; i++) {
      P.g.fillStyle = '#df9a635a';
      D.rect(P.g, -.58, -.34 + i * .082, 1.13, .018);
    }
  }, { contact: null, folds: [], thickness: .057 });
  towel.position.set(4.18, .94, 2.42);
  towel.rotation.set(-Math.PI / 2, 0, -.22);
  H.scene.add(towel);

  const bar = new THREE.Group();
  const shaft = objectCard('barbell shaft', R(5.9, .15), sheet('#71776f', '#9d9a81'), { thickness: .10, contact: null, folds: [] });
  bar.add(shaft);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const r = [.51, .59, .53][i];
      const weight = objectCard('barbell plate', circle(r, .075), (P) => {
        P.gradient('#3e443b', ['#a7694b', '#56665d', '#b28e5d'][i]);
        P.layer(ell(0, .075, r * .70, r * .70), i === 1 ? '#82907a' : '#b8976f', { depth: .42 });
        P.layer(ell(0, .075, .14, .14), '#494c41', { depth: .38 });
      }, { thickness: .10, contact: null, folds: [] });
      weight.position.x = s * (2.35 + .19 * i);
      weight.rotation.y = s * Math.PI / 2;
      bar.add(weight);
    }
  }
  H.scene.add(bar);

  const rail = objectCard('chalked pull-up rail', R(4.1, .13), (P) => {
    P.gradient('#3d4a44', '#758578');
    for (const x of [-.85, .55]) {
      P.layer(rect(x, .02, .30, .09), '#aab3a1', { depth: .38 });
      for (let i = 0; i < 3; i++) P.layer(rect(x + .065 + i * .067, .033, .021, .065), '#d0c3a5', { depth: .22 });
    }
  }, { thickness: .14, contact: null, folds: [] });
  rail.position.set(0, rackPosition.pull, rackPosition.front);
  H.scene.add(rail);
  const mat = objectCard('rubber push-up mat', R(5.2, 2.22), (P) => {
    P.gradient('#3c5449', '#626e4d');
    P.layer(rect(-2.45, .14, 4.9, 1.95, .14), '#54694f', { depth: .50 });
    for (const x of [-2.21, 2.12]) P.layer(rect(x, .34, .09, 1.58), '#a1a074', { depth: .28 });
  }, { thickness: .078, contact: null, folds: [] });
  mat.position.set(-.42, .07, 5.16);
  mat.rotation.x = -Math.PI / 2;
  H.scene.add(mat);
  return { floor, bar, rail, rackFront, rackBack, rackBraces };
}

const lap = { x: 6.85, z: 2.68, center: .52, start: 2.99 };
function groundTrack() {
  return H.printGround(({ g, X, Z, ppu, line, washes }) => {
    washes(['#728544', '#b4aa64', '#8c995f', '#a79655']);
    const oval = (offset) => Array.from({ length: 129 }, (_, i) => {
      const a = i * Math.PI / 64;
      return [(lap.x + offset) * Math.cos(a), lap.center + (lap.z + offset) * Math.sin(a)];
    });
    g.beginPath();
    for (const ring of [oval(1.86), oval(-1.15).reverse()]) {
      ring.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)));
      g.closePath();
    }
    g.fillStyle = '#ae614b';
    g.fill('evenodd');
    for (const lane of [-1.14, -.51, .29, 1.06, 1.86]) line(oval(lane), .059, '#e7cca2');
    const random = rng(877);
    for (let i = 0; i < 4700; i++) {
      const x = random() * 29 - 14.5, z = random() * 22 - 11;
      g.fillStyle = ['#e8cb8c44', '#50613b59', '#b0844a45'][i % 3];
      g.fillRect(X(x), Z(z), ppu * (.026 + random() * .070), ppu * .041);
    }
    for (const [x, z, label] of [[-1.75,4.72,'01'],[-1.75,4.02,'02'],[-1.75,3.31,'03']]) {
      g.fillStyle = '#e4c295';
      g.font = '900 ' + .48 * ppu + 'px Arial';
      g.fillText(label, X(x), Z(z));
    }
    for (let i = 0; i < 10; i++) {
      g.fillStyle = i % 2 ? '#734633' : '#ebca97';
      g.fillRect(X(.65), Z(2.09 + i * .293), ppu * .37, ppu * .278);
    }
  }, { ppu: 29 });
}

function buildTrack() {
  const floor = groundTrack();
  const timber = '#7e6d4e';
  const markers = [
    [-4.75, '01', 'STOCKER', '#314637', '#435e43'],
    [0, '02', 'LIDRIDE', '#854728', '#a5613d'],
    [4.75, '03', 'SOUNDRIFT', '#424958', '#525f75'],
  ];
  const signs = markers.map(([x, num, name, base, inset]) => {
    const z = -5.22 + Math.abs(x) * .045;
    const silhouette = [[-1.56, 0], [-1.22, 0], [-1.22, .58], [1.23, .58], [1.23, 0], [1.56, 0], [1.56, 3.08], [1.30, 3.30], [-1.31, 3.30], [-1.56, 3.08]];
    return raisedCard('track sign ' + name, silhouette, (P) => {
      P.gradient(P2.shade(base, -.2), base);
      P.layer(rect(-1.40, .74, 2.80, 2.38, .13), inset, { depth: .71, rim: .48 });
      P.layer(rect(-1.12, 2.48, 2.24, .43, .04), P2.shade(base, -.06), { depth: .49 });
      ink(P, num, 0, 2.69, .28, color.pale);
      ink(P, name, 0, 1.87, name.length > 8 ? .46 : .56, '#fff2d1');
      P.layer(rect(-.83, 1.24, 1.66, .066), '#d6b77e', { depth: .31 });
    }, { x, z, yaw: .06, res: .96 });
  });
  for (const [x, z, scale, seed] of [[-9.6,-7.2,.70,36],[-8.2,-5.7,.76,97],[-7.7,-7.5,.61,37],[7.2,-7.8,.67,55],[9.1,-5.4,.70,42],[9.4,2.6,.63,26],[-9.25,3.4,.66,93]]) {
    lowBunch(x, z, seed, scale);
  }
  const trees = [[-9.3,-7.75,.97,212],[8.9,-7.58,.91,189]];
  for (const [x, z, scale, seed] of trees) {
    const random = rng(seed);
    const crown = P2.shape.radial(random, { cy: 2.23, rx: 1.3, ry: 1.30, lobes: 9, n: 58, stalk: { w: .2, base: 0 } });
    H.popup(crown, (P) => {
      P.gradient('#5e7145', '#7f8d57', .42);
      P.layer(rect(-.13, .04, .25, 2.40, .08), timber, { depth: .49 });
      for (let i = 0; i < 12; i++) {
        const a = i * 2.399, dist = .14 + .92 * Math.sqrt(i / 12);
        P.layer(ell(Math.cos(a) * dist, 2.26 + Math.sin(a) * dist, .38, .17, a), ['#a2a960', '#838f4e', '#b7aa6a', '#546c47'][i % 4], { depth: .45 });
      }
    }, { x, z, scale, cross: true, res: .54, sway: .49 });
  }
  stadiumStand(-4.0, -7.7, 5.35);
  stadiumStand(4.0, -7.7, 5.35);
  for (const x of [-8.3, 8.3]) {
    const lamp = [[-.12,0],[.12,0],[.12,3.62],[.70,3.62],[.70,4.46],[-.70,4.46],[-.70,3.62],[-.12,3.62]];
    H.popup(lamp, (P) => {
      P.gradient('#49544c', '#677265');
      P.layer(rect(-.60,3.68,1.2,.65,.05),'#808478',{depth:.44});
      for (let i = 0; i < 4; i++) P.layer(ell(-.43+.286*i,4.0,.103,.138),'#ead6a0',{depth:.34});
    }, {x,z:-7.76,yaw:.08,res:.75});
  }
  for (const [x, z] of [[-8.7, 3.96], [-5.2, 5.15], [3.9, 5.2], [8.7, 3.86]]) {
    const cone = [[-.42,0],[.42,0],[.43,.14],[.28,.20],[.095,.79],[-.10,.79],[-.28,.20],[-.43,.14]];
    H.popup(cone, (P) => {
      P.gradient('#9d583b', '#cf8550');
      P.layer(rect(-.30, .31, .62, .11), '#e6ca97', { depth: .34 });
    }, { x, z, cross: true, res: .58 });
  }
  pot(-2.4, .40, .70, 566, '#b7ab70');
  lowBunch(2.4, .02, 142, .8);
  return { floor, signs };
}

function groundKitchen() {
  return H.printGround(({ g, X, Z, ppu, line, torn, washes }) => {
    washes(['#c3a981', '#e2c69a', '#b99d78']);
    const random = rng(72);
    const tiles = ['#c6aa81', '#d3b68d', '#cbb28b', '#b6a17e', '#d9bc8d'];
    for (let x = -17; x < 20; x += 1.53) {
      for (let z = -10; z < 18; z += 1.53) {
        g.fillStyle = tiles[Math.floor(random() * tiles.length)];
        g.fillRect(X(x) + 1, Z(z) + 1, ppu * 1.53 - 2, ppu * 1.53 - 2);
        g.fillStyle = '#f1d5ac65';
        g.fillRect(X(x) + 2, Z(z) + 2, ppu * 1.36, ppu * .045);
      }
    }
    torn([[-5.3, 1.28], [1.8, 1.18], [2.2, 3.75], [-5.42, 3.97]], '#8d674e', '#d7ad82');
    for (let i = 0; i < 11; i++) {
      const z = 1.40 + i * .205;
      line([[-5.18, z], [1.94, z - .06]], i % 3 === 0 ? .084 : .034, ['#c08f66', '#c9aa7b', '#77624d'][i % 3]);
    }
  }, { ppu: 23 });
}

function buildKitchen() {
  const floor = groundKitchen();
  const backWall = plate(-.38, -6.8, 16.35, 7.5, '#bbad8f', (P) => {
    P.gradient('#a3957d', '#ded1aa');
    for (let r = 0; r < 8; r++) {
      for (let x = -11; x < 11; x += .96) {
        P.g.fillStyle = ['#c8b49a', '#d4c09d', '#dac7aa', '#b5a28d'][(Math.round(x * 3 + 40) + r * 7) % 4];
        D.rect(P.g, x, .57 + r * .53, .91, .49, .023);
      }
    }
    P.layer(rect(-11, 4.83, 22, .12), '#8d755b', { depth: .56 });
    P.layer(rect(-11, 7.18, 22, .24), '#8f745b', { depth: .7 });
    pane(P, -6.0, 4.51, 4.8, 2.50, '#95a7a1');
    pane(P, -6.0, 5.46, 4.8, .93, '#b7b9a0');
    P.layer(rect(1.55, 4.73, 6.70, .16), '#b38a62', { depth: .62 });
    for (let x = 1.8; x < 8.2; x += .49) {
      P.g.fillStyle = x % 3 > 1 ? '#bb9872' : '#9d7759';
      D.rect(P.g, x, 4.98, .38, .8 + (Math.sin(x) + 1) * .31, .045);
    }
  }, { yaw: 0, res: .75, level: true });
  backWall.group.position.y = -.065;

  cornerWall(-8.5, -3.64, 6.20, 7.5, 'kitchen');
  const cabinetry = (P) => {
    const { box } = P;
    P.gradient('#59604a', '#809069');
    for (let x = box.x0 + .19; x < box.x1 - .65; x += 1.33) {
      P.layer(rect(x, .25, Math.min(1.17, box.x1 - x - .11), 1.56, .055), '#8b926c', { depth: .55, rim: .5 });
      P.layer(rect(x + .14, 1.46, .40, .075, .018), '#e1b97d', { depth: .47 });
    }
  };
  carton('garden green base cabinets', -3.4, -1.75, 7.2, 2.13, 2.08, cabinetry, sheet('#88765d', '#b29d76'));
  const counter = carton('oak counter top', -3.4, -1.53, 7.46, 2.29, .19, sheet('#a97550', '#c1915c'), (P) => {
    sheet('#b28b5d', '#c79b66')(P);
    const { box } = P;
    for (let y = box.y0 + .12; y < box.y1; y += .26) {
      P.g.fillStyle = '#a7774b75';
      D.rect(P.g, box.x0, y, box.w, .045);
    }
  });
  counter.group.position.y = 2.08;
  carton('copper drawer unit', 3.35, -3.40, 2.65, 1.32, 2.25, (P) => {
    sheet('#815e43', '#aa8056')(P);
    for (let i = 0; i < 3; i++) {
      P.layer(rect(.15, .42 + i * .49, Math.max(.4, P.box.w - .31), .35, .042), '#bb9368', { depth: .45 });
      P.layer(rect(.56, .53 + i * .49, .38, .05), '#6b5b43', { depth: .35 });
    }
  }, sheet('#af8359', '#c7a678'), .13);

  for (const [x, z, clr, height] of [[-5.9,-2.34,'#ad6d49',.85],[-5.4,-2.53,'#8d9a72',.72],[-4.98,-2.52,'#c5a872',.63],[-1.46,-2.8,'#7c694e',.78],[-1.03,-2.58,'#bf7b50',.53]]) {
    const jar = [[-.17,0],[.17,0],[.23,.12],[.23,height-.11],[.14,height-.11],[.14,height],[-.14,height],[-.14,height-.11],[-.23,height-.11],[-.23,.12]];
    H.popup(jar, sheet(clr, P2.shade(clr, .22)), { x, z, cross: true, res: .56 }).group.position.y = 2.25;
  }
  const board = objectCard('cutting board', [[-.86,-.45],[.75,-.45],[.94,-.34],[1.05,-.047],[.94,.17],[.76,.46],[-.86,.46]], (P) => {
    P.gradient('#997348', '#caa374', .22);
    P.layer(rect(-.82, -.34, 1.58, .68, .092), '#ba905e', { depth: .49 });
    for (let i = 0; i < 4; i++) { P.g.fillStyle = '#a981534f'; D.rect(P.g, -.77, -.27 + .16 * i, 1.50, .025); }
  }, { contact: null, folds: [] });
  board.rotation.set(-Math.PI / 2, 0, -.15);
  board.position.set(-1.11, 2.34, -1.91);
  H.scene.add(board);

  const burner = objectCard('stove top', R(2.6, 1.44), (P) => {
    P.fill('#41463a');
    P.layer(rect(-1.16,.14,2.34,1.16,.10), '#626050', { depth: .47 });
    for (const x of [-.65, .62]) {
      P.layer(ell(x, .81, .47, .46), '#393c32', { depth: .46 });
      P.layer(ell(x, .81, .33, .32), '#85755a', { depth: .46 });
      P.layer(ell(x, .81, .25, .24), '#373c32', { depth: .41 });
    }
    for (let i = 0; i < 4; i++) P.layer(ell(.20 + .19 * i, .22, .061, .061), '#a78863', { depth: .35 });
  }, { contact: null, folds: [] });
  burner.position.set(-3.70, 2.29, -1.60);
  burner.rotation.x = -Math.PI / 2;
  H.scene.add(burner);

  function foodPlate(name, width, black = false, filled = true) {
    const r = width / 2;
    return objectCard(name, circle(r, 0), (P) => {
      P.fill(black ? '#3e443a' : '#e6d8b7');
      P.layer(ell(0, 0, r * .84, r * .84), black ? '#6e6e53' : '#cbb58b', { depth: .55 });
      P.layer(ell(0, 0, r * .74, r * .74), black ? '#565d46' : '#ebe0c0', { depth: .47 });
      const rngFood = rng(191);
      for (let i = 0; filled && i < 13; i++) {
        const a = i * 2.4, d = r * Math.sqrt(rngFood()) * .57;
        const x = Math.cos(a) * d, y = Math.sin(a) * d;
        P.layer(ell(x, y, .10 + rngFood() * .07, .06 + rngFood() * .038, a + .6),
          ['#bd8a46', '#8d9348', '#c76f47', '#d8a95b', '#75914c'][i % 5], { depth: .37 });
      }
    }, { contact: null, folds: [] });
  }
  const pan = new THREE.Group();
  const panCard = foodPlate('cast iron pan', 1.44, true, false);
  panCard.rotation.x = -Math.PI / 2;
  pan.add(panCard);
  const handle = objectCard('stove pan handle', R(.21, .94), sheet('#41473b', '#78765d'), { contact: null, folds: [] });
  handle.position.z = .46;
  handle.rotation.x = Math.PI / 2;
  pan.add(handle);
  pan.position.set(-3.10, 2.39, -2.33);
  H.scene.add(pan);
  const spoon = objectCard('wooden spoon', [[-.06,0],[.06,0],[.06,.62],[.15,.75],[.13,.97],[0,1.07],[-.14,.97],[-.16,.76],[-.06,.62]], sheet('#9e7345', '#cb9a56'), { contact: null, folds: [] });
  H.scene.add(spoon);

  const knife = objectCard('kitchen knife', [[-.09,0],[.095,0],[.09,.29],[.21,.33],[.19,.94],[.02,1.07],[-.11,.91],[-.09,.28]], (P) => {
    P.fill('#47443c');
    P.layer([[-.07,.30],[.19,.34],[.16,.93],[.02,1.04],[-.09,.87]], '#b6baaa', { depth: .44 });
    P.layer(rect(-.04,.40,.05,.49), '#d9ddbd', { depth: .30 });
    P.layer(ell(.02,.13,.029,.03), '#b69b70', { depth: .3 });
  }, { contact: null, folds: [], thickness: .053 });
  H.scene.add(knife);
  const ingredientColors = ['#977155','#b98452','#a66743','#6b8446','#b96343','#cd9356'];
  const ingredients = Array.from({ length: 10 }, (_, i) => {
    const points = [[-.12,-.11],[.06,-.13],[.17,-.06],[.15,.09],[.05,.135],[-.10,.11],[-.15,.023]];
    const base = ingredientColors[i % ingredientColors.length];
    const piece = objectCard('ingredient ' + i, points, (P) => {
      P.fill(P2.shade(base,-.15));
      P.layer(ell(.012,.012,.113,.086),P2.shade(base,.18),{ depth:.27 });
      P.layer(ell(.048,-.011,.042,.026),P2.shade(base,.29),{ depth:.21 });
    }, { contact: null, folds: [], thickness: .057, pxPerUnit: 59 });
    piece.rotation.x = -Math.PI / 2;
    H.scene.add(piece);
    return piece;
  });
  const cleanPlate = foodPlate('empty serving plate', 1.25, false, false);
  cleanPlate.rotation.x = -Math.PI / 2;
  cleanPlate.position.set(-1.97, 2.33, -2.27);
  H.scene.add(cleanPlate);

  const stoolSide = [[-.82,0],[-.63,0],[-.60,.95],[.61,.95],[.63,0],[.82,0],[.84,1.22],[-.84,1.22]];
  H.popup(stoolSide, sheet('#89664c', '#bf9268'), { x: 3.48, z: 2.23, cross: true, yaw: .35, res: .64 });
  const underTable = [[-1.33,0],[-1.09,0],[-1.07,1.40],[1.11,1.40],[1.15,0],[1.39,0],[1.41,1.68],[-1.39,1.68]];
  H.popup(underTable, sheet('#7f624d', '#a4835c'), { x: 1.8, z: 1.35, cross: 'half', yaw: -.18, res: .70 });
  const table = carton('laminated table top', 1.8, 1.92, 3.03, 1.98, .14, sheet('#986d50', '#b48960'), sheet('#ac855e', '#c9a574'), -.18);
  table.group.position.y = 1.62;
  const plateOfFood = foodPlate('plated vegetables', 1.26);
  plateOfFood.rotation.x = -Math.PI / 2;
  plateOfFood.position.set(1.70, 1.79, .84);
  H.scene.add(plateOfFood);
  pot(5.66, -.46, 1.21, 177, '#c6a46c');
  pot(-7.36, -.06, 1.16, 171, '#9caa71');
  pot(5.95, 4.77, 1.31, 174, '#bdaa6d');
  for (const [x, shade] of [[-.38, '#af7455'], [.10, '#7e8e70'], [.56, '#be9a65']]) {
    H.popup([[ -.22, 0], [.23, 0], [.23, .51], [.14, .65], [-.22, .65]], sheet(shade, P2.shade(shade, .19)), { x: x + 3.1, z: -3.6, cross: true, res: .52 }).group.position.y = 2.24;
  }

  const steam = new THREE.Group();
  for (const [x, h] of [[-.26,1.04],[.04,1.29],[.27,.91]]) {
    const w = .20;
    const plume = objectCard('steam curl', [[-.1,0],[.09,0],[.13,.23],[.00,.50],[.15,.73],[.13,h],[-.04,h],[-.09,.75],[-.22,.50],[-.09,.23]], (P) => {
      P.gradient('#ddd3a7', '#f0ddad', -.15);
      P.layer(rect(-w/4,.13,w/2,.47), '#f0e0b8', { depth: .32, alpha: .65 });
    }, { contact: null, folds: [], thickness: .043 });
    plume.position.x = x;
    steam.add(plume);
  }
  steam.position.set(-3.16, 2.67, -2.39);
  H.scene.add(steam);
  const apron = objectCard('sage apron', [[-.40,-.52],[.40,-.52],[.47,.48],[.27,.55],[.21,1.07],[-.21,1.07],[-.29,.51],[-.46,.43]], (P) => {
    P.gradient('#586b58','#839476');
    P.layer(rect(-.39,.34,.78,.09),'#aabc8b',{depth:.3});
    P.layer(rect(-.24,-.23,.48,.40,.04),'#a3ab78',{depth:.55});
    P.layer(rect(-.17,.91,.34,.06),'#cdb389',{depth:.29});
  }, { contact:null, folds:[], thickness:.058 });
  H.scene.add(apron);
  const citrus = (P) => {
    P.gradient('#9e6237', '#c8924c');
    P.layer(ell(0,.38,.33,.25),'#d4aa60',{depth:.37});
    P.layer(ell(.02,.36,.22,.17),'#b27844',{depth:.32});
  };
  H.popup(circle(.39), citrus,{x:-.5,z:-2.62,res:.61,cross:'half'}).group.position.y=2.26;
  return { floor, pan, board, knife, spoon, steam, ingredients, plateOfFood, apron };
}

function cornerWall(x, z, width, height, room) {
  const gym = room === 'gym';
  const wall = plate(x, z, width, height, gym ? '#9c846a' : '#b7a483', (P) => {
    const { box } = P;
    P.gradient(gym ? '#7a6957' : '#a39879', gym ? '#ac8c71' : '#ded1a9', -.33);
    for (let row = 0; row < 8; row++) {
      for (let x = box.x0 + (row % 2) * .51; x < box.x1; x += 1.12) {
        P.g.fillStyle = (gym ? ['#997d64','#a48970','#947b63'] : ['#bfad91','#cdbb96','#b7a991'])[(row + Math.round(x*4) + 99) % 3];
        D.rect(P.g, x, .27 + row * .62, 1.07, .55, .025);
      }
    }
    P.layer(rect(box.x0, .17, width, .87), gym ? '#4d5a4d' : '#8c815e', {depth:.59});
    P.layer(rect(box.x0, height - .39, width, .28), gym ? '#694e3f' : '#9d7352', {depth:.64});
    P.layer(rect(box.x0, height - .12, width, .078), '#d8b68d', {depth:.29});
    if (gym) {
      P.layer(rect(-2.0, 2.7, 3.8, 1.82, .04), '#40554a', {depth:.57});
      P.layer(rect(-1.8, 2.9, 3.4, 1.43, .05), '#607660', {depth:.39});
      ink(P,'LIFT',0,3.68,.57,'#eee0b5');
    } else {
      P.layer(rect(-1.5, .84, 3.0, 4.68, .10), '#775740', {depth:.68});
      P.layer(rect(-1.32, 1.02, 2.64, 4.26, .08), '#a17c51', {depth:.44});
      P.layer(rect(-1.13, 3.52, 2.24, 1.52, .06), '#c4af81', {depth:.44});
      P.layer(rect(.81, 2.50, .12, .42, .03), '#d6b574', {depth:.38});
    }
  }, {yaw: Math.PI / 2, res:.8, level: true});
  wall.group.position.y = -.065;
}

function stadiumStand(x, z, width) {
  for (let row=0; row<3; row++) {
    const tint=['#986d4c','#876248','#765b43'][row];
    const ledge = carton('folded grandstand tier', x, z-row*.49, width, .52, .48+row*.48,
      (P) => {
        P.fill(tint);
        P.layer(rect(.10,.10,width-.20,.18,.02),'#c6a47a',{depth:.29});
        for (let j=.30;j<width-.20;j+=.55) {
          P.g.fillStyle='#5b4a35';
          D.rect(P.g,j,.07,.036,.32);
        }
      }, sheet(tint,'#b38e63'), .02);
    ledge.group.position.y=.02;
  }
}

const models = {
  gym: { build:buildGym, x0:-9.03, x1:8.35, z0:-7.19, z1:6.26, edge:'#5f5945', liner:'#b28e66' },
  track: { build:buildTrack, x0:-10.5, x1:10.5, z0:-9.25, z1:6.2, edge:'#606347', liner:'#aa9162' },
  kitchen: { build:buildKitchen, x0:-8.58, x1:8, z0:-7.00, z1:5.62, edge:'#775846', liner:'#bc956a' },
};
const pageHeight = -.58;

function mountModel(key, offset = 0) {
  const model = models[key];
  const before = new Set(H.scene.children);
  const built = model.build();
  const group = new THREE.Group();
  group.name = key + ' diorama';
  for (const node of H.scene.children.slice()) {
    if (before.has(node)) continue;
    if (node.geometry?.parameters?.width === 800) node.removeFromParent();
    else group.add(node);
  }

  const { x0, x1, z0, z1 } = model;
  const size = [x1-x0,z1-z0];
  const mid = [(x0+x1)/2,(z0+z1)/2];
  const surface = built.floor;
  surface.geometry.dispose();
  surface.geometry = new THREE.PlaneGeometry(...size);
  const uv = surface.geometry.attributes.uv;
  const bounds = H.bounds;
  for (let i=0;i<uv.count;i++) {
    const u = (x0 + uv.getX(i)*size[0]-bounds.x0)/(bounds.x1-bounds.x0);
    const v = (bounds.z1-z1+uv.getY(i)*size[1])/(bounds.z1-bounds.z0);
    uv.setXY(i,u,v);
  }
  surface.position.set(mid[0],.012,mid[1]);

  for (const [baseY, height, bleed, tint] of [[-.08,.16,.055,model.liner],[-.25,.18,.15,model.edge],[-.432,.19,.26,model.liner]]) {
    const layer=new THREE.Mesh(new THREE.BoxGeometry(size[0]+bleed,height,size[1]+bleed),paperMaterial({color:tint}));
    layer.position.set(mid[0],baseY,mid[1]);
    layer.castShadow=true;
    layer.receiveShadow=true;
    group.add(layer);
  }
  group.position.x=offset;
  H.scene.add(group);
  const shadowInk=document.createElement('canvas');
  shadowInk.width=256;
  shadowInk.height=256;
  const brush=shadowInk.getContext('2d');
  brush.filter='blur(14px)';
  brush.fillStyle='#685540';
  brush.beginPath();
  brush.roundRect(31,37,195,173,13);
  brush.fill();
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(size[0]*1.29,size[1]*1.31),new THREE.MeshBasicMaterial({
    map:new THREE.CanvasTexture(shadowInk), transparent:true, opacity:.57, depthWrite:false,
    color:'#91816b',
  }));
  shadow.material.map.colorSpace=THREE.SRGBColorSpace;
  shadow.rotation.x=-Math.PI/2;
  shadow.position.set(mid[0]+.91,pageHeight+.008,mid[1]+.69);
  group.add(shadow);
  return { ...built, group, offset };
}

const previous = motion === 'to-track' ? 'gym' : motion === 'to-kitchen' ? 'track' : null;
const previousOffset = motion === 'to-track' ? -22.8 : -24.2;
let props = {};
let from;
let workoutSets;
H.scene.background = new THREE.Color().setScalar(1.36);
const tableShadow = new THREE.Mesh(new THREE.PlaneGeometry(240,190), new THREE.ShadowMaterial({ color:'#61513e',opacity:.20,depthWrite:false }));
tableShadow.rotation.x=-Math.PI/2;
tableShadow.position.y=pageHeight;
tableShadow.receiveShadow=true;
H.scene.add(tableShadow);
if (H.flags.TEST) {
  plate(-2.3,-1.3,2.4,3.9,'#78785a');
  pot(2.6,-1,1,715);
} else if (continuous) {
  workoutSets = { gym:mountModel('gym', -21), track:mountModel('track'), kitchen:mountModel('kitchen', 24) };
  for (const set of Object.values(workoutSets)) placeStaticDiorama(set);
  workoutSets.track.signs.forEach(sign => sign.reset(0));
} else {
  if (previous) from=mountModel(previous,previousOffset);
  props=mountModel(sceneKey);
}

const doll = makeDoll(H, { profile: true, withHat: bookend });
const hero = H.popup(null, null, { node: doll.root, height: 4.4, x: 0, z: 0, scale: sceneKey === 'track' && !motion ? .63 : 1, level: true, self: true, order: 10, sight: false });
const strawHat = bookend ? hero.group.getObjectByName('straw hat') : null;
H.setHero(hero, { stride: (distance, gait) => doll.pose(gait ? 'walk' : 'idle', distance * 2.2, gait) });

let avatarShadow;
if (bookend) {
  const ink=document.createElement('canvas');
  ink.width=128;
  ink.height=128;
  const brush=ink.getContext('2d');
  const gradient=brush.createRadialGradient(64,64,4,64,64,62);
  gradient.addColorStop(0,'rgba(88,62,41,.67)');
  gradient.addColorStop(.39,'rgba(88,62,41,.39)');
  gradient.addColorStop(1,'rgba(88,62,41,0)');
  brush.fillStyle=gradient;
  brush.fillRect(0,0,128,128);
  const map=new THREE.CanvasTexture(ink);
  map.colorSpace=THREE.SRGBColorSpace;
  avatarShadow=new THREE.Mesh(new THREE.PlaneGeometry(5.3,3.7),new THREE.MeshBasicMaterial({ map, transparent:true, depthWrite:false }));
  avatarShadow.rotation.x=-Math.PI/2;
  avatarShadow.visible=false;
  H.scene.add(avatarShadow);
}

const leftHand = new THREE.Vector3();
const rightHand = new THREE.Vector3();
const aim = new THREE.Vector3();
const boardPoint = new THREE.Vector3(-1.1, 2.39, -1.91);
const panPoint = new THREE.Vector3(-3.10, 2.41, -2.33);
const platePoint = new THREE.Vector3(-1.97, 2.39, -2.27);
const up = new THREE.Vector3(0, 1, 0);
const loopLength = { gym: 20.6, track: 8.4, kitchen: isFinish ? 6.55 : 12 };
const greetingDuration = 5.55;
const arrivalDuration = greetingDuration + 3.35;
const sceneLength = motion ? { arrival:arrivalDuration, 'to-track':3.55, 'to-kitchen':5.60 }[motion] : loopLength[sceneKey];
const tau = Math.PI * 2;
const portraitTurn = THREE.MathUtils.degToRad(-8);
const portraitTilt = THREE.MathUtils.degToRad(-11);
const ease = (v) => {
  const n = Math.max(0, Math.min(1, v));
  return n * n * (3 - 2 * n);
};
let clock = 0;

function walkProgress(time) {
  const t = THREE.MathUtils.clamp(time, 0, 1);
  const ramp = .22;
  const half = Math.min(t, 1 - t);
  const u = half / ramp;
  const elapsed = half < ramp ? ramp * u ** 3 * (1 - u / 2) : half - ramp / 2;
  const distance = elapsed / (1 - ramp);
  return t <= .5 ? distance : 1 - distance;
}

function turnToward(from, to, amount) {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * amount;
}

function frameOutside(prominence, onPage) {
  doll.root.scale.setScalar(toward(1, 2.14, prominence));
  const posture = prominence * onPage;
  doll.root.rotation.x = portraitTilt * posture;
  if (strawHat?.visible) strawHat.rotation.x -= doll.root.rotation.x;
  hero.group.position.x += Math.sin(hero.group.rotation.y) * .52 * posture;
  hero.group.position.z += Math.cos(hero.group.rotation.y) * .52 * posture;
  avatarShadow.visible = onPage > 0;
  avatarShadow.position.set(hero.group.position.x + .18, pageHeight + .013, hero.group.position.z + .14);
  avatarShadow.scale.setScalar(.64 + .70 * prominence);
  avatarShadow.material.opacity = onPage * (.48 + .36 * prominence);
}

function aimTool(tool, grip, x, y, z) {
  tool.position.copy(grip);
  aim.set(x, y, z).sub(grip).normalize();
  tool.quaternion.setFromUnitVectors(up, aim);
}

const squatRack = new THREE.Vector3(0, rackPosition.seat, rackPosition.cup);
const gymAim = new THREE.Vector3();
const barBack = new THREE.Vector3();
const repLength = 1.65;
const setLength = repLength * (continuous ? 2 : 3);
const rearWalkEnd = setLength + .61;
const pullStart = setLength + 1.37;
const pullEnd = pullStart + setLength;
const toMatStart = pullEnd + .30;
const matStart = toMatStart + 1.06;
const pushStart = matStart + .35;
const pushEnd = pushStart + setLength;
const exitStart = pushEnd + .54;

function exertion(t) {
  const rep = t % repLength;
  return ease((rep - .07) / .54) * (1 - ease((rep - .68) / .80));
}

function gym(t) {
  const pullDepth = rackPosition.front - .29;
  const rearDepth = rackPosition.cup + .34;

  const squat = t < setLength;
  const pull = t >= pullStart && t < pullEnd;
  const push = t >= pushStart && t < pushEnd;
  const towardCups = ease((t - setLength) / (rearWalkEnd - setLength));
  const toFront = ease((t - rearWalkEnd) / (pullStart - rearWalkEnd));
  const toMat = ease((t - toMatStart) / (matStart - toMatStart));
  const exit = continuous ? 0 : walkProgress((t - exitStart) / (loopLength.gym - exitStart));
  const railGrip = pullStart - .31;
  const onRail = ease((t - railGrip) / .31) * (1 - ease((t - pullEnd) / .30));
  const readyToPush = ease((t - matStart) / (pushStart - matStart)) * (1 - ease((t - pushEnd) / .50));
  const load = squat ? exertion(t) : 0;
  const lift = pull ? exertion(t - pullStart) : 0;
  const dip = push ? exertion(t - pushStart) : 0;

  const matTravel = toMat * (1 - exit);
  const zAtRack = toward(toward(squatDepth, rearDepth, towardCups), pullDepth, toFront);
  const z = toward(toward(zAtRack, 4.67, toMat), 5.01, exit);
  const yaw = toward(toward(0, Math.PI - 1.12, toMat), Math.PI / 2, ease(exit * 3));
  hero.group.position.set(toward(-2.38 * toMat, 5.10, exit), .025 + onRail * (.36 + .64 * lift) + readyToPush * .14, z);
  hero.group.rotation.y = yaw;
  doll.root.rotation.x = readyToPush * toward(1.31, 1.516, dip);
  const holdingBar = t <= rearWalkEnd;
  const walking = (t > rearWalkEnd && t < railGrip) || (t > toMatStart && t < matStart) ||
    t >= exitStart;
  doll.pose(holdingBar ? 'lift' : walking ? 'walk' : 'idle',
    holdingBar ? Math.acos(1 - load * 2) : walking ? t * 7.5 : 0, .97);
  if (t >= exitStart) doll.settle('idle', 1 - ease(exit / .17) + ease((exit - .83) / .17));
  hero.group.updateMatrixWorld(true);

  doll.upperBack(barBack);
  const seatWeight = ease((t - rearWalkEnd + .18) / .18);
  props.bar.position.copy(barBack).lerp(squatRack, seatWeight);

  for (const side of [-1, 1]) {
    const arm = side === -1 ? 0 : 1;
    if (holdingBar) {
      doll.reach(arm, gymAim.set(side * .83, props.bar.position.y + .05, props.bar.position.z));
    } else if (onRail > 0) {
      const hand = arm === 0 ? leftHand : rightHand;
      doll.hand(arm, hand).lerp(gymAim.set(side * .70, rackPosition.pull + .045, rackPosition.front), onRail);
      doll.reach(arm, hand);
    } else if (readyToPush > 0) {
      const hand = arm === 0 ? leftHand : rightHand;
      doll.hand(arm, hand).lerp(
        gymAim.set(-2.38 + Math.sin(yaw)*3.05 + side * .62*Math.cos(yaw), .20,
          4.67 + Math.cos(yaw)*3.05 - side * .62*Math.sin(yaw)), readyToPush);
      doll.reach(arm, hand);
    }
  }

  H.target.x = cfg.target[0] + toward(-.05, .11, matTravel);
  H.target.z = toward(-.65, .20, matTravel);
  const rackReady = Math.min(props.rackFront.p, props.rackBack.p) > .87;
  props.bar.visible = rackReady;
  props.rail.visible = rackReady;
  props.rackBraces.forEach((piece) => { piece.visible = rackReady; });
  document.documentElement.dataset.action = squat ? 'squat' : pull ? 'pull-up' : push ? 'push-up' : 'transition';
}

const trackEntry = 3.24;
const trackExit = 6.08;
const trackDuration = 7.6;
const laneX = angle => lap.x * Math.cos(angle);
const laneZ = angle => lap.center + lap.z * Math.sin(angle);

function track(t) {
  const fraction = continuous ? t / trackDuration : t / loopLength.track;
  const progress = continuous ? walkProgress(fraction) : fraction;
  const angle = continuous ? toward(trackEntry, trackExit, progress) : lap.start + tau * progress;
  const x = lap.x * Math.cos(angle), z = lap.center + lap.z * Math.sin(angle);
  const phase = tau * (continuous ? 8 : 17) * progress;
  hero.group.position.set(x, .035 + Math.abs(Math.sin(phase)) * .088, z);
  hero.group.rotation.y = Math.atan2(-lap.x * Math.sin(angle), lap.z * Math.cos(angle));
  doll.pose('run', phase);
  if (continuous) doll.settle('idle', 1 - ease(fraction / .15) * (1 - ease((fraction - .82) / .18)));
  H.target.x = cfg.target[0] + x * .032;
  H.target.z = -1.2;
  props.signs.forEach((sign, index) => {
    const approach = [.56, 1.83, 3.13][index];
    const rising = ease((t - approach) / .62);
    const falling = continuous ? 0 : ease((t - 7.2 - index * .18) / .6);
    sign.reset(rising * (1 - falling));
  });
}

function kitchen(t, finishing = isFinish) {
  if (finishing) {
    const leave = walkProgress((t - .08) / 2.54);
    const x = toward(.47, -11.83, leave);
    const z = toward(1.28, 7.85, leave);
    const turn = ease((t - 2.10) / .52);
    hero.group.position.set(x, toward(.026, pageHeight + .035, ease((leave - .65) / .32)), z);
    const camera = H.camera.position;
    const viewer = Math.atan2(camera.x - (continuous ? props.offset : 0) - x, camera.z - z);
    hero.group.rotation.y = turnToward(-1.03, viewer + portraitTurn, .36 * ease((leave - .57) / .17) + .64 * turn);
    doll.pose('walk', leave * (27 - 4 * leave));
    doll.settle('idle', 1 - ease(leave / .16));
    const standing = ease((t - 2.19) / .43);
    const waving = ease((t - 2.48) / .45) * (1 - ease((t - 5.10) / .63));
    doll.settle('stand-wave', standing, t * 7.3, waving);
    const hatGrip = ease((t - 1.79) / .29) * (1 - ease((t - 2.50) / .28));
    doll.wearHat(ease((t - 1.92) / .62), hatGrip);
    const prominence = ease((leave - .60) / .40);
    frameOutside(prominence, ease((leave - .67) / .25));
    props.knife.visible=false;
    props.spoon.visible=false;
    props.plateOfFood.visible=true;
    props.apron.visible=false;
    props.ingredients.forEach(piece=>{piece.visible=false;});
    props.steam.visible=false;
    H.target.set(toward(cfg.target[0], -2.75, leave), toward(cfg.target[1], 1.48, leave), toward(cfg.target[2], 2.40, leave));
    H.view.dist = toward(cfg.dist, 46.7, ease((leave - .45) / .55));
    return;
  }

  const travel = ease((t - 2.7) / 1.45);
  const servingStart = 9.78;
  const departure = walkProgress((t - servingStart) / (loopLength.kitchen - servingStart));
  const cutting = t < 3.18;
  const transfer = t >= 3.18 && t < 4.40;
  const plating = t >= 8.3 && t < 10.72;
  const step = (t >= 2.7 && t < 4.15) || t >= servingStart;
  const chopping = t < 2.65 ? Math.abs(Math.sin(t * 6.5)) : 0;
  const stirring = (t - 4.40) * 4;
  hero.group.position.set(toward(toward(-.24, -2.25, travel), .47, departure), .025, toward(-1.16 - .25 * travel, 1.28, departure));
  hero.group.rotation.y = turnToward(toward(-1.81, -1.93, travel), -1.03, ease(departure * 3));
  H.target.x = cfg.target[0] - .32 * travel * (1 - departure);
  H.target.z = -.7;
  doll.pose(step ? 'walk' : 'cook', step ? t * 9 : t * 2.4);
  if (t >= servingStart) doll.settle('idle', ease((departure - .79) / .21));
  hero.group.updateMatrixWorld(true);

  if (cutting) {
    doll.reach(0, leftHand.set(boardPoint.x + .36, 2.65 + chopping * .20, boardPoint.z + .27));
    doll.reach(1, rightHand.set(boardPoint.x - .38, 2.53, boardPoint.z + .09));
    aimTool(props.knife, doll.hand(0, leftHand), boardPoint.x - .12, 2.41 + chopping * .13, boardPoint.z - .25);
  } else if (transfer) {
    const pour = ease((t - 3.05) / 1.35);
    doll.reach(0, leftHand.set(toward(boardPoint.x + .28, panPoint.x + .47, pour), 2.62 + Math.sin(pour * Math.PI) * .24, -1.71));
    doll.reach(1, rightHand.set(toward(boardPoint.x - .25, panPoint.x - .29, pour), 2.65, -1.91));
  } else if (t < servingStart) {
    const scoop = plating ? Math.sin(ease((t - 8.3) / 1.95) * Math.PI / 2) : 0;
    const x = toward(panPoint.x, platePoint.x, scoop);
    doll.reach(0, leftHand.set(x + .43 + Math.cos(stirring) * .16, 2.68 + scoop * .11, panPoint.z + .38 + Math.sin(stirring) * .13));
    doll.reach(1, rightHand.set(panPoint.x + .04, 2.52, panPoint.z + .85));
    aimTool(props.spoon, doll.hand(0, leftHand), x + Math.cos(stirring) * .25, 2.44 + Math.sin(scoop * Math.PI) * .18, panPoint.z + Math.sin(stirring) * .25);
  }

  props.knife.visible = cutting;
  props.spoon.visible = !cutting && !transfer && t < servingStart;
  const boardLift = ease((t - 3.16) / .38) * (1 - ease((t - 4.3) / .47));
  const boardYield = ease((t - 3.3) / 1.06);
  props.board.position.set(boardPoint.x - 1.22 * boardLift * boardYield, 2.34 + .26 * boardLift, boardPoint.z - .14 * boardLift);
  props.board.rotation.x = -Math.PI / 2;
  props.board.rotation.z = -.15 - .55 * boardLift * boardYield;
  const serving = ease((t - 8.55) / 1.28);
  props.ingredients.forEach((piece, i) => {
    piece.visible = t < servingStart;
    const angle = i * 2.399 + (t > 4.5 && t < 8.55 ? .3 * Math.sin(stirring + i * .5) : 0);
    const ring = .16 + .035 * i;
    const ox = Math.cos(angle) * ring, oz = Math.sin(angle) * ring * .65;
    const delay = i * .031;
    const pour = ease((t - 3.37 - delay) / .75);
    const moved = ease((t - 8.63 - delay) / .88);
    piece.position.set(toward(toward(boardPoint.x + ox, panPoint.x + ox, pour), platePoint.x + ox, moved),
      2.46 + Math.sin(pour * Math.PI) * .35 + Math.sin(moved * Math.PI) * .26,
      toward(toward(boardPoint.z + oz, panPoint.z + oz, pour), platePoint.z + oz, moved));
    piece.rotation.z = angle + .10 * Math.sin(t * 2 + i);
  });
  props.pan.rotation.y = t > 4.4 && t < 8.55 ? Math.sin(stirring) * .036 : 0;
  props.steam.visible = boardYield > .61 && serving < .96;
  props.steam.children.forEach((p, i) => { p.rotation.z = Math.sin(t * 1.9 + i * .57) * .16; });
  const dish = props.plateOfFood;
  dish.visible = t >= servingStart;
  if (dish.visible) {
    dish.position.set(
      toward(platePoint.x, 1.70, departure),
      toward(2.41, 1.79, departure) + .34 * Math.sin(departure * Math.PI),
      toward(platePoint.z, .84, departure),
    );
    const grip = ease((t - servingStart) / .21) * (1 - ease((departure - .72) / .24));
    for (const [arm, hand, side] of [[0, leftHand, 1], [1, rightHand, -1]]) {
      doll.hand(arm, hand).lerp(aim.set(dish.position.x + side * .49, dish.position.y, dish.position.z + .21), grip);
      doll.reach(arm, hand);
    }
  }
  hero.group.updateMatrixWorld(true);
  props.apron.position.copy(hero.group.localToWorld(aim.set(0, 1.88, .245)));
  props.apron.quaternion.copy(hero.group.quaternion);
  props.apron.scale.setScalar(1 - ease((departure - .55) / .39));
  props.apron.visible = departure < .94;
}

const laneEntryX = lap.x * Math.cos(lap.start);
const laneEntryZ = lap.center + lap.z * Math.sin(lap.start);
const laneEntryYaw = Math.atan2(-lap.x * Math.sin(lap.start), lap.z * Math.cos(lap.start));
const routeNodes = {
  arrival: [[-13.90,pageHeight+.035,6.95],[-8.9,pageHeight+.035,7.14],[-4.1,.025,5.56],[-2.55,.025,2.55],[0,.025,squatDepth]],
  'to-track': [[-17.7,.025,5.01],[-15.24,.025,5.01],[-11.32,pageHeight+.035,4.97],[-8.85,.025,2.84],[-6.52,.035,1.62],[laneEntryX,.035,laneEntryZ]],
  'to-kitchen': [[previousOffset+laneEntryX,.035,laneEntryZ],[previousOffset+laneEntryX-.36,.035,laneEntryZ-.93],[-32.5,.035,-.65],[-32.7,.035,2.3],[-28.8,.035,5.1],[-21.1,.035,5.23],[-14.1,.035,4.7],[-11.0,pageHeight+.035,3.6],[-7.8,.025,2.68],[-4.29,.025,1.26],[-.24,.025,-1.16]],
};
const makeRoute = points => new THREE.CatmullRomCurve3(points.map(coords => new THREE.Vector3(...coords)));
const route = motion ? makeRoute(routeNodes[motion]) : continuous ? makeRoute(routeNodes.arrival) : null;
const pace = new THREE.Vector3();

function placeStaticDiorama(model) {
  if (model.bar) {
    model.bar.position.set(0,rackPosition.seat,rackPosition.cup);
    model.rail.visible=true;
  }
  if (model.signs) model.signs.forEach(sign=>sign.reset(.96));
  if (model.knife) {
    model.knife.visible=false;
    model.spoon.visible=false;
    model.apron.visible=false;
    model.ingredients.forEach(piece=>{piece.visible=false;});
    model.steam.visible=false;
    model.plateOfFood.visible=false;
  }
}

function walkBetween(t, opening = motion === 'arrival') {
  placeStaticDiorama(props);
  if (from) {
    placeStaticDiorama(from);
    if (from.signs) from.signs.forEach(sign => sign.reset(0));
  }
  if (props.signs) props.signs.forEach(sign => sign.reset(0));
  const introducing = opening;
  const wait = introducing ? greetingDuration : 0;
  const moveEnd = introducing ? arrivalDuration - .5 : sceneLength;
  const time = THREE.MathUtils.clamp((t - wait) / (moveEnd - wait), 0, 1);
  const progress = walkProgress(time);
  if (from) {
    from.group.position.x = previousOffset - 7.5 * ease((progress - .64) / .33);
    props.group.position.x = props.offset + 6 * (1 - ease(progress / .36));
  }
  route.getPointAt(progress,hero.group.position);
  route.getTangentAt(Math.min(.998,progress),pace);
  const camera = H.camera.position;
  const viewer = Math.atan2(camera.x-(continuous ? props.offset : 0)-hero.group.position.x,camera.z-hero.group.position.z);
  const pathYaw = Math.atan2(pace.x,pace.z);
  hero.group.rotation.y = t < wait ? viewer : pathYaw;
  const isRunning = motion === 'to-track';
  doll.root.scale.setScalar(isRunning ? toward(1,.63,ease((time-.4)/.60)) : motion === 'to-kitchen' ? toward(.63,1,ease(time/.7)) : 1);

  if (introducing) {
    const facing = ease((t - wait) / .32) * (.48 + .52 * ease((progress - .47) / .18));
    const direction = turnToward(viewer + portraitTurn, pathYaw, facing);
    const settle = ease((t - moveEnd + .24) / .59);
    hero.group.rotation.y = turnToward(direction, 0, settle);
    doll.pose('walk', progress * (23 + 9 * progress));
    const waving = ease((t - .06) / .25) * (1 - ease((t - 1.68) / .42));
    doll.settle('stand-wave', 1 - ease((t - wait) / .36), t * 8.2, waving);
    const hatGrip = ease((t - wait + .20) / .27) * (1 - ease((t - wait - .54) / .26));
    doll.wearHat(1 - ease((t - wait) / .65), hatGrip);
    doll.settle('lift', settle);
    const prominence = 1 - ease((progress - .035) / .485);
    frameOutside(prominence, 1 - ease((progress - .35) / .20));
    doll.upperBack(barBack);
    const grip = ease((t - moveEnd + .10) / .55);
    props.bar.position.copy(squatRack).lerp(barBack, grip);
    if (grip > 0) {
      for (const side of [-1, 1]) {
        const arm = side === -1 ? 0 : 1;
        const hand = arm === 0 ? leftHand : rightHand;
        doll.hand(arm, hand).lerp(gymAim.set(side * .83, props.bar.position.y + .05, props.bar.position.z), grip);
        doll.reach(arm, hand);
      }
    }
    H.target.set(toward(-2.85, cfg.target[0] - .05, progress), cfg.target[1], toward(.65, cfg.target[2], progress));
    H.view.dist = toward(51.6, cfg.dist, ease((progress - .12) / .56));
  } else {
    const landing = ease((time - .76) / .24);
    const gait = isRunning ? toward(progress * 29, tau * 5, landing) : progress * 59;
    doll.pose(isRunning ? 'run' : 'walk', gait);
    if (isRunning) doll.settle('idle', 1 - ease(time / .21));
    else doll.settle('run', 1 - ease((time - .17) / .20), gait);
    hero.group.rotation.y = turnToward(pathYaw, isRunning ? laneEntryYaw : -1.81, landing);
    if (!isRunning) {
      doll.settle('cook', landing);
      const reach = ease((time - .86) / .14);
      if (reach > 0) {
        doll.hand(0, leftHand).lerp(aim.set(boardPoint.x + .36, 2.65, boardPoint.z + .27), reach);
        doll.hand(1, rightHand).lerp(aim.set(boardPoint.x - .38, 2.53, boardPoint.z + .09), reach);
        doll.reach(0, leftHand);
        doll.reach(1, rightHand);
        props.knife.visible = reach > .65;
        aimTool(props.knife, doll.hand(0, leftHand), boardPoint.x - .12, 2.41, boardPoint.z - .25);
        props.apron.visible = reach > .65;
        props.apron.position.copy(hero.group.localToWorld(aim.set(0, 1.88, .245)));
        props.apron.quaternion.copy(hero.group.quaternion);
      }
    }
    const startView = authored[previous];
    const startX = previous === 'gym' ? startView.target[0] - .05 : startView.target[0] + laneEntryX * .032;
    const endX = isRunning ? cfg.target[0] + laneEntryX * .032 : cfg.target[0];
    const cameraProgress = isRunning ? progress : ease(progress);
    H.target.set(
      toward(previousOffset + startX, endX, cameraProgress),
      toward(startView.target[1], cfg.target[1], cameraProgress),
      toward(startView.target[2], cfg.target[2], cameraProgress),
    );
    H.view.dist = toward(startView.dist, cfg.dist, cameraProgress);
    H.view.tyaw = toward(startView.yaw, cfg.yaw, progress);
    H.view.tpitch = toward(startView.pitch, cfg.pitch, progress);
  }
}

const workoutTiming = {
  arrivalWalk: greetingDuration,
  gym: arrivalDuration,
  trackWalk: arrivalDuration + exitStart,
};
workoutTiming.track = workoutTiming.trackWalk + 4;
workoutTiming.kitchenWalk = workoutTiming.track + trackDuration;
workoutTiming.kitchen = workoutTiming.kitchenWalk + 3.4;
workoutTiming.finish = workoutTiming.kitchen + 12;
workoutTiming.end = workoutTiming.finish + 6.55;

const workoutPaths = continuous && !H.flags.TEST ? {
  track: makeRoute([
    [workoutSets.gym.offset - 2.38,.025,4.67],[-20.1,.025,4.85],[-15.5,.025,5.22],
    [-12.74,.025,4.96],[-11.95,pageHeight+.035,4.66],[-10.87,pageHeight+.035,4.06],
    [-10.35,.035,3.6],[-7.38,.035,2.02],[laneX(trackEntry),.035,laneZ(trackEntry)],
  ]),
  kitchen: makeRoute([
    [laneX(trackExit),.035,laneZ(trackExit)],[7.25,.035,1.26],[9.22,.035,3.18],
    [10.44,.035,4.20],[11.30,pageHeight+.035,4.35],[14.70,pageHeight+.035,3.83],
    [16.03,.025,3.42],[19.26,.025,2.30],[22,.025,.67],[workoutSets.kitchen.offset-.24,.025,-1.16],
  ]),
} : null;

function onWorkoutSet(key, update) {
  props = workoutSets[key];
  cfg = authored[key];
  H.target.set(...cfg.target);
  H.view.dist = cfg.dist;
  H.view.tyaw = cfg.yaw;
  H.view.tpitch = cfg.pitch;
  props.group.position.x = 0;
  update();
  props.group.position.x = props.offset;
  hero.group.position.x += props.offset;
  H.target.x += props.offset;
  if (avatarShadow.visible) avatarShadow.position.x += props.offset;
}

function travelToSet(key, fraction) {
  const toTrack = key === 'track';
  const progress = walkProgress(fraction);
  const path = workoutPaths[key];
  path.getPointAt(progress, hero.group.position);
  path.getTangentAt(Math.min(.998, progress), pace);
  const landing = ease((fraction - .77) / .23);
  const entryAngle = Math.atan2(-lap.x * Math.sin(trackEntry), lap.z * Math.cos(trackEntry));
  const startAngle = toTrack ? Math.PI - 1.12 : Math.atan2(-lap.x * Math.sin(trackExit), lap.z * Math.cos(trackExit));
  const heading = turnToward(startAngle, Math.atan2(pace.x, pace.z), ease(fraction / .11));
  hero.group.rotation.y = turnToward(heading, toTrack ? entryAngle : -1.81, landing);
  doll.root.scale.setScalar(toTrack ? toward(1, .63, ease((fraction - .35) / .49)) : toward(.63, 1, ease((fraction - .18) / .62)));
  doll.pose('walk', progress * (toTrack ? 34 : 31));
  doll.settle('idle', 1 - ease(fraction / .15) * (1 - landing));

  const prep = ease((fraction - .82) / .18);
  if (!toTrack && prep > 0) {
    const set = workoutSets.kitchen;
    hero.group.position.x -= set.offset;
    doll.settle('cook', prep);
    doll.hand(0, leftHand).lerp(aim.set(boardPoint.x + .36, 2.65, boardPoint.z + .27), prep);
    doll.hand(1, rightHand).lerp(aim.set(boardPoint.x - .38, 2.53, boardPoint.z + .09), prep);
    doll.reach(0, leftHand);
    doll.reach(1, rightHand);
    set.knife.visible = prep > .45;
    aimTool(set.knife, doll.hand(0, leftHand), boardPoint.x - .12, 2.41, boardPoint.z - .25);
    set.apron.visible = prep > .3;
    set.apron.scale.setScalar(ease((prep - .3) / .65));
    set.apron.position.copy(hero.group.localToWorld(aim.set(0, 1.88, .245)));
    set.apron.quaternion.copy(hero.group.quaternion);
    set.ingredients.forEach((piece, i) => {
      const angle = i * 2.399;
      const ring = .16 + .035 * i;
      piece.position.set(boardPoint.x + Math.cos(angle) * ring, 2.46, boardPoint.z + Math.sin(angle) * ring * .65);
      piece.rotation.z = angle;
      piece.visible = prep > .35;
    });
    hero.group.position.x += set.offset;
  }

  const fromKey = toTrack ? 'gym' : 'track';
  const fromView = authored[fromKey];
  const toView = authored[key];
  const fromX = workoutSets[fromKey].offset + fromView.target[0] + (toTrack ? .11 : laneX(trackExit) * .032);
  const toX = workoutSets[key].offset + toView.target[0] + (toTrack ? laneX(trackEntry) * .032 : 0);
  H.target.set(toward(fromX, toX, progress), toward(fromView.target[1], toView.target[1], progress),
    toward(toTrack ? .20 : fromView.target[2], toView.target[2], progress));
  H.view.dist = toward(fromView.dist, toView.dist, progress);
  H.view.tyaw = toward(fromView.yaw, toView.yaw, progress);
  H.view.tpitch = toward(fromView.pitch, toView.pitch, progress);
}

function animateWorkout(t) {
  const timing = workoutTiming;
  workoutSets.kitchen.group.visible = t >= timing.track;
  workoutSets.gym.group.visible = t < timing.kitchenWalk;
  workoutSets.track.group.visible = t >= timing.trackWalk && t < timing.kitchen;
  if (t < timing.track) workoutSets.track.signs.forEach(sign => sign.reset(0));
  avatarShadow.visible = false;
  doll.root.rotation.x = 0;
  doll.wearHat(0);
  if (t < timing.gym) onWorkoutSet('gym', () => walkBetween(t, true));
  else if (t < timing.trackWalk) {
    doll.root.scale.setScalar(1);
    onWorkoutSet('gym', () => gym(t - timing.gym));
  } else if (t < timing.track) travelToSet('track', (t - timing.trackWalk) / (timing.track - timing.trackWalk));
  else if (t < timing.kitchenWalk) {
    doll.root.scale.setScalar(.63);
    onWorkoutSet('track', () => track(t - timing.track));
  } else if (t < timing.kitchen) travelToSet('kitchen', (t - timing.kitchenWalk) / (timing.kitchen - timing.kitchenWalk));
  else if (t < timing.finish) {
    doll.root.scale.setScalar(1);
    onWorkoutSet('kitchen', () => kitchen(t - timing.kitchen));
  } else onWorkoutSet('kitchen', () => kitchen(Math.min(t, timing.end) - timing.finish, true));
}

function animate(time, dt) {
  if (H.flags.TEST) return;
  clock += dt;
  const elapsed=Math.max(0,clock-2.4);
  if (continuous) {
    animateWorkout(elapsed);
    return;
  }
  const t = Math.min(elapsed,sceneLength);
  if (motion) walkBetween(t);
  else if (sceneKey === 'gym') gym(t);
  else if (sceneKey === 'track') track(t);
  else kitchen(t);
}

H.onRestart(() => { clock = 0; });
H.onStep(animate);
H.start();
document.documentElement.dataset.pose = poseKey;
window.longRepCapture = {
  duration: continuous ? workoutTiming.end : sceneLength,
  timing: continuous ? workoutTiming : undefined,
  settle: 2.4,
  mouth() {
    const mouth = doll.mouth(aim).project(H.camera);
    const x = Math.round((.5 + mouth.x / 2) * 1000);
    const head = doll.crown(aim).project(H.camera);
    return [x, Math.round((.5 - head.y / 2) * 1000)];
  },
};
