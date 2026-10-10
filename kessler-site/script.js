/* ---------------------------------------------------------------
   KESSLER / concept site
   1. dot field: runs on its own, pointer only reshapes it
   2. sweep: a line crosses, behind it the next step is already set
   3. feed: a screening window that keeps ticking
--------------------------------------------------------------- */

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =============== 1. dot field =============== */
const cvs = document.getElementById('field');
const box = document.getElementById('fieldbox');
const tick = document.getElementById('fieldTick');
const ctx = cvs.getContext('2d', { alpha: true });

const CELL = 8;
const BAYER = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v => (v + 0.5) / 16);

let W = 0, H = 0, cols = 0, rows = 0, offX = 0, offY = 0;
let dotRGB = '241,236,255';

const shells = [
  { m: 1.34, w: 10, amp: .92, k: 7,  k2: 3, spd: .17, ph: 0.4 },
  { m: 1.72, w: 8,  amp: .78, k: 11, k2: 5, spd: -.13, ph: 2.1 },
  { m: 2.14, w: 12, amp: .62, k: 5,  k2: 9, spd: .09, ph: 4.7 },
  { m: 2.62, w: 7,  amp: .44, k: 13, k2: 4, spd: -.07, ph: 1.2 }
];

function readColors(){
  dotRGB = getComputedStyle(root).getPropertyValue('--dot').trim() || '241,236,255';
}

function sizeCanvas(){
  const r = box.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = r.width; H = r.height;
  cvs.width = Math.round(W * dpr);
  cvs.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cols = Math.floor(W / CELL);
  rows = Math.floor(H / CELL);
  offX = (W - cols * CELL) / 2;
  offY = (H - rows * CELL) / 2;
}

let pxs = 0, pys = 0, ptx = 0, pty = 0, pIn = 0, pWant = 0;

box.addEventListener('pointermove', e => {
  const r = box.getBoundingClientRect();
  ptx = e.clientX - r.left;
  pty = e.clientY - r.top;
  pWant = 1;
});
box.addEventListener('pointerleave', () => { pWant = 0; });

function smooth(a, b, x){
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

let lastTick = -1;

function drawField(ms){
  const t = ms / 1000;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.128;
  const A = t * 0.42;

  // the pointer never starts the motion, it only pulls the shape.
  // with no pointer the target keeps drifting by itself.
  pIn += (pWant - pIn) * 0.05;
  const dx0 = cx + Math.cos(t * 0.29) * W * 0.30;
  const dy0 = cy + Math.sin(t * 0.21) * H * 0.32;
  const gx = ptx * pIn + dx0 * (1 - pIn);
  const gy = pty * pIn + dy0 * (1 - pIn);
  pxs += (gx - pxs) * 0.055;
  pys += (gy - pys) * 0.055;

  const pull = 30 + 26 * pIn;
  const sig = 118 + 34 * pIn;
  const inv2 = 1 / (2 * sig * sig);

  for (let j = 0; j < rows; j++){
    const y = offY + (j + 0.5) * CELL;
    const dy = y - cy;
    const py = y - pys;
    for (let i = 0; i < cols; i++){
      const x = offX + (i + 0.5) * CELL;
      const dx = x - cx;
      const px = x - pxs;

      const infl = Math.exp(-(px * px + py * py) * inv2);
      let r = Math.sqrt(dx * dx + dy * dy) - pull * infl;
      if (r < 0) r = -r;

      let v = smooth(R + 3, R - 7, r) * 0.96;

      const ang = Math.atan2(dy, dx);
      for (let s = 0; s < shells.length; s++){
        const sh = shells[s];
        const d = r - R * sh.m;
        if (d > 34 || d < -34) continue;
        const band = Math.exp(-(d * d) / (2 * sh.w * sh.w));
        const clump = 0.5 + 0.5 * Math.sin(ang * sh.k + t * sh.spd + sh.ph)
                              * Math.sin(ang * sh.k2 - t * sh.spd * 0.7);
        const val = band * (0.20 + 0.80 * clump) * sh.amp;
        if (val > v) v = val;
      }

      // radar sweep: bright edge, long tail behind it
      let da = A - ang;
      da = da - Math.floor(da / 6.2831853) * 6.2831853;
      const lead = Math.exp(-(da * da) / 0.052);
      const tail = Math.exp(-da * 0.62) * 0.30;
      v += (lead * 0.62 + tail) * (0.11 + v * 0.95);

      const th = BAYER[((j & 3) << 2) + (i & 3)];
      if (v <= th * 0.98) continue;

      const c = v > 1 ? 1 : v;
      const s = 1 + 2.0 * c;
      ctx.globalAlpha = 0.26 + 0.74 * c;
      ctx.fillStyle = 'rgb(' + dotRGB + ')';
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }
  ctx.globalAlpha = 1;

  const n = Math.floor((A / 6.2831853) % 1000);
  if (n !== lastTick){
    lastTick = n;
    tick.textContent = 'sweep ' + String(n).padStart(3, '0');
  }
}

/* =============== 2. sweep steps =============== */
const STEPS = [
  {
    n: '01', t: 'Resolve',
    b: 'Two lines of elements go in. We pin the state vector, the drag term and the epoch, so the object is a body with a history and not a row in a file.',
    li: ['epoch drift checked against the last four fits', 'drag term re-estimated, never inherited'],
    head: 'object / 25544U',
    lines: ['id      <b>25544U</b>', 'epoch   <b>26240.51</b>', 'incl    <b>51.64 deg</b>', 'bstar   <b>0.00021</b>', 'fits    <b>4 / 4 ok</b>'],
    bars: [3,5,4,6,5,7,6,8,7,9,8,9]
  },
  {
    n: '02', t: 'Propagate',
    b: 'Ten thousand futures for one pass. Each one carries its own atmosphere, its own solar term, its own error growth, so the spread is earned and not assumed.',
    li: ['density sampled per run, not averaged', 'covariance grows with the run, not with a table'],
    head: 'runs / 10 000',
    lines: ['runs    <b>10 000</b>', 'spread  <b>1.8 km</b>', 'solar   <b>f10.7 148</b>', 'window  <b>6h 12m</b>', 'state   <b>converged</b>'],
    bars: [2,3,5,8,9,9,8,6,4,3,2,2]
  },
  {
    n: '03', t: 'Warn',
    b: 'What comes out is a probability with an edge on it. The tail is visible, so you can see how bad the bad case is before you spend fuel on it.',
    li: ['worst case first, average never shown alone', 'a burn is only suggested when the tail justifies it'],
    head: 'verdict / pass 4412',
    lines: ['miss    <b>412 m</b>', 'p(col)  <b>1.4e-4</b>', 'tail    <b>9.8e-4</b>', 'lead    <b>6h 02m</b>', 'action  <b>burn 0.4 m/s</b>'],
    bars: [9,8,7,5,4,3,3,2,2,1,1,1]
  }
];

const sweep = document.getElementById('sweep');

function buildLayer(el){
  const steps = document.createElement('div');
  steps.className = 'steps';
  STEPS.forEach(s => {
    const d = document.createElement('div');
    d.className = 'step';
    d.innerHTML =
      '<span class="step__n">' + s.n + '</span>' +
      '<div><div class="step__t">' + s.t + '</div>' +
      '<p class="step__b">' + s.b + '</p>' +
      '<ul class="step__list">' + s.li.map(x => '<li>' + x + '</li>').join('') + '</ul></div>';
    steps.appendChild(d);
  });

  const ro = document.createElement('div');
  ro.className = 'readout';
  ro.innerHTML = '<div class="readout__h"></div><div class="readout__body"></div>' +
                 '<div class="readout__bar"></div>';

  el.appendChild(steps);
  el.appendChild(ro);
  return { steps, ro };
}

function paint(layer, idx){
  const s = STEPS[idx];
  const rowsTpl = STEPS.map((_, i) => i === idx ? '1fr' : '62px').join(' ');
  layer.steps.style.gridTemplateRows = rowsTpl;
  [...layer.steps.children].forEach((el, i) => el.classList.toggle('is-on', i === idx));

  layer.ro.querySelector('.readout__h').textContent = s.head;
  layer.ro.querySelector('.readout__body').innerHTML =
    s.lines.map(l => '<div class="readout__l">' + l + '</div>').join('');
  layer.ro.querySelector('.readout__bar').innerHTML =
    s.bars.map(v => '<i style="height:' + (v * 10) + '%"></i>').join('');
}

const back = buildLayer(sweep.querySelector('[data-layer="back"]'));
const front = buildLayer(sweep.querySelector('[data-layer="front"]'));

let cur = 0;
paint(back, cur);
paint(front, cur);

let sweepT = null;
let holdUntil = 0;

function runSweep(next){
  const w = sweep.getBoundingClientRect().width;
  paint(front, next);
  sweep.classList.add('is-running');
  const dur = 900;
  const t0 = performance.now();

  function step(now){
    const p = Math.min(1, (now - t0) / dur);
    const e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    sweep.style.setProperty('--x', (e * w) + 'px');
    if (p < 1){ sweepT = requestAnimationFrame(step); return; }
    cur = next;
    paint(back, cur);
    sweep.classList.remove('is-running');
    sweep.style.setProperty('--x', '0px');
    sweepT = null;
  }
  sweepT = requestAnimationFrame(step);
}

function advance(to){
  if (sweepT) return;
  const next = to === undefined ? (cur + 1) % STEPS.length : to;
  if (next === cur) return;
  runSweep(next);
}

// clicking a step steers it, the cycle keeps running on its own
sweep.addEventListener('click', e => {
  const step = e.target.closest('.step');
  if (!step) return;
  const list = [...step.parentElement.children];
  advance(list.indexOf(step));
  holdUntil = performance.now() + 7000;
});

/* =============== 3. feed =============== */
const OBJ = ['STARLINK 4471','COSMOS 2251 DEB','FENGYUN 1C DEB','ONEWEB 0288','CZ-6A R/B','IRIDIUM 33 DEB','SL-16 R/B'];
const SHELL = ['540 km','780 km','610 km','1 200 km','850 km','780 km','470 km'];
const tbody = document.getElementById('tbody');

function mkRow(i){
  const tr = document.createElement('tr');
  tr.innerHTML =
    '<td>' + OBJ[i] + '</td>' +
    '<td>' + SHELL[i] + '</td>' +
    '<td class="miss"></td>' +
    '<td class="prob"></td>' +
    '<td><span class="meter">' + '<i></i>'.repeat(10) + '</span></td>';
  return tr;
}
for (let i = 0; i < 5; i++) tbody.appendChild(mkRow(i));

function setRow(tr, level){
  const miss = Math.round(140 + (1 - level) * 3200);
  const exp = 3 + Math.round((1 - level) * 4);
  const man = (1 + Math.random() * 8.9).toFixed(1);
  tr.querySelector('.miss').textContent = miss.toLocaleString('en-US') + ' m';
  tr.querySelector('.prob').textContent = man + 'e-' + exp;
  const on = Math.max(1, Math.round(level * 10));
  [...tr.querySelectorAll('.meter i')].forEach((b, k) => b.classList.toggle('on', k < on));
}

const levels = [0.86, 0.62, 0.48, 0.31, 0.18];
[...tbody.children].forEach((tr, i) => setRow(tr, levels[i]));

function tickFeed(){
  const i = Math.floor(Math.random() * tbody.children.length);
  const tr = tbody.children[i];
  levels[i] = Math.min(0.95, Math.max(0.10, levels[i] + (Math.random() - 0.5) * 0.24));
  setRow(tr, levels[i]);
  tr.classList.add('is-hit');
  setTimeout(() => tr.classList.remove('is-hit'), 620);
}

/* =============== theme =============== */
const themeBtn = document.getElementById('theme');
themeBtn.addEventListener('click', () => {
  const dark = root.getAttribute('data-theme') === 'dark';
  root.setAttribute('data-theme', dark ? 'violet' : 'dark');
  themeBtn.querySelector('.theme__t').textContent = dark ? 'dark' : 'violet';
  readColors();
});

/* =============== loop =============== */
let lastCycle = 0;

function frame(now){
  drawField(now);
  if (!reduce && now - lastCycle > 5200 && now > holdUntil && !sweepT){
    lastCycle = now;
    advance();
  }
  requestAnimationFrame(frame);
}

function boot(){
  readColors();
  sizeCanvas();
  requestAnimationFrame(frame);
  setInterval(tickFeed, 2400);
}

addEventListener('resize', sizeCanvas);
boot();
