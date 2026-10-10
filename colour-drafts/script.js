/* Six colour drafts. Each tile runs its own model on its own canvas and prints
   its own live number. Colour here is the quantity the model works on, not paint
   laid on top of it. Nothing waits for input; the cursor only bends the shape. */

const INK = [233,230,217];
const rgba = (c,a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const lerp = (a,b,t) => a + (b - a) * t;
const rnd = (a,b) => a + Math.random() * (b - a);
const TAU = 6.283185307;
const ease = t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2;

/* hue in turns, s and l in 0..1 */
function hsl(h, s, l){
  h = (h % 1 + 1) % 1;
  const c = (1 - Math.abs(2*l - 1)) * s, x = c * (1 - Math.abs((h*6) % 2 - 1)), m = l - c/2;
  let r, g, b;
  const k = h * 6 | 0;
  if (k === 0){ r=c; g=x; b=0; } else if (k === 1){ r=x; g=c; b=0; }
  else if (k === 2){ r=0; g=c; b=x; } else if (k === 3){ r=0; g=x; b=c; }
  else if (k === 4){ r=x; g=0; b=c; } else { r=c; g=0; b=x; }
  return [(r+m)*255 | 0, (g+m)*255 | 0, (b+m)*255 | 0];
}
const hex2 = v => (v < 16 ? '0' : '') + v.toString(16).toUpperCase();

/* panel plumbing: size, dpr, cursor */
function Stage(cell){
  this.cell = cell;
  this.host = cell.querySelector('.panel');
  this.cv = cell.querySelector('canvas');
  this.ctx = this.cv.getContext('2d');
  this.stat = cell.querySelector('[data-stat]');
  this.pin = cell.querySelector('[data-pin]');
  this.w = 0; this.h = 0; this.mx = -1; this.my = -1; this.hov = 0;
  this.host.addEventListener('pointermove', e => {
    const r = this.host.getBoundingClientRect();
    this.mx = e.clientX - r.left; this.my = e.clientY - r.top; this.hov = 1;
  });
  this.host.addEventListener('pointerleave', () => { this.hov = 0; });
}
Stage.prototype.fit = function(){
  const r = this.host.getBoundingClientRect();
  const w = Math.round(r.width), h = Math.round(r.height);
  if (w < 90 || h < 90 || (w === this.w && h === this.h)) return false;
  const dpr = Math.min(2, devicePixelRatio || 1);
  this.w = w; this.h = h;
  this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
  this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return true;
};

/* ================================================================
   01 SWARM
   A permutation of a fixed multiset of colours. No dot is ever assigned a
   destination: a dot and a nearby dot swap only when the pair sits closer to the
   wheel afterwards. That is the whole rule, and it is enough to grow order in
   fronts. Once the field is almost clean, a ring of noise is released from a
   random point and the run begins again.
   ================================================================ */
function Swarm(cell){ this.s = new Stage(cell); }

Swarm.prototype.build = function(){
  const s = this.s;
  const px = s.w > 720 ? 10 : 8.4;
  this.cw = Math.max(28, Math.round(s.w / px));
  this.ch = Math.max(16, Math.round(s.h / px));
  this.gx = s.w / this.cw; this.gy = s.h / this.ch;
  const n = this.n = this.cw * this.ch;

  /* the target field: hue by angle, weight by radius */
  this.ideal = new Uint8Array(n * 3);
  const cx = (this.cw - 1) / 2, cy = (this.ch - 1) / 2, mr = Math.hypot(cx, cy);
  for (let j = 0; j < this.ch; j++) for (let i = 0; i < this.cw; i++){
    const k = j * this.cw + i;
    const dx = (i - cx) / mr, dy = (j - cy) / mr;
    const r = Math.min(1, Math.hypot(dx, dy) * 1.06);
    const c = hsl(Math.atan2(dy, dx) / TAU + .5, .30 + .56 * r, .70 - .30 * r);
    this.ideal[k*3] = c[0]; this.ideal[k*3+1] = c[1]; this.ideal[k*3+2] = c[2];
  }
  this.perm = new Int32Array(n);
  for (let k = 0; k < n; k++) this.perm[k] = k;
  for (let k = n - 1; k > 0; k--){
    const j = Math.random() * (k + 1) | 0, t = this.perm[k];
    this.perm[k] = this.perm[j]; this.perm[j] = t;
  }
  this.cur = new Float32Array(n * 3);
  for (let k = 0; k < n; k++){
    const p = this.perm[k] * 3;
    this.cur[k*3] = this.ideal[p]; this.cur[k*3+1] = this.ideal[p+1]; this.cur[k*3+2] = this.ideal[p+2];
  }
  this.err = new Float32Array(n);
  this.ord = 0; this.wave = -1; this.wx = 0; this.wy = 0; this.tries = Math.round(n * 2.6);
  this.T = 46;                     // how much noise a trade is still allowed to cost
  this.OFF = [[1,0],[0,1],[2,0],[0,2],[3,0],[0,3],[2,2],[4,1],[1,4],[5,3]];
};

Swarm.prototype.cost = function(k, idx){
  const a = k * 3, b = idx * 3, I = this.ideal;
  return Math.abs(I[b] - I[a]) + Math.abs(I[b+1] - I[a+1]) + Math.abs(I[b+2] - I[a+2]);
};

Swarm.prototype.swap = function(k, m){
  const t = this.perm[k]; this.perm[k] = this.perm[m]; this.perm[m] = t;
};

Swarm.prototype.step = function(dt){
  const cw = this.cw, ch = this.ch, n = this.n;

  /* the only move in the model: a local trade that lowers the pair's cost */
  for (let t = 0; t < this.tries; t++){
    const k = Math.random() * n | 0;
    let m;
    if (Math.random() < .12){
      m = Math.random() * n | 0;               // now and then, a stranger from anywhere
    } else {
      const i = k % cw, j = (k / cw) | 0;
      const o = this.OFF[Math.random() * this.OFF.length | 0];
      const sx = Math.random() < .5 ? -1 : 1, sy = Math.random() < .5 ? -1 : 1;
      const i2 = i + o[0] * sx, j2 = j + o[1] * sy;
      if (i2 < 0 || j2 < 0 || i2 >= cw || j2 >= ch) continue;
      m = j2 * cw + i2;
    }
    const a = this.perm[k], b = this.perm[m];
    const d = this.cost(k, b) + this.cost(m, a) - this.cost(k, a) - this.cost(m, b);
    /* a bad trade is still taken while the field runs hot, which is the only way
       a dot stranded in the wrong quarter ever gets out of it */
    if (d < 0 || (this.T > .6 && Math.random() < Math.exp(-d / this.T))) this.swap(k, m);
  }

  /* the cursor stirs whatever is under it, without starting anything */
  const s = this.s;
  if (s.hov){
    const ci = clamp(s.mx / this.gx | 0, 0, cw - 1), cj = clamp(s.my / this.gy | 0, 0, ch - 1);
    for (let t = 0; t < 90; t++){
      const i2 = clamp(ci + (Math.random() * 11 | 0) - 5, 0, cw - 1);
      const j2 = clamp(cj + (Math.random() * 11 | 0) - 5, 0, ch - 1);
      this.swap(cj * cw + ci, j2 * cw + i2);
    }
  }

  /* the release: a ring of disorder crossing the field */
  if (this.wave >= 0){
    const r0 = this.wave, r1 = this.wave += Math.max(cw, ch) * .62 * dt;
    for (let k = 0; k < n; k++){
      const d = Math.hypot(k % cw - this.wx, ((k / cw) | 0) - this.wy);
      if (d >= r0 && d < r1 && Math.random() < .85) this.swap(k, Math.random() * n | 0);
    }
    if (this.wave > Math.hypot(cw, ch)) this.wave = -1;
  }

  this.T *= Math.exp(-dt * .46);

  /* what is drawn trails what is solved, so trades read as flow */
  let ok = 0;
  const f = 1 - Math.pow(.0006, dt);
  for (let k = 0; k < n; k++){
    const p = this.perm[k] * 3, q = k * 3;
    this.cur[q] = lerp(this.cur[q], this.ideal[p], f);
    this.cur[q+1] = lerp(this.cur[q+1], this.ideal[p+1], f);
    this.cur[q+2] = lerp(this.cur[q+2], this.ideal[p+2], f);
    const e = this.cost(k, this.perm[k]);
    this.err[k] = e;
    if (e < 26) ok++;
  }
  this.ord = ok / n;
  if (this.ord > .985 && this.wave < 0){
    this.wave = 0; this.wx = rnd(0, cw); this.wy = rnd(0, ch); this.T = 46;
  }
};

Swarm.prototype.draw = function(){
  const s = this.s, ctx = s.ctx;
  ctx.fillStyle = '#0f1211'; ctx.fillRect(0, 0, s.w, s.h);
  const gx = this.gx, gy = this.gy;
  for (let j = 0; j < this.ch; j++) for (let i = 0; i < this.cw; i++){
    const k = j * this.cw + i, q = k * 3;
    /* a settled dot sits fuller; an unsorted one is small and loose */
    const e = clamp(this.err[k] / 210, 0, 1);
    const pad = .05 + .30 * e;
    ctx.fillStyle = 'rgb(' + (this.cur[q]|0) + ',' + (this.cur[q+1]|0) + ',' + (this.cur[q+2]|0) + ')';
    ctx.fillRect(i * gx + gx * pad, j * gy + gy * pad, gx * (1 - pad * 2), gy * (1 - pad * 2));
  }
};

Swarm.prototype.read = function(){
  if (this.wave >= 0) return 'noise released';
  return 'sorted ' + (this.ord * 100).toFixed(1) + '%';
};

/* ================================================================
   02 SEPARATION
   The word is built once in colour, then taken apart the way a press does it:
   four coverage maps, four screens, each rotated to its own angle so the dots
   interleave instead of stacking. Nothing is drawn as a picture, every plate is
   re-screened each frame from its coverage, which is why sliding them across
   each other makes real moire and not a texture.
   ================================================================ */
const PLATES = [
  { name:'C', ang: 15 * Math.PI/180, ink:[0,158,224],  dir:[-1,-1] },
  { name:'M', ang: 75 * Math.PI/180, ink:[231,0,124],  dir:[ 1,-1] },
  { name:'Y', ang: 0,               ink:[255,226,0],   dir:[-1, 1] },
  { name:'K', ang: 45 * Math.PI/180, ink:[32,28,32],   dir:[ 1, 1] }
];

function Sep(cell){ this.s = new Stage(cell); this.t = 0; }

Sep.prototype.build = function(){
  const s = this.s;
  const SW = 560, SH = 150;
  const o = document.createElement('canvas');
  o.width = SW; o.height = SH;
  const c = o.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, SW, SH);
  const g = c.createLinearGradient(0, 0, SW, SH);
  for (let i = 0; i <= 6; i++){
    const col = hsl(.02 + i * .13, .92, .52);
    g.addColorStop(i / 6, 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')');
  }
  c.fillStyle = g;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const WORD = 'HALFTONE';
  c.letterSpacing = '1px';
  let fs = 116;
  do { c.font = '800 ' + fs-- + 'px ui-sans-serif,-apple-system,"Helvetica Neue",Arial,sans-serif'; }
  while (c.measureText(WORD).width > SW * .94 && fs > 20);
  c.fillText(WORD, SW / 2, SH / 2 + 4);

  const d = c.getImageData(0, 0, SW, SH).data;
  this.SW = SW; this.SH = SH;
  this.cov = [0,1,2,3].map(() => new Float32Array(SW * SH));
  this.sum = [0,0,0,0];
  for (let i = 0; i < SW * SH; i++){
    let cc = 1 - d[i*4] / 255, mm = 1 - d[i*4+1] / 255, yy = 1 - d[i*4+2] / 255;
    const kk = Math.min(cc, mm, yy);
    if (kk < .999){ cc = (cc - kk) / (1 - kk); mm = (mm - kk) / (1 - kk); yy = (yy - kk) / (1 - kk); }
    else { cc = mm = yy = 0; }
    this.cov[0][i] = cc; this.cov[1][i] = mm; this.cov[2][i] = yy; this.cov[3][i] = kk;
    this.sum[0] += cc; this.sum[1] += mm; this.sum[2] += yy; this.sum[3] += kk;
  }
  for (let p = 0; p < 4; p++) this.sum[p] = this.sum[p] / (SW * SH) * 100;

  this.ww = s.w * .60; this.wh = this.ww * SH / SW;
  if (this.wh > s.h * .42){ this.wh = s.h * .42; this.ww = this.wh * SW / SH; }
  this.px = clamp(this.ww / 84, 4.4, 7);   // screen ruling, in panel pixels
  this.paper = { x: s.w * .06, y: s.h * .08, w: s.w * .88, h: s.h * .84 };
  this.mis = 0;
};

/* one plate, screened at its own angle over its own offset */
Sep.prototype.plate = function(p, ox, oy, kf){
  const s = this.s, ctx = s.ctx, P = PLATES[p], cov = this.cov[p];
  const cx = s.w / 2 + ox, cy = s.h / 2 + oy;
  const d = this.px, ca = Math.cos(P.ang), sa = Math.sin(P.ang);
  const ww = this.ww * kf, wh = this.wh * kf;
  const R = Math.hypot(ww, wh) / 2 / d + 2;
  ctx.beginPath();
  for (let v = -R; v <= R; v++) for (let u = -R; u <= R; u++){
    const x = cx + (u * ca - v * sa) * d, y = cy + (u * sa + v * ca) * d;
    const sx = (x - cx) / ww * this.SW + this.SW / 2;
    const sy = (y - cy) / wh * this.SH + this.SH / 2;
    if (sx < 0 || sy < 0 || sx >= this.SW || sy >= this.SH) continue;
    const c = cov[(sy | 0) * this.SW + (sx | 0)];
    if (c < .04) continue;
    const r = d * .74 * Math.sqrt(c);
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fillStyle = 'rgb(' + P.ink.join(',') + ')';
  ctx.fill();
};

Sep.prototype.step = function(dt){
  this.t += dt;
  const T = 9, t = this.t % T;
  /* held, apart, held, back together, then the register settles */
  this.spread = t < 1.3 ? 0
    : t < 3.1 ? ease((t - 1.3) / 1.8)
    : t < 4.8 ? 1
    : t < 6.7 ? 1 - ease((t - 4.8) / 1.9)
    : 0;
  const settle = t > 6.7 ? Math.exp(-(t - 6.7) * 1.1) * Math.cos((t - 6.7) * 9) : 0;
  const s = this.s;
  const drag = s.hov ? clamp((s.mx - s.w / 2) / s.w, -.5, .5) : 0;
  this.mis = settle * 5 + drag * 26;
};

Sep.prototype.draw = function(){
  const s = this.s, ctx = s.ctx, pa = this.paper;
  ctx.fillStyle = '#0f1211'; ctx.fillRect(0, 0, s.w, s.h);
  ctx.save();
  ctx.beginPath(); ctx.rect(pa.x, pa.y, pa.w, pa.h); ctx.clip();
  ctx.fillStyle = '#efece1'; ctx.fillRect(pa.x, pa.y, pa.w, pa.h);
  ctx.globalCompositeOperation = 'multiply';
  const sp = this.spread, kf = 1 - .46 * sp;
  const OX = s.w * .225 * sp, OY = s.h * .215 * sp;
  for (let p = 0; p < 4; p++){
    const D = PLATES[p].dir;
    this.plate(p, D[0] * OX + (p - 1.5) * this.mis, D[1] * OY + (p - 1.5) * this.mis * .35, kf);
  }
  /* plate letters, only while they stand apart, in ink on the sheet */
  if (sp > .2){
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = (sp - .2) / .8;
    ctx.font = '10px ui-monospace,Menlo,monospace';
    ctx.fillStyle = 'rgba(30,28,26,.62)';
    ctx.textAlign = 'center';
    for (let p = 0; p < 4; p++){
      const D = PLATES[p].dir;
      ctx.fillText(PLATES[p].name + '   ' + Math.round(PLATES[p].ang * 180 / Math.PI) + '\u00b0   ' + this.sum[p].toFixed(0) + '%',
        s.w / 2 + D[0] * OX, s.h / 2 + D[1] * OY + this.wh * kf * .70);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
};

Sep.prototype.read = function(){
  return PLATES.map((p, i) => p.name + ' ' + this.sum[i].toFixed(0)).join('  ');
};

/* ================================================================
   03 LAG
   One shape, one path, three clocks. The buffer keeps where the shape has been;
   red reads it at zero, green further back, blue further still, and the three
   are added rather than blended, so every overlap climbs toward white. Speed is
   on a programme with a full stop in it: that stop is where the spectrum folds
   back into a single dot.
   ================================================================ */
function Lag(cell){ this.s = new Stage(cell); this.t = 0; }

Lag.prototype.build = function(){
  const s = this.s;
  this.N = 260;
  this.bx = new Float32Array(this.N); this.by = new Float32Array(this.N);
  this.head = 0; this.fill = 0;
  this.phi = 0; this.v = 0;
  this.A = s.w * .30; this.B = s.h * .30;
  this.lag = 1;
};

Lag.prototype.at = function(back){
  const i = ((this.head - 1 - back) % this.N + this.N) % this.N;
  return i;
};

Lag.prototype.step = function(dt){
  this.t += dt;
  const T = 7.4, t = this.t % T;
  /* run up, hold, run down, stand still */
  const prof = t < 1.1 ? ease(t / 1.1)
    : t < 3.6 ? 1
    : t < 4.8 ? 1 - ease((t - 3.6) / 1.2)
    : 0;
  this.v = prof;
  this.phi += prof * 1.35 * dt;
  const s = this.s;
  this.lag = lerp(this.lag, s.hov ? clamp(.35 + s.mx / s.w * 2, .35, 2.4) : 1, 1 - Math.pow(.02, dt));

  const x = s.w / 2 + Math.sin(this.phi * 2) * this.A;
  const y = s.h / 2 + Math.sin(this.phi * 3 + .7) * this.B;
  this.bx[this.head] = x; this.by[this.head] = y;
  this.head = (this.head + 1) % this.N;
  if (this.fill < this.N) this.fill++;
};

Lag.prototype.draw = function(){
  const s = this.s, ctx = s.ctx;
  ctx.fillStyle = '#0c0e0e'; ctx.fillRect(0, 0, s.w, s.h);

  /* the path itself, so the delay reads against something fixed */
  ctx.strokeStyle = rgba(INK, .07); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 260; i++){
    const p = i / 260 * TAU;
    const x = s.w / 2 + Math.sin(p * 2) * this.A, y = s.h / 2 + Math.sin(p * 3 + .7) * this.B;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();

  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  const CH = [[255,38,38],[38,255,96],[64,110,255]];
  const L = 44;
  const heads = [];
  for (let c = 0; c < 3; c++){
    const off = Math.round(c * 9 * this.lag);
    ctx.strokeStyle = 'rgb(' + CH[c][0] + ',' + CH[c][1] + ',' + CH[c][2] + ')';
    for (let i = L; i > 0; i--){
      const a = i + off, b = i - 1 + off;
      if (a >= this.fill) continue;
      const k = 1 - i / L;
      ctx.globalAlpha = .09 + .62 * k * k;
      ctx.lineWidth = 1.4 + 9 * k * k;
      const p = this.at(a), q = this.at(b);
      ctx.beginPath(); ctx.moveTo(this.bx[p], this.by[p]); ctx.lineTo(this.bx[q], this.by[q]); ctx.stroke();
    }
    const h = this.at(off);
    heads.push([this.bx[h], this.by[h]]);
    ctx.globalAlpha = .92;
    ctx.fillStyle = 'rgb(' + CH[c][0] + ',' + CH[c][1] + ',' + CH[c][2] + ')';
    ctx.beginPath(); ctx.arc(this.bx[h], this.by[h], 7.5, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  this.split = Math.hypot(heads[0][0] - heads[2][0], heads[0][1] - heads[2][1]);

  /* the three clocks, written out */
  ctx.font = '10px ui-monospace,Menlo,monospace';
  ctx.textAlign = 'left';
  for (let c = 0; c < 3; c++){
    ctx.fillStyle = rgba(CH[c], .85);
    ctx.fillText((c * 9 * this.lag * 16.7 | 0) + ' ms', 14, s.h - 34 + c * 12);
  }
};

Lag.prototype.read = function(){
  return this.v < .02 ? 'caught up' : 'split ' + (this.split | 0) + ' px';
};

/* ================================================================
   04 CONTRAST
   Two swatches are written once and never touched again. Everything that moves
   is behind them: stripe lightness and stripe hue run as a slow wave, so one
   swatch keeps landing on a dark cold field while the other lands on a light
   warm one. The readout below is sampled from the live canvas, not typed in, so
   the flat line is a measurement.
   ================================================================ */
function Bez(cell){ this.s = new Stage(cell); this.t = 0; }

Bez.prototype.build = function(){
  const s = this.s;
  this.Q = [138, 143, 122];              // the held value
  this.st = [];
  let x = 0;
  while (x < s.w){
    const w = rnd(s.w * .018, s.w * .055);
    this.st.push({ x: x, w: w });
    x += w;
  }
  this.sz = Math.min(s.h * .30, s.w * .13);
  this.ax = s.w * .27; this.bx = s.w * .73; this.sy = s.h * .40;
  this.held = 0;
};

Bez.prototype.step = function(dt){ this.t += dt; this.held += dt; };

Bez.prototype.draw = function(){
  const s = this.s, ctx = s.ctx, t = this.t;
  for (const b of this.st){
    const u = (b.x + b.w / 2) / s.w;
    const w = Math.sin(u * 4.1 - t * .62);
    const l = .50 + .42 * w;
    const c = hsl(.58 + .30 * w + t * .013, .40 + .26 * Math.abs(w), l);
    ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    ctx.fillRect(b.x, 0, b.w + 1, s.h);
  }
  const q = 'rgb(' + this.Q[0] + ',' + this.Q[1] + ',' + this.Q[2] + ')';
  const z = this.sz;
  ctx.fillStyle = q;
  ctx.fillRect(this.ax - z / 2, this.sy - z / 2, z, z);
  ctx.fillRect(this.bx - z / 2, this.sy - z / 2, z, z);
  /* a third one rides the cursor across the field */
  if (s.hov) ctx.fillRect(s.mx - z / 2, s.my - z / 2, z, z);

  /* the probe: read back from the canvas, both swatches at once */
  const dpr = Math.min(2, devicePixelRatio || 1);
  const pick = x => {
    const d = ctx.getImageData(Math.round(x * dpr), Math.round(this.sy * dpr), 1, 1).data;
    return '#' + hex2(d[0]) + hex2(d[1]) + hex2(d[2]);
  };
  this.ha = pick(this.ax); this.hb = pick(this.bx);

  const y = s.h - 26;
  ctx.strokeStyle = rgba(INK, .30); ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(this.ax, this.sy + z / 2); ctx.lineTo(this.ax, y - 12);
  ctx.moveTo(this.bx, this.sy + z / 2); ctx.lineTo(this.bx, y - 12);
  ctx.stroke();
  ctx.font = '11px ui-monospace,Menlo,monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0d100f';
  ctx.fillRect(this.ax - 38, y - 11, 76, 20);
  ctx.fillRect(this.bx - 38, y - 11, 76, 20);
  ctx.fillStyle = rgba(INK, .92);
  ctx.fillText(this.ha, this.ax, y + 3);
  ctx.fillText(this.hb, this.bx, y + 3);
};

Bez.prototype.read = function(){
  return this.ha === this.hb ? 'identical for ' + this.held.toFixed(1) + ' s' : 'drift';
};

/* ================================================================
   05 WINDOWS
   Three discs of process ink, multiplied onto paper, so every pair makes the
   colour those two inks make and the centre goes near black. The word is cut
   into strips and one strip in three is knocked out of each disc. A disc alone
   shows a comb of nonsense; only when all three cover the same place do all the
   strips open at once and the word exists.
   ================================================================ */
function Win(cell){ this.s = new Stage(cell); this.t = 0; }

Win.prototype.build = function(){
  const s = this.s;
  this.R = Math.min(s.w * .20, s.h * .34);
  this.cx = s.w / 2; this.cy = s.h / 2;
  this.orbit = Math.min(s.w * .17, s.h * .28);
  this.inks = [[0,158,224],[231,0,124],[255,226,0]];
  this.lay = this.inks.map(() => {
    const c = document.createElement('canvas');
    c.width = s.cv.width; c.height = s.cv.height;
    const x = c.getContext('2d');
    x.setTransform(s.cv.width / s.w, 0, 0, s.cv.height / s.h, 0, 0);
    return { cv: c, ctx: x };
  });
  /* the word, once, as a mask the strips are taken from */
  const m = document.createElement('canvas');
  m.width = Math.round(s.w); m.height = Math.round(s.h);
  const mc = m.getContext('2d');
  mc.textAlign = 'center'; mc.textBaseline = 'middle';
  mc.font = '800 ' + Math.round(Math.min(s.w * .155, s.h * .30)) + 'px ui-sans-serif,-apple-system,"Helvetica Neue",Arial,sans-serif';
  mc.letterSpacing = Math.round(s.w * .012) + 'px';
  mc.fillStyle = '#000';
  mc.fillText('ALIGN', s.w / 2, s.h / 2);
  this.mask = m;
  this.strip = Math.max(3, Math.round(s.w / 125));
  this.pos = [[0,0],[0,0],[0,0]];
};

Win.prototype.step = function(dt){
  this.t += dt;
  const T = 8.6, u = (this.t % T) / T;
  /* all three run on the same clock, so they meet once a cycle and only once */
  const gate = Math.pow(Math.sin(u * Math.PI), 6);
  const open = 1 - gate;
  const s = this.s;
  for (let i = 0; i < 3; i++){
    const a = u * TAU * (1 + i * .0) + i * TAU / 3;
    let x = this.cx + Math.cos(a) * this.orbit * open;
    let y = this.cy + Math.sin(a) * this.orbit * open * .72;
    if (s.hov){
      const d = Math.hypot(s.mx - x, s.my - y);
      const p = clamp(1 - d / (this.R * 1.6), 0, 1) * .55;
      x = lerp(x, s.mx, p); y = lerp(y, s.my, p);
    }
    this.pos[i][0] = x; this.pos[i][1] = y;
  }
  this.open = open;
};

Win.prototype.draw = function(){
  const s = this.s, ctx = s.ctx;
  ctx.fillStyle = '#0f1211'; ctx.fillRect(0, 0, s.w, s.h);
  const pa = { x: s.w * .05, y: s.h * .07, w: s.w * .90, h: s.h * .86 };
  ctx.save();
  ctx.beginPath(); ctx.rect(pa.x, pa.y, pa.w, pa.h); ctx.clip();
  ctx.fillStyle = '#efece1'; ctx.fillRect(pa.x, pa.y, pa.w, pa.h);

  for (let i = 0; i < 3; i++){
    const L = this.lay[i], x = L.ctx;
    x.setTransform(s.cv.width / s.w, 0, 0, s.cv.height / s.h, 0, 0);
    x.clearRect(0, 0, s.w, s.h);
    x.fillStyle = 'rgb(' + this.inks[i].join(',') + ')';
    x.beginPath(); x.arc(this.pos[i][0], this.pos[i][1], this.R, 0, TAU); x.fill();
    /* knock this disc's strips out of it, in page coordinates */
    x.globalCompositeOperation = 'destination-out';
    for (let sx = i * this.strip; sx < s.w; sx += this.strip * 3){
      x.drawImage(this.mask, sx, 0, this.strip, s.h, sx, 0, this.strip, s.h);
    }
    x.globalCompositeOperation = 'source-over';
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(L.cv, 0, 0, s.w, s.h);
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
};

Win.prototype.read = function(){
  const d01 = Math.hypot(this.pos[0][0]-this.pos[1][0], this.pos[0][1]-this.pos[1][1]);
  const d02 = Math.hypot(this.pos[0][0]-this.pos[2][0], this.pos[0][1]-this.pos[2][1]);
  const d12 = Math.hypot(this.pos[1][0]-this.pos[2][0], this.pos[1][1]-this.pos[2][1]);
  const o = clamp(1 - Math.max(d01, d02, d12) / (this.R * 2), 0, 1);
  return o > .93 ? 'readable' : 'overlap ' + (o * 100).toFixed(0) + '%';
};

/* ================================================================
   06 GAMUT
   The plane is lightness against chroma at one hue, in OKLab, and the wall in it
   is real: for every row the largest chroma that still lands inside sRGB is
   found by bisection. The request keeps travelling past the wall, the colour
   cannot, and the leftover is drawn as the rubber band between the two plus the
   scar that builds up where requests have been hitting.
   ================================================================ */
function oklab(L, a, b){
  const l = Math.pow(L + .3963377774*a + .2158037573*b, 3);
  const m = Math.pow(L - .1055613458*a - .0638541728*b, 3);
  const s = Math.pow(L - .0894841775*a - 1.2914855480*b, 3);
  return [
    4.0767416621*l - 3.3077115913*m + .2309699292*s,
   -1.2684380046*l + 2.6097574011*m - .3413193965*s,
   -.0041960863*l - .7034186147*m + 1.7076147010*s
  ];
}
const gam = v => v <= .0031308 ? 12.92*v : 1.055*Math.pow(v, 1/2.4) - .055;

function Gam(cell){ this.s = new Stage(cell); this.t = 0; }

Gam.prototype.inside = function(L, C, h){
  const r = oklab(L, C * Math.cos(h), C * Math.sin(h));
  return r[0] >= -.001 && r[0] <= 1.001 && r[1] >= -.001 && r[1] <= 1.001 && r[2] >= -.001 && r[2] <= 1.001;
};
Gam.prototype.edge = function(L, h){
  let lo = 0, hi = .45;
  for (let i = 0; i < 20; i++){ const m = (lo + hi) / 2; if (this.inside(L, m, h)) lo = m; else hi = m; }
  return lo;
};

Gam.prototype.build = function(){
  const s = this.s;
  this.CM = .34;
  this.pl = { x: s.w * .10, y: s.h * .12, w: s.w * .62, h: s.h * .76 };
  this.bw = Math.max(90, Math.round(this.pl.w / 1.7));
  this.bh = Math.max(60, Math.round(this.pl.h / 1.7));
  this.img = s.ctx.createImageData(this.bw, this.bh);
  this.bg = document.createElement('canvas');
  this.bg.width = this.bw; this.bg.height = this.bh;
  this.bgx = this.bg.getContext('2d');
  this.h = 0; this.drawn = -9;
  this.L = .72; this.C = .10; this.tC = .10;
  this.scar = new Float32Array(64);
  this.phase = 0;
};

Gam.prototype.bake = function(){
  const d = this.img.data;
  for (let j = 0; j < this.bh; j++){
    const L = 1 - (j + .5) / this.bh;
    for (let i = 0; i < this.bw; i++){
      const C = (i + .5) / this.bw * this.CM;
      const c = oklab(L, C * Math.cos(this.h), C * Math.sin(this.h));
      const k = (j * this.bw + i) * 4;
      const out = c[0] < 0 || c[0] > 1 || c[1] < 0 || c[1] > 1 || c[2] < 0 || c[2] > 1;
      if (out){
        /* outside is not painted, only ruled, so the wall is a fact not a fade */
        const v = ((i + j) % 6 < 3) ? 20 : 15;
        d[k] = v; d[k+1] = v + 3; d[k+2] = v + 2; d[k+3] = 255;
      } else {
        d[k] = clamp(gam(c[0]), 0, 1) * 255; d[k+1] = clamp(gam(c[1]), 0, 1) * 255;
        d[k+2] = clamp(gam(c[2]), 0, 1) * 255; d[k+3] = 255;
      }
    }
  }
  this.bgx.putImageData(this.img, 0, 0);
  this.drawn = this.h;
};

Gam.prototype.step = function(dt){
  this.t += dt; this.phase += dt;
  this.h += dt * .22;
  if (Math.abs(this.h - this.drawn) > .02) this.bake();
  const s = this.s;
  /* the request travels on its own, out past the wall and back */
  const u = this.phase * .55;
  this.L = .62 + .22 * Math.sin(u * .9);
  this.tC = clamp(.18 + .19 * Math.sin(u), .012, this.CM * .98);
  if (s.hov){
    this.L = clamp(1 - (s.my - this.pl.y) / this.pl.h, .04, .99);
    this.tC = clamp((s.mx - this.pl.x) / this.pl.w * this.CM, .012, this.CM * .98);
  }
  this.mx = this.edge(this.L, this.drawn);
  this.C = Math.min(this.tC, this.mx);
  const row = clamp(this.L * 63 | 0, 0, 63);
  if (this.tC > this.mx) this.scar[row] = Math.min(1, this.scar[row] + dt * 2.4);
  for (let i = 0; i < 64; i++) this.scar[i] *= 1 - .22 * dt;
};

Gam.prototype.draw = function(){
  const s = this.s, ctx = s.ctx, p = this.pl, H = this.drawn;
  ctx.fillStyle = '#0c0e0e'; ctx.fillRect(0, 0, s.w, s.h);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(this.bg, p.x, p.y, p.w, p.h);

  const X = C => p.x + C / this.CM * p.w, Y = L => p.y + (1 - L) * p.h;

  /* the wall, and the marks left where requests hit it */
  ctx.beginPath();
  for (let j = 0; j <= 64; j++){
    const L = j / 64, x = X(this.edge(L, H)), y = Y(L);
    j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.strokeStyle = rgba(INK, .42); ctx.lineWidth = 1; ctx.stroke();
  for (let i = 0; i < 64; i++){
    if (this.scar[i] < .02) continue;
    const L = i / 63;
    ctx.strokeStyle = rgba([255,91,52], this.scar[i] * .85);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(X(this.edge(L, H)), Y(L) - p.h / 64);
    ctx.lineTo(X(this.edge(L, H)), Y(L) + p.h / 64);
    ctx.stroke();
  }

  const ax = X(this.C), ay = Y(this.L), bx = X(this.tC), by = ay;
  if (this.tC > this.C + .002){
    ctx.strokeStyle = rgba([255,91,52], .75);
    ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(bx, by, 6.5, 0, TAU); ctx.stroke();
  }
  const c = oklab(this.L, this.C * Math.cos(H), this.C * Math.sin(H));
  const col = [clamp(gam(c[0]),0,1)*255|0, clamp(gam(c[1]),0,1)*255|0, clamp(gam(c[2]),0,1)*255|0];
  ctx.fillStyle = 'rgb(' + col.join(',') + ')';
  ctx.beginPath(); ctx.arc(ax, ay, 11, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(INK, .55); ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();

  /* the same colour as the screen can actually send it */
  const bx0 = p.x + p.w + s.w * .045;
  ctx.fillStyle = 'rgb(' + col.join(',') + ')';
  ctx.fillRect(bx0, p.y, s.w * .17, p.h * .42);
  ctx.font = '10px ui-monospace,Menlo,monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = rgba(INK, .62);
  ctx.fillText('#' + hex2(col[0]) + hex2(col[1]) + hex2(col[2]), bx0, p.y + p.h * .42 + 16);
  ctx.fillText('L ' + this.L.toFixed(2), bx0, p.y + p.h * .42 + 32);
  ctx.fillText('h ' + ((H * 180 / Math.PI) % 360 | 0) + '°', bx0, p.y + p.h * .42 + 48);
  ctx.fillStyle = rgba(INK, .34);
  ctx.fillText('chroma', p.x, p.y + p.h + 16);
};

Gam.prototype.read = function(){
  const d = this.tC - this.C;
  return d > .002 ? 'clipped ' + d.toFixed(3) : 'inside';
};

/* ================================================================ */
const MAKE = { swarm: Swarm, sep: Sep, lag: Lag, bez: Bez, win: Win, gam: Gam };
const STEP = 1 / 60;

const pieces = [...document.querySelectorAll('.cell')].map(cell => {
  const p = new MAKE[cell.dataset.piece](cell);
  p.acc = 0; p.rd = 0;
  new ResizeObserver(() => { if (p.s.fit()) p.build(); }).observe(p.s.host);
  if (p.s.fit()) p.build();
  return p;
});

let last = 0;
function frame(now){
  const dt = Math.min(.05, (now - last) / 1000) || .016;
  last = now;
  for (const p of pieces){
    if (p.off) continue;
    if (!p.s.w){ if (p.s.fit()) p.build(); else continue; }
    p.acc += dt;
    let k = 0;
    while (p.acc >= STEP && k < 5){ p.step(STEP); p.acc -= STEP; k++; }
    p.draw();
    p.rd -= dt;
    if (p.rd <= 0){ p.rd = .22; p.s.stat.textContent = p.read(); }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* solo: a click opens the tile, esc closes it */
const grid = document.getElementById('grid');
grid.addEventListener('click', e => {
  const cell = e.target.closest('.cell');
  if (!cell) return;
  if (grid.classList.contains('solo')){
    grid.classList.remove('solo');
    cell.classList.remove('is-solo');
  } else {
    grid.classList.add('solo');
    cell.classList.add('is-solo');
  }
  const solo = grid.classList.contains('solo');
  for (const p of pieces){
    p.off = solo && p.s.cell !== cell;
    p.s.fit() && p.build();
  }
});
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  grid.classList.remove('solo');
  document.querySelectorAll('.cell.is-solo').forEach(c => c.classList.remove('is-solo'));
  for (const p of pieces) p.off = false;
});
