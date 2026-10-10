/* Four drafts. Each one runs its own model on its own canvas and prints its own
   number under the frame. All they share is the palette, the fact that nothing waits
   for input, and that the cursor only bends the shape. */

const INK = [233,230,217], HOT = [255,91,52];
const rgba = (c,a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
const mix = (a,b,t) => [a[0]+(b[0]-a[0])*t | 0, a[1]+(b[1]-a[1])*t | 0, a[2]+(b[2]-a[2])*t | 0];
const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const rnd = (a,b) => a + Math.random() * (b - a);
const TAU = 6.283185307;

/* panel plumbing: size, dpr, cursor */
function Stage(cell){
  this.cell = cell;
  this.host = cell.querySelector('.panel');
  this.cv = cell.querySelector('canvas');
  this.ctx = this.cv.getContext('2d');
  this.stat = cell.querySelector('[data-stat]');
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
   01 POLYGON
   Ten identical vortices sit on a ring. Everything is solved in the frame that
   turns with them, where the flow is steady and its streamlines are no longer
   circles. Dye fills exactly one of those streamlines, so the edge holds instead
   of smearing. The picture is rotated back at draw time.
   ================================================================ */
function Poly(cell){ this.s = new Stage(cell); this.t = 0; }

Poly.prototype.build = function(){
  const s = this.s;
  this.cx = s.w / 2; this.cy = s.h / 2;
  this.a = Math.min(s.w, s.h) * 0.40;
  this.N = 10;
  this.OM = 0.46;
  this.G = 2 * this.OM * this.a * this.a / (this.N - 1);
  this.soft = this.a * this.a * 0.0035;
  this.vx = new Float32Array(this.N); this.vy = new Float32Array(this.N);
  for (let k = 0; k < this.N; k++){
    const th = k * TAU / this.N;
    this.vx[k] = this.cx + Math.cos(th) * this.a;
    this.vy[k] = this.cy + Math.sin(th) * this.a;
  }
  this.wide = Math.PI / this.N;   // ray halfway between two vortices, the edge reaches furthest there
  this.L = 96; this.NC = 5;
  this.levs = [];
  for (let c = 0; c < this.NC; c++) this.levs.push(new Float32Array(this.L));
  this.lev = this.levs[this.NC - 1];
  this.rt = this.a * 0.6; this.level();

  const n = this.n = clamp(Math.round(s.w * s.h / 30), 700, 9000);
  this.x = new Float32Array(n); this.y = new Float32Array(n);
  this.sz = new Float32Array(n); this.age = new Float32Array(n); this.life = new Float32Array(n);
  for (let i = 0; i < n; i++){ this.seed(i); this.age[i] = Math.random() * this.life[i]; }

  this.B = 144;
  this.bin = new Float32Array(this.B);
  this.limb = new Float32Array(this.B);
  this.rot = 0; this.mode = 0; this.amp = 0; this.have = 0; this.lt = 0;
};

// streamfunction in the co-rotating frame: vortices plus the subtracted solid rotation
Poly.prototype.psi = function(x, y){
  let p = 0;
  for (let k = 0; k < this.N; k++){
    const ex = x - this.vx[k], ey = y - this.vy[k];
    p -= 0.5 * this.G * Math.log(ex * ex + ey * ey + this.soft);
  }
  const dx = x - this.cx, dy = y - this.cy;
  return p + 0.5 * this.OM * (dx * dx + dy * dy);
};

// several nested streamlines at once: each ray is walked until the
// streamfunction hits its threshold. Circles inside, faceted further out.
Poly.prototype.level = function(){
  const th0 = this.wide, hi0 = this.a * 0.999;
  for (let c = 0; c < this.NC; c++){
    const rt = this.rt * (0.32 + 0.68 * (c + 1) / this.NC);
    const C = this.psi(this.cx + Math.cos(th0) * rt, this.cy + Math.sin(th0) * rt);
    if (c === this.NC - 1) this.C = C;
    const out = this.levs[c];
    for (let i = 0; i < this.L; i++){
      const th = i / this.L * TAU, cs = Math.cos(th), sn = Math.sin(th);
      let lo = 0, hi = hi0;
      for (let it = 0; it < 18; it++){
        const m = (lo + hi) / 2;
        if (this.psi(this.cx + cs * m, this.cy + sn * m) < C) lo = m; else hi = m;
      }
      out[i] = lo;
    }
  }
};

Poly.prototype.edgeAt = function(dx, dy){
  let u = (Math.atan2(dy, dx) / TAU + 1) % 1 * this.L;
  const i = u | 0, fr = u - i;
  const A = this.lev[i], Bv = this.lev[(i + 1) % this.L];
  return A + (Bv - A) * fr;
};

Poly.prototype.seed = function(i){
  const th = Math.random() * TAU;
  const cs = Math.cos(th), sn = Math.sin(th);
  const r = this.edgeAt(cs, sn) * Math.sqrt(Math.random());
  this.x[i] = this.cx + cs * r; this.y[i] = this.cy + sn * r;
  this.sz[i] = rnd(.8, 1.32);
  this.age[i] = 0; this.life[i] = rnd(2.4, 6.4);
};

Poly.prototype.step = function(dt){
  this.t += dt;
  this.rot += this.OM * dt;
  // the edge pulls into a circle, then creeps out to the vortices where the facets live
  this.rt = this.a * (0.42 + 0.485 * (0.5 - 0.5 * Math.cos(this.t * 0.17)));
  this.lt -= dt;
  if (this.lt <= 0){ this.lt = 0.18; this.level(); }

  const { N, G, cx, cy, vx, vy, soft, OM } = this;
  const s = this.s;
  let mfx = 0, mfy = 0, dent = 0;
  if (s.hov){
    const ca = Math.cos(-this.rot), sa = Math.sin(-this.rot);
    const dx = s.mx - cx, dy = s.my - cy;
    mfx = cx + dx * ca - dy * sa; mfy = cy + dx * sa + dy * ca;
    dent = G * 0.42;
  }

  for (let i = 0; i < this.n; i++){
    let x = this.x[i], y = this.y[i];
    let ux = 0, uy = 0;
    for (let k = 0; k < N; k++){
      const ex = x - vx[k], ey = y - vy[k];
      const f = G / (ex * ex + ey * ey + soft);
      ux -= ey * f; uy += ex * f;
    }
    const dx = x - cx, dy = y - cy;
    ux += OM * dy; uy -= OM * dx;
    if (dent){
      const ex = x - mfx, ey = y - mfy;
      const f = -dent / (ex * ex + ey * ey + soft * 4);
      ux -= ey * f; uy += ex * f;
    }
    x += ux * dt; y += uy * dt;
    let ndx = x - cx, ndy = y - cy;
    const nd2 = ndx * ndx + ndy * ndy, e = this.edgeAt(ndx, ndy);
    // near the edge a straight step overshoots, so put the point back on the streamline
    if (!dent && nd2 > e * e){
      const k = e * 0.997 / Math.sqrt(nd2);
      x = cx + ndx * k; y = cy + ndy * k;
    }
    this.x[i] = x; this.y[i] = y;
    this.age[i] += dt;
    // dye is topped up constantly, which is how the patch keeps up with the threshold
    if (this.age[i] > this.life[i]) this.seed(i);
  }
};

Poly.prototype.read = function(){
  const B = this.B, bin = this.bin;
  bin.fill(0);
  for (let i = 0; i < this.n; i++){
    const dx = this.x[i] - this.cx, dy = this.y[i] - this.cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    let b = ((Math.atan2(dy, dx) + Math.PI) / TAU * B) | 0;
    if (b < 0) b = 0; if (b >= B) b = B - 1;
    if (r > bin[b]) bin[b] = r;
  }
  let mean = 0, used = 0;
  for (let b = 0; b < B; b++) if (bin[b] > 0){ mean += bin[b]; used++; }
  if (used < B * 0.8){ this.have = 0; return 'settling'; }
  mean /= used;
  for (let p = 0; p < 3; p++){
    const c = bin.slice();
    for (let b = 0; b < B; b++) bin[b] = (c[(b + B - 1) % B] + 2 * c[b] + c[(b + 1) % B]) / 4;
  }
  this.limb.set(bin); this.have = 1;

  let best = 0, bestA = 0;
  for (let m = 4; m <= 14; m++){
    let re = 0, im = 0;
    for (let b = 0; b < B; b++){
      const th = (b + .5) / B * TAU, d = bin[b] - mean;
      re += d * Math.cos(m * th); im += d * Math.sin(m * th);
    }
    const A = 2 * Math.sqrt(re * re + im * im) / B;
    if (A > bestA){ bestA = A; best = m; }
  }
  const pct = bestA / mean * 100;
  this.mode = best; this.amp = pct;
  this.s.cell.classList.toggle('lock', pct > 3 && best === this.N);
  if (pct < 1.2) return 'round · no mode';
  return 'mode ' + best + ' · ' + pct.toFixed(1) + '%';
};

Poly.prototype.draw = function(){
  const ctx = this.s.ctx, w = this.s.w, h = this.s.h;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(this.cx, this.cy); ctx.rotate(this.rot); ctx.translate(-this.cx, -this.cy);

  ctx.strokeStyle = rgba(INK, .07); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(this.cx, this.cy, this.a, 0, TAU); ctx.stroke();
  ctx.fillStyle = rgba(INK, .34);
  ctx.beginPath();
  for (let k = 0; k < this.N; k++){
    ctx.moveTo(this.vx[k] + 2, this.vy[k]);
    ctx.arc(this.vx[k], this.vy[k], 2, 0, TAU);
  }
  ctx.fill();

  const NB = 6, buckets = [[], [], [], [], [], []];
  for (let i = 0; i < this.n; i++){
    const dx = this.x[i] - this.cx, dy = this.y[i] - this.cy;
    const e = Math.max(1, this.edgeAt(dx, dy));
    let t = (Math.sqrt(dx * dx + dy * dy) / e - .55) / .45;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    buckets[(t * (NB - 1) + .5) | 0].push(i);
  }
  for (let b = 0; b < NB; b++){
    const list = buckets[b];
    if (!list.length) continue;
    const t = b / (NB - 1);
    ctx.fillStyle = rgba(mix(INK, HOT, t * t), .30 + .45 * t);
    ctx.beginPath();
    for (let j = 0; j < list.length; j++){
      const i = list[j], rr = (1.1 + .5 * t) * this.sz[i];
      ctx.moveTo(this.x[i] + rr, this.y[i]);
      ctx.arc(this.x[i], this.y[i], rr, 0, TAU);
    }
    ctx.fill();
  }

  // the streamlines themselves: a circle at the centre, a decagon out by the ring
  const L = this.L;
  for (let c = 0; c < this.NC; c++){
    const lv = this.levs[c], t = c / (this.NC - 1);
    ctx.strokeStyle = c === this.NC - 1 ? rgba(HOT, .85) : rgba(INK, .10 + .16 * t);
    ctx.lineWidth = c === this.NC - 1 ? 1.4 : 1;
    ctx.beginPath();
    for (let i = 0; i <= L; i++){
      const k = i % L, th = k / L * TAU, r = lv[k];
      const x = this.cx + Math.cos(th) * r, y = this.cy + Math.sin(th) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
  }
  ctx.restore();
};

/* ================================================================
   02 DRIFT
   Carriers run along a channel. Each picks up a sideways component proportional
   to its own forward speed, with no magnet involved. One edge builds an imbalance,
   its field eats the sideways part, and the flow straightens out. Then the drive
   reverses and the whole thing runs back the other way.
   ================================================================ */
function Hall(cell){ this.s = new Stage(cell); this.t = 0; }

Hall.prototype.build = function(){
  const s = this.s;
  const pad = Math.max(14, Math.min(s.w, s.h) * 0.10);
  this.x0 = pad; this.x1 = s.w - pad; this.y0 = pad; this.y1 = s.h - pad;
  this.W = this.x1 - this.x0; this.H = this.y1 - this.y0;
  const n = this.n = clamp(Math.round(this.W * this.H / 700), 120, 780);
  this.LAG = 11;
  this.x = new Float32Array(n); this.y = new Float32Array(n);
  this.hx = new Float32Array(n * this.LAG); this.hy = new Float32Array(n * this.LAG);
  this.sz = new Float32Array(n); this.al = new Float32Array(n);
  for (let i = 0; i < n; i++){
    const x = rnd(this.x0, this.x1), y = rnd(this.y0, this.y1);
    this.x[i] = x; this.y[i] = y; this.sz[i] = rnd(.78, 1.3);
    // every carrier drifts a little differently, otherwise the mass moves as one slab
    this.al[i] = rnd(.5, 1.5);
    for (let l = 0; l < this.LAG; l++){ this.hx[i * this.LAG + l] = x; this.hy[i * this.LAG + l] = y; }
  }
  this.hi = 0;
  this.sign = 1; this.asym = 0; this.t = 0; this.flipAt = 11;

  const dpr = Math.min(2, devicePixelRatio || 1);
  const lat = this.lat = document.createElement('canvas');
  lat.width = this.s.cv.width; lat.height = this.s.cv.height;
  const lc = lat.getContext('2d');
  lc.setTransform(dpr, 0, 0, dpr, 0, 0);
  lc.fillStyle = rgba(INK, .11);
  lc.beginPath();
  const st = 16;
  for (let y = this.y0 + st / 2; y < this.y1; y += st)
    for (let x = this.x0 + st / 2; x < this.x1; x += st){
      lc.moveTo(x + 1, y); lc.arc(x, y, 1, 0, TAU);
    }
  lc.fill();
  lc.strokeStyle = rgba(INK, .16); lc.lineWidth = 1;
  lc.strokeRect(this.x0 + .5, this.y0 + .5, this.W - 1, this.H - 1);
};

Hall.prototype.step = function(dt){
  this.t += dt;
  if (this.t > this.flipAt){ this.sign = -this.sign; this.flipAt = this.t + 11; }

  const VD = this.W * 0.30, ALPHA = 0.44, BACK = 0.92;
  const mid = (this.y0 + this.y1) / 2, half = this.H / 2;
  const s = this.s, n = this.n, LAG = this.LAG;

  let a = 0;
  for (let i = 0; i < n; i++) a += (this.y[i] - mid) / half;
  a /= n;
  this.asym += (a - this.asym) * clamp(dt * 2.2, 0, 1);

  const vxT = VD * this.sign;
  const push = BACK * VD * this.asym;
  const jit = VD * 0.10, jitY = VD * 0.16;

  this.hi = (this.hi + 1) % LAG;
  const slot = this.hi;

  for (let i = 0; i < n; i++){
    let x = this.x[i], y = this.y[i];
    let ux = vxT + (Math.random() - .5) * jit;
    let uy = this.al[i] * ALPHA * vxT - push + (Math.random() - .5) * jitY;
    if (s.hov){
      // the cursor sits in the lattice as a defect and the flow goes around it
      const ex = x - s.mx, ey = y - s.my;
      const d2 = ex * ex + ey * ey + 60;
      const f = VD * 620 / (d2 * Math.sqrt(d2));
      ux += ex * f; uy += ey * f;
    }
    x += ux * dt; y += uy * dt;
    let jump = false;
    if (x > this.x1){ x -= this.W; jump = true; }
    else if (x < this.x0){ x += this.W; jump = true; }
    if (y > this.y1 - 1) y = this.y1 - 1;
    else if (y < this.y0 + 1) y = this.y0 + 1;
    this.x[i] = x; this.y[i] = y;
    if (jump) for (let l = 0; l < LAG; l++){ this.hx[i * LAG + l] = x; this.hy[i * LAG + l] = y; }
    else { this.hx[i * LAG + slot] = x; this.hy[i * LAG + slot] = y; }
  }
};

Hall.prototype.read = function(){
  const v = this.asym * 2.1;
  const bal = Math.abs(this.asym) > 0.40;
  this.s.cell.classList.toggle('lock', bal);
  return (v >= 0 ? '+' : '') + v.toFixed(2) + ' mV' + (bal ? ' · balanced' : '');
};

Hall.prototype.draw = function(){
  const ctx = this.s.ctx, w = this.s.w, h = this.s.h;
  const n = this.n, LAG = this.LAG;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(this.lat, 0, 0, w, h);

  const band = Math.max(4, this.H * 0.045);
  const lo = clamp(this.asym * 2.1, 0, 1), hi = clamp(-this.asym * 2.1, 0, 1);
  ctx.fillStyle = rgba(HOT, .04 + .30 * lo);
  ctx.fillRect(this.x0, this.y1 - band, this.W, band);
  ctx.fillStyle = rgba(HOT, .04 + .30 * hi);
  ctx.fillRect(this.x0, this.y0, this.W, band);

  // an eleven frame tail, which is what makes the tilt readable
  const old = (this.hi + 1) % LAG;
  ctx.lineWidth = 1; ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(INK, .42);
  ctx.beginPath();
  for (let i = 0; i < n; i++){
    const ox = this.hx[i * LAG + old], oy = this.hy[i * LAG + old];
    if (Math.abs(ox - this.x[i]) > this.W / 2) continue;
    ctx.moveTo(ox, oy); ctx.lineTo(this.x[i], this.y[i]);
  }
  ctx.stroke();
  ctx.fillStyle = rgba(INK, .88);
  ctx.beginPath();
  for (let i = 0; i < n; i++){
    const r = 1.5 * this.sz[i];
    ctx.moveTo(this.x[i] + r, this.y[i]); ctx.arc(this.x[i], this.y[i], r, 0, TAU);
  }
  ctx.fill();

  // drive direction, drawn above the channel
  const cx = (this.x0 + this.x1) / 2, yy = this.y0 - 8;
  const L = this.W * 0.09, d = this.sign;
  ctx.strokeStyle = rgba(INK, .38);
  ctx.beginPath(); ctx.moveTo(cx - L * d, yy); ctx.lineTo(cx + L * d, yy); ctx.stroke();
  ctx.fillStyle = rgba(INK, .38);
  ctx.beginPath();
  ctx.moveTo(cx + L * d + 4 * d, yy);
  ctx.lineTo(cx + L * d - 2 * d, yy - 3);
  ctx.lineTo(cx + L * d - 2 * d, yy + 3);
  ctx.fill();
};

/* ================================================================
   03 ALPHABET
   One fixed string of bits. Left of the head it is laid out in eight letters,
   right of it still in four. The left side is a third shorter and the tail keeps
   sliding in: the length is computed, not drawn.
   ================================================================ */
function Alpha(cell){ this.s = new Stage(cell); }

Alpha.prototype.build = function(){
  const s = this.s;
  this.NB = 192;
  let seed = 20260904;
  this.bits = new Uint8Array(this.NB);
  for (let i = 0; i < this.NB; i++){
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    this.bits[i] = (seed >>> 16) & 1;
  }
  this.pad = Math.max(18, s.w * 0.07);
  this.BW = (s.w - this.pad * 2) / (this.NB / 2);
  this.base = s.h * 0.70;
  this.hMax = s.h * 0.44;
  this.kFrom = 2; this.kTo = 3;
  this.hb = 0; this.hold = 0;
  this.heat = new Float32Array(this.NB);
};

Alpha.prototype.val = function(at, k){
  let v = 0;
  for (let j = 0; j < k; j++) v = (v << 1) | (this.bits[at + j] || 0);
  return v;
};

Alpha.prototype.step = function(dt){
  if (this.hold > 0){
    this.hold -= dt;
    if (this.hold <= 0){
      const a = this.kFrom; this.kFrom = this.kTo; this.kTo = a;
      this.hb = 0; this.heat.fill(0);
    }
    return;
  }
  this.hb += this.NB / 8.6 * dt;
  if (this.hb >= this.NB){ this.hb = this.NB; this.hold = 2.6; }
  for (let i = 0; i < this.NB; i++) if (this.heat[i] > 0) this.heat[i] = Math.max(0, this.heat[i] - dt * 1.5);
};

Alpha.prototype.geom = function(){
  const kF = this.kFrom, kT = this.kTo;
  const nNew = Math.floor(this.hb / kT);
  const joStart = Math.ceil((nNew * kT) / kF);
  const nOld = this.NB / kF - joStart;
  const total = (this.hb / kT + (this.NB - this.hb) / kF) * this.BW;
  const x0 = (this.s.w - total) / 2;
  const headX = x0 + (this.hb / kT) * this.BW;
  return { kF, kT, nNew, joStart, nOld, x0, headX };
};

Alpha.prototype.read = function(){
  const g = this.geom();
  const n = g.nNew + g.nOld;
  const done = this.hold > 0;
  this.s.cell.classList.toggle('lock', done);
  if (done) return (1 << g.kT) + ' letters · ' + g.kT + '.00 bits · ' + n + ' bases';
  return (1 << g.kF) + ' → ' + (1 << g.kT) + ' · ' + n + ' bases';
};

Alpha.prototype.bar = function(ctx, x, v, k, heat){
  const s = this.s;
  const lv = v / ((1 << k) - 1);
  let hgt = this.hMax * (0.16 + 0.84 * lv);
  let y = this.base - hgt;
  if (s.hov){
    // the cursor lifts the tape under it without touching a single bit
    const d = (x + this.BW / 2 - s.mx) / (this.BW * 4.5);
    y -= this.hMax * 0.30 * Math.exp(-d * d);
  }
  const bw = this.BW * 0.60;
  ctx.fillStyle = heat > 0 ? rgba(mix(INK, HOT, clamp(heat, 0, 1)), .55 + .45 * clamp(heat, 0, 1))
                           : rgba(INK, .34 + .40 * lv);
  ctx.fillRect(x + (this.BW - bw) / 2, y, bw, this.base - y);
};

Alpha.prototype.draw = function(){
  const ctx = this.s.ctx, w = this.s.w, h = this.s.h;
  ctx.clearRect(0, 0, w, h);
  const g = this.geom();

  for (let j = 0; j < g.nNew; j++){
    const at = j * g.kT;
    this.bar(ctx, g.x0 + j * this.BW, this.val(at, g.kT), g.kT, this.heat[at]);
  }
  const shift = g.x0 + this.hb * this.BW * (1 / g.kT - 1 / g.kF);
  for (let j = 0; j < g.nOld; j++){
    const jo = g.joStart + j;
    this.bar(ctx, shift + jo * this.BW, this.val(jo * g.kF, g.kF), g.kF, 0);
  }

  // the head
  if (this.hold <= 0){
    const at = g.nNew * g.kT;
    if (at < this.NB) this.heat[at] = 1;
    const x = g.headX;
    ctx.strokeStyle = rgba(HOT, .85); ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + .5, this.base - this.hMax * 1.14);
    ctx.lineTo(x + .5, this.base + this.hMax * 0.13);
    ctx.stroke();
    ctx.fillStyle = rgba(HOT, .9);
    ctx.beginPath();
    ctx.moveTo(x, this.base - this.hMax * 1.14);
    ctx.lineTo(x - 4, this.base - this.hMax * 1.14 - 6);
    ctx.lineTo(x + 4, this.base - this.hMax * 1.14 - 6);
    ctx.fill();
  }

  // gauge: how much tape the same text would take at four letters
  const full = (this.NB / 2) * this.BW, cur = (g.nNew + g.nOld) * this.BW;
  const my = this.base + this.hMax * 0.20, fx = (w - full) / 2;
  ctx.fillStyle = rgba(INK, .16);
  ctx.fillRect(fx, my, full, 1);
  ctx.fillRect(fx, my - 3, 1, 7); ctx.fillRect(fx + full - 1, my - 3, 1, 7);
  const cx0 = (w - cur) / 2;
  ctx.fillStyle = rgba(HOT, .80);
  ctx.fillRect(cx0, my, cur, 1);
  ctx.fillRect(cx0, my - 3, 1, 7); ctx.fillRect(cx0 + cur - 1, my - 3, 1, 7);
};

/* ================================================================
   04 CHORD
   The body is never shown. Each observer runs one row and knows only when the
   star went out and when it came back. The edge is assembled from those segments,
   and only afterwards is it checked against the real thing.
   ================================================================ */
function Chord(cell){ this.s = new Stage(cell); }

Chord.prototype.build = function(){ this.shape(); };

Chord.prototype.shape = function(){
  const s = this.s;
  this.cx = s.w * 0.5; this.cy = s.h * 0.5;
  this.R = Math.min(s.w, s.h) * 0.33;
  this.K = 13;
  this.rad = new Float32Array(this.K);
  for (let i = 0; i < this.K; i++) this.rad[i] = this.R * rnd(0.50, 1.0);
  // smoothing, so the limb reads as a body and not as a star
  for (let p = 0; p < 1; p++){
    const c = this.rad.slice();
    for (let i = 0; i < this.K; i++)
      this.rad[i] = (c[(i + this.K - 1) % this.K] + 2 * c[i] + c[(i + 1) % this.K]) / 4;
  }
  this.KM = 26 / (2 * this.R);

  const n = 12;
  this.tr = [];
  for (let i = 0; i < n; i++){
    const f = (i + .5) / n;
    this.tr.push({
      y: this.cy + (f - .5) * this.R * 2.35 + rnd(-4, 4),
      x: 0, t0: i * 0.34 + rnd(0, .12), a: -1, b: -1, on: false, done: false
    });
  }
  this.t = 0; this.phase = 0; this.rev = 0; this.fade = 1;
  this.sp = s.w / 3.6;
  this.x0 = 0; this.x1 = s.w;
};

Chord.prototype.rAt = function(th){
  const K = this.K;
  let u = (th / TAU + 1) % 1 * K;
  const i = u | 0, f = u - i;
  const a = this.rad[(i + K - 1) % K], b = this.rad[i], c = this.rad[(i + 1) % K], d = this.rad[(i + 2) % K];
  // catmull-rom, keeps the limb smooth while still lumpy
  return 0.5 * ((2*b) + (-a + c) * f + (2*a - 5*b + 4*c - d) * f*f + (-a + 3*b - 3*c + d) * f*f*f);
};

Chord.prototype.inside = function(x, y){
  const dx = x - this.cx, dy = y - this.cy;
  const r = Math.sqrt(dx * dx + dy * dy);
  return r < this.rAt(Math.atan2(dy, dx));
};

Chord.prototype.step = function(dt){
  this.t += dt;
  if (this.phase === 0){
    let all = true;
    for (const t of this.tr){
      if (this.t < t.t0){ all = false; continue; }
      if (t.done) continue;
      all = false;
      t.x += this.sp * dt;
      if (t.x > this.x1){ t.done = true; if (t.on){ t.b = t.x; t.on = false; } continue; }
      const inb = this.inside(t.x, t.y);
      if (inb && !t.on){ t.on = true; t.a = t.x; }
      else if (!inb && t.on){ t.on = false; t.b = t.x; }
    }
    if (all){ this.phase = 1; this.rev = 0; }
  } else if (this.phase === 1){
    this.rev = Math.min(1, this.rev + dt * 0.85);
    if (this.rev >= 1 && this.t > 0) this.phase = 2, this.hold = 3.2;
  } else if (this.phase === 2){
    this.hold -= dt;
    if (this.hold <= 0) this.phase = 3;
  } else {
    this.fade -= dt * 1.1;
    if (this.fade <= 0){ this.shape(); }
  }
};

Chord.prototype.read = function(){
  let n = 0, best = 0;
  for (const t of this.tr) if (t.a >= 0 && t.b > t.a){ n++; best = Math.max(best, t.b - t.a); }
  this.s.cell.classList.toggle('lock', this.phase >= 1);
  if (!n) return 'watching';
  return n + ' chords · ' + (best * this.KM).toFixed(1) + ' km';
};

Chord.prototype.draw = function(){
  const ctx = this.s.ctx, w = this.s.w, h = this.s.h, s = this.s;
  ctx.clearRect(0, 0, w, h);
  const A = clamp(this.fade, 0, 1);

  ctx.lineWidth = 1;
  for (const t of this.tr){
    if (this.t < t.t0) continue;
    const to = t.done ? this.x1 : t.x;
    ctx.strokeStyle = rgba(INK, .17 * A);
    ctx.beginPath(); ctx.moveTo(this.x0, t.y + .5); ctx.lineTo(to, t.y + .5); ctx.stroke();
    // the timing: entry to exit, the open end grows along with the row
    if (t.a >= 0){
      const b = t.b > t.a ? t.b : t.x;
      ctx.strokeStyle = rgba(HOT, .85 * A);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(t.a, t.y + .5); ctx.lineTo(b, t.y + .5); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(HOT, .55 * A);
      ctx.beginPath();
      ctx.moveTo(t.a + .5, t.y - 3.5); ctx.lineTo(t.a + .5, t.y + 4.5);
      if (t.b > t.a){ ctx.moveTo(t.b + .5, t.y - 3.5); ctx.lineTo(t.b + .5, t.y + 4.5); }
      ctx.stroke();
    }
    if (!t.done){
      ctx.fillStyle = rgba(INK, (t.on ? .18 : .9) * A);
      ctx.beginPath(); ctx.arc(t.x, t.y, t.on ? 1.6 : 2.4, 0, TAU); ctx.fill();
    }
  }

  // first the solution built from the segment ends alone
  if (this.rev > 0){
    const r1 = clamp(this.rev / .45, 0, 1);
    const pts = [];
    for (const t of this.tr) if (t.a >= 0 && t.b > t.a) pts.push(t);
    if (pts.length > 1){
      ctx.strokeStyle = rgba(HOT, .70 * A * r1);
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) ctx.lineTo(pts[i].a, pts[i].y);
      for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].b, pts[i].y);
      ctx.closePath(); ctx.stroke();
      ctx.setLineDash([]);
    }
    // and only then the body itself, to check against
    const r2 = clamp((this.rev - .5) / .5, 0, 1);
    if (r2 > 0){
      ctx.beginPath();
      for (let i = 0; i <= 96; i++){
        const th = i / 96 * TAU, r = this.rAt(th);
        const x = this.cx + Math.cos(th) * r, y = this.cy + Math.sin(th) * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = rgba(INK, .075 * A * r2); ctx.fill();
      ctx.strokeStyle = rgba(INK, .38 * A * r2); ctx.stroke();
    }
  }

  // the cursor row is solved in one go
  if (s.hov && this.fade > .5){
    const y = s.my;
    let a = -1, b = -1;
    for (let x = this.x0; x < this.x1; x += 2){
      const inb = this.inside(x, y);
      if (inb && a < 0) a = x;
      if (!inb && a >= 0 && b < 0) b = x;
    }
    ctx.strokeStyle = rgba(INK, .22);
    ctx.beginPath(); ctx.moveTo(this.x0, y + .5); ctx.lineTo(this.x1, y + .5); ctx.stroke();
    if (a >= 0){
      if (b < 0) b = this.x1;
      ctx.strokeStyle = rgba(HOT, .95); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(a, y + .5); ctx.lineTo(b, y + .5); ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
};

/* ================================================================ */
const MAKE = { poly: Poly, hall: Hall, alpha: Alpha, chord: Chord };
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
  for (const p of pieces) p.off = solo && p.s.cell !== cell;
});
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  grid.classList.remove('solo');
  document.querySelectorAll('.cell.is-solo').forEach(c => c.classList.remove('is-solo'));
  for (const p of pieces) p.off = false;
});
