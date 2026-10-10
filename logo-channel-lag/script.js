/* One pen runs the outline once. Three channels read the same stroke at three
   different times, added on top of each other, so the live edge is a spectrum
   and everything the slowest channel has already passed is white. At the end of
   the run the delay is taken out and the whole mark turns white at once.
   Drop an svg on the frame to run it on your own logo. */

const TAU = 6.283185307;
const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const lerp = (a,b,t) => a + (b - a) * t;
const ease = t => 1 - Math.pow(1 - t, 2.2);
const CH = [[255,0,0],[0,255,0],[0,0,255]];

/* a twelve ray burst, written out rather than drawn by hand */
function burst(){
  let d = '';
  for (let i = 0; i < 12; i++){
    const a = i * TAU / 12 - Math.PI / 2;
    const n = a + TAU / 24 * .42, m = a - TAU / 24 * .42;
    const r0 = 96, r1 = 330;
    d += 'M ' + (500 + Math.cos(m) * r0).toFixed(1) + ' ' + (500 + Math.sin(m) * r0).toFixed(1)
      +  ' L ' + (500 + Math.cos(a) * r1 + Math.cos(m) * 26).toFixed(1) + ' ' + (500 + Math.sin(a) * r1 + Math.sin(m) * 26).toFixed(1)
      +  ' L ' + (500 + Math.cos(a) * r1 + Math.cos(n) * 26).toFixed(1) + ' ' + (500 + Math.sin(a) * r1 + Math.sin(n) * 26).toFixed(1)
      +  ' L ' + (500 + Math.cos(n) * r0).toFixed(1) + ' ' + (500 + Math.sin(n) * r0).toFixed(1) + ' Z ';
  }
  return d;
}

const MARKS = [
  { name: 'SUNBURST', d: burst() },
  { name: 'SWOOSH',   d: 'M 60 300 C 150 392 320 366 520 216 C 638 128 702 96 744 92 C 706 138 646 208 470 318 C 330 406 176 412 60 300 Z' },
  { name: 'CUBE',     d: 'M 400 70 L 706 247 L 706 601 L 400 778 L 94 601 L 94 247 Z M 400 70 L 400 424 M 400 424 L 706 247 M 400 424 L 94 601' },
  { name: 'APERTURE', d: (() => {
      let d = 'M 500 180 A 320 320 0 1 1 499 180 Z';
      for (let i = 0; i < 6; i++){
        const a = i * TAU / 6;
        const b = a + TAU / 6;
        d += ' M ' + (500 + Math.cos(a) * 96).toFixed(1) + ' ' + (500 + Math.sin(a) * 96).toFixed(1)
          +  ' L ' + (500 + Math.cos(b) * 300).toFixed(1) + ' ' + (500 + Math.sin(b) * 300).toFixed(1);
      }
      return d;
    })() }
];

const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const panel = cv.parentElement;
const EL = {
  name: document.getElementById('name'), stat: document.getElementById('stat'),
  mark: document.getElementById('mark'), chan: document.getElementById('chan'),
  hint: document.getElementById('hint')
};

let W = 0, H = 0, mark = null, idx = 0, t = 0, hov = 0, mx = 0, lagK = 1;

function fit(){
  const r = panel.getBoundingClientRect();
  const w = Math.round(r.width), h = Math.round(r.height);
  if (w < 60 || h < 60) return false;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const changed = w !== W || h !== H;
  W = w; H = h;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return changed;
}

/* walk every geometry element of the svg at a fixed step, through its own CTM,
   so groups and transforms in a dropped file land where the file says they do.
   A jump longer than a few steps means one contour ended and the next began. */
const SVGNS = 'http://www.w3.org/2000/svg';

function buildFrom(root, name){
  root.setAttribute('style', 'position:absolute;left:-9999px;width:400px;height:400px;overflow:hidden');
  document.body.appendChild(root);
  const els = [...root.querySelectorAll('path,polygon,polyline,circle,ellipse,rect,line')];
  const runs = [];
  for (const el of els){
    let len = 0;
    try { len = el.getTotalLength(); } catch (e) { continue; }
    if (!(len > .5)) continue;
    const ctm = el.getCTM();
    const step = clamp(len / 900, .5, 3);
    let run = [], prev = null;
    for (let l = 0; l <= len + step; l += step){
      let p = el.getPointAtLength(Math.min(l, len));
      if (ctm) p = p.matrixTransform(ctm);
      if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) > step * 6){ if (run.length > 1) runs.push(run); run = []; }
      run.push([p.x, p.y]);
      prev = p;
      /* a contour that has come back to its own first point is finished, even
         when the next subpath starts from that same point */
      if (run.length > 10 && Math.hypot(p.x - run[0][0], p.y - run[0][1]) < step * .9 && l < len){
        runs.push(run); run = [[p.x, p.y]];
      }
    }
    if (run.length > 1) runs.push(run);
  }
  root.remove();
  if (!runs.length) return null;

  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const r of runs) for (const p of r){
    if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
  }
  if (!(x1 > x0) || !(y1 > y0)) return null;
  return { name: name, runs: runs, box: [x0, y0, x1 - x0, y1 - y0] };
}

function buildPath(name, d){
  const svg = document.createElementNS(SVGNS, 'svg');
  const pe = document.createElementNS(SVGNS, 'path');
  pe.setAttribute('d', d);
  svg.appendChild(pe);
  return buildFrom(svg, name);
}

/* fit the walk into the frame and measure it there, so lag is in frame pixels */
function place(m){
  const pad = Math.min(W, H) * .13;
  const k = Math.min((W - pad * 2) / m.box[2], (H - pad * 2) / m.box[3]);
  const ox = (W - m.box[2] * k) / 2 - m.box[0] * k;
  const oy = (H - m.box[3] * k) / 2 - m.box[1] * k;
  const pts = [];
  const fill = new Path2D();
  let cum = 0, px = 0, py = 0;
  for (const run of m.runs){
    /* only a contour that comes back to its own start is an area to fill; an
       open line stays a line */
    const a = run[0], b = run[run.length - 1];
    const shut = Math.hypot(a[0] - b[0], a[1] - b[1]) < 2.5;
    for (let i = 0; i < run.length; i++){
      const x = run[i][0] * k + ox, y = run[i][1] * k + oy;
      const brk = i === 0;
      if (!brk) cum += Math.hypot(x - px, y - py);
      pts.push({ x: x, y: y, c: cum, brk: brk });
      if (shut) i ? fill.lineTo(x, y) : fill.moveTo(x, y);
      px = x; py = y;
    }
    if (shut) fill.closePath();
  }
  m.pts = pts; m.total = cum; m.fill = fill;
  return m;
}

function rangeAt(m, len){
  const P = m.pts;
  let lo = 0, hi = P.length - 1;
  while (lo < hi){ const mid = (lo + hi) >> 1; if (P[mid].c < len) lo = mid + 1; else hi = mid; }
  return P[lo];
}

function stroke(m, a, b, w){
  const P = m.pts;
  ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  let pen = false;
  for (let i = 0; i < P.length; i++){
    const p = P[i];
    if (p.c < a || p.c > b || p.brk){ pen = false; if (p.c < a || p.c > b) continue; }
    if (!pen){ ctx.moveTo(p.x, p.y); pen = true; } else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
}

/* the programme: draw, let the channels catch up, hold, let them apart, wipe */
const T = [3.5, 1.3, 1.7, 1.0, 1.6, .5];
const TSUM = T.reduce((a, b) => a + b, 0);

function phase(t){
  let k = 0, s = t;
  while (k < T.length && s >= T[k]){ s -= T[k]; k++; }
  return [k, k < T.length ? s / T[k] : 1];
}

function frame(now){
  requestAnimationFrame(frame);
  if (fit() && mark) place(mark);
  if (!mark) return;
  const dt = Math.min(.05, (now - (frame.last || now)) / 1000);
  frame.last = now;
  t += dt;
  if (t > TSUM){ t -= TSUM; next(); }

  const [k, u] = phase(t);
  let P = 0, S = 0, spread = 1, fa = 0;
  if (k === 0){ P = ease(u); }
  else if (k === 1){ P = 1; spread = 1 - ease(u); }
  else if (k === 2){ P = 1; spread = 0; fa = clamp(u * 2.6, 0, 1); }
  else if (k === 3){ P = 1; spread = u * u; fa = clamp(1 - u * 2.2, 0, 1); }
  else if (k === 4){ P = 1; S = ease(u); }
  else { P = 1; S = 1; }

  lagK = lerp(lagK, hov ? clamp(.25 + mx / W * 2.2, .25, 2.4) : 1, 1 - Math.pow(.03, dt));
  const L = mark.total;
  const lag = L * .085 * spread * lagK;
  const wide = Math.max(2.4, Math.min(W, H) * .0125);

  ctx.fillStyle = '#0e1111'; ctx.fillRect(0, 0, W, H);

  /* the outline the pen has not reached yet, barely there */
  ctx.strokeStyle = 'rgba(233,230,217,.055)';
  stroke(mark, 0, L, wide * .5);

  if (fa > .002){
    ctx.fillStyle = 'rgba(233,230,217,' + (fa * .94).toFixed(3) + ')';
    ctx.fill(mark.fill, 'evenodd');
  }

  ctx.globalCompositeOperation = 'lighter';
  for (let c = 0; c < 3; c++){
    const end = clamp(L * P - lag * c, 0, L);
    const start = clamp(L * S - lag * c, 0, L);
    if (end <= start) continue;
    ctx.strokeStyle = 'rgb(' + CH[c].join(',') + ')';
    stroke(mark, start, end, wide);
    if (P < 1 && end > 0 && end < L){
      const p = rangeAt(mark, end);
      ctx.fillStyle = 'rgb(' + CH[c].join(',') + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, wide * .78, 0, TAU); ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  EL.stat.textContent = k === 0 ? 'drawn ' + (P * 100).toFixed(0) + '%'
    : spread < .02 ? (fa > .5 ? 'one mark, no colour left' : 'channels aligned')
    : k >= 4 ? 'wiping ' + (S * 100).toFixed(0) + '%'
    : 'lag ' + (lag | 0) + ' px';
  EL.chan.textContent = 'R + 0   G + ' + (lag / 3 | 0) + '   B + ' + (lag / 1.5 | 0) + ' px';
}

function next(){
  if (MARKS.length < 2) return;
  idx = (idx + 1) % MARKS.length;
  load(MARKS[idx]);
}

function load(m){
  const built = m.svg ? buildFrom(m.svg.cloneNode(true), m.name) : buildPath(m.name, m.d);
  if (!built) return;
  mark = place(built);
  t = 0;
  EL.name.textContent = m.name;
  EL.mark.textContent = (idx + 1 + '').padStart(2, '0') + ' / ' + (MARKS.length + '').padStart(2, '0');
}

/* an svg dropped on the frame becomes the next mark */
function fromSVG(text, name){
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== 'svg'){ EL.hint.textContent = 'that file is not an svg'; return; }
  const svg = document.importNode(root, true);
  const m = { name: name.replace(/\.svg$/i, '').toUpperCase().slice(0, 22), svg: svg };
  if (!buildFrom(svg.cloneNode(true), m.name)){ EL.hint.textContent = 'no outline found in that file'; return; }
  MARKS.push(m);
  idx = MARKS.length - 1;
  load(m);
  EL.hint.textContent = 'click the frame for the next mark';
}

panel.addEventListener('dragover', e => { e.preventDefault(); panel.classList.add('over'); });
panel.addEventListener('dragleave', () => panel.classList.remove('over'));
panel.addEventListener('drop', e => {
  e.preventDefault(); panel.classList.remove('over');
  const f = e.dataTransfer.files[0];
  if (f){ f.text().then(txt => fromSVG(txt, f.name)); return; }
  const txt = e.dataTransfer.getData('text');
  if (txt && txt.indexOf('<svg') >= 0) fromSVG(txt, 'pasted');
});

/* pasted svg source works too, which is usually faster than saving a file */
addEventListener('paste', e => {
  const txt = (e.clipboardData || {}).getData ? e.clipboardData.getData('text') : '';
  if (txt && txt.indexOf('<svg') >= 0) fromSVG(txt, 'pasted');
});
panel.addEventListener('pointermove', e => {
  const r = panel.getBoundingClientRect();
  mx = e.clientX - r.left; hov = 1;
});
panel.addEventListener('pointerleave', () => { hov = 0; });
panel.addEventListener('click', next);

fit();
load(MARKS[0]);
requestAnimationFrame(frame);
