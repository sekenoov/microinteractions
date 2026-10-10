/* GRAIN. One heap engine, three rules.
   Grains fall, pile up and leave. What changes between the panels is a
   single rule: whether a grain may topple sideways, and where the floor lets go. */

const INK = [233,230,217], HOT = [255,91,52];
const CELL = 7, STEP = 1/26;
const rgba = (c,a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
const mix = (a,b,t) => [a[0]+(b[0]-a[0])*t | 0, a[1]+(b[1]-a[1])*t | 0, a[2]+(b[2]-a[2])*t | 0];

function Sim(cell){
  this.kind = cell.dataset.sim;
  this.cell = cell;
  this.panel = cell.querySelector('.panel');
  this.cv = cell.querySelector('canvas');
  this.ctx = this.cv.getContext('2d');
  this.stat = cell.querySelector('[data-stat]');
  this.w = 0; this.h = 0; this.cols = 0; this.rows = 0;
  this.t = 0; this.acc = 0; this.gate = false; this.out = 0; this.fill = 0;
  this.px = -1; this.hover = 0;
  this.lat = document.createElement('canvas');

  this.panel.addEventListener('pointermove', e => {
    const r = this.panel.getBoundingClientRect();
    this.px = Math.floor((e.clientX - r.left) / r.width * this.cols);
    this.hover = 1;
  });
  this.panel.addEventListener('pointerleave', () => { this.hover = 0; });
}

Sim.prototype.fit = function(){
  const r = this.panel.getBoundingClientRect();
  const w = Math.round(r.width), h = Math.round(r.height);
  if (w < 120 || h < 120 || (w === this.w && h === this.h)) return;
  const dpr = Math.min(2, devicePixelRatio || 1);
  this.w = w; this.h = h;
  this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
  this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  this.cols = Math.max(8, Math.floor(w / CELL));
  this.rows = Math.max(8, Math.floor(h / CELL));
  this.ox = (w - this.cols * CELL) / 2 + CELL / 2;
  this.oy = (h - this.rows * CELL) / 2 + CELL / 2;
  this.g = new Uint8Array(this.cols * this.rows);
  this.heat = new Uint8Array(this.cols * this.rows);
  this.mv = new Int8Array(this.cols * this.rows);

  // фон: слабая решётка, рисуется один раз
  this.lat.width = this.cv.width; this.lat.height = this.cv.height;
  const lc = this.lat.getContext('2d');
  lc.setTransform(dpr, 0, 0, dpr, 0, 0);
  lc.fillStyle = rgba(INK, .085);
  lc.beginPath();
  for (let y = 0; y < this.rows; y++)
    for (let x = 0; x < this.cols; x++){
      lc.moveTo(this.ox + x * CELL + 1, this.oy + y * CELL);
      lc.arc(this.ox + x * CELL, this.oy + y * CELL, 1, 0, 6.2832);
    }
  lc.fill();

  this.seed();
  this.readout();
};

Sim.prototype.seed = function(){
  this.g.fill(0); this.heat.fill(0);
  this.gate = false; this.cell.classList.remove('gate');
  const { cols, rows, g } = this;
  if (this.kind === 'drain'){
    // поверхность уже просела над выпуском, как это и выглядит при работающем силосе
    const c = cols / 2, wid = cols * .17;
    for (let x = 0; x < cols; x++){
      const dip = Math.exp(-((x - c) / wid) * ((x - c) / wid));
      const top = Math.round(rows * (.19 + .11 * dip)) + ((Math.random() * 2) | 0);
      for (let y = top; y < rows; y++) g[y * cols + x] = 1;
    }
    return;
  }
  // стартовая куча: у pour рваный профиль, у slope ровный конус
  const half = cols / 2;
  for (let x = 0; x < cols; x++){
    const t = 1 - Math.abs(x - half) / half;
    const hgt = this.kind === 'pour'
      ? Math.round(rows * (.14 + .26 * t) + (Math.random() * 7 - 3))
      : Math.round(rows * .34 * (.25 + .75 * t));
    for (let y = rows - hgt; y < rows; y++) if (y >= 0) g[y * cols + x] = 1;
  }
};

Sim.prototype.count = function(){
  let n = 0;
  for (let i = 0; i < this.g.length; i++) if (this.g[i]) n++;
  return n;
};

Sim.prototype.add = function(x, y){
  if (x < 0 || x >= this.cols || y < 0) return;
  const k = y * this.cols + x;
  if (this.g[k]) return;
  this.g[k] = 1; this.heat[k] = 255;
};

Sim.prototype.step = function(){
  const { cols, rows, g, heat, mv } = this;
  const diag = this.kind !== 'pour';
  this.t += STEP;

  // подача
  if (!this.gate){
    let sx;
    if (this.hover > .5 && this.px >= 0) sx = this.px;
    else if (this.kind === 'pour'){
      const u = (this.t * .30) % 2, tri = u < 1 ? u : 2 - u;
      sx = Math.round(cols * (.12 + .76 * tri));
    }
    else if (this.kind === 'slope') sx = Math.round(cols * .5 + (Math.random() * 3 - 1));
    else sx = -1;

    if (sx >= 0){
      this.add(sx, 0);
      this.add(sx - 1, 0);
      this.add(sx + 1, 0);
      this.add(sx + (Math.random() < .5 ? -2 : 2), 0);
    }
    if (this.kind === 'drain'){
      // подача сверху держит короб почти полным, но не забивает его до потолка
      const n = this.fill > .87 ? 2 : 5;
      for (let i = 0; i < n; i++) this.add((Math.random() * cols) | 0, 0);
    }
  }

  // падение снизу вверх, чтобы зерно двигалось не больше раза за шаг
  mv.fill(0);
  for (let y = rows - 2; y >= 0; y--){
    const flip = ((y + (this.t / STEP) | 0) & 1) === 1;
    for (let i = 0; i < cols; i++){
      const x = flip ? i : cols - 1 - i;
      const k = y * cols + x;
      if (!g[k]) continue;
      const b = k + cols;
      if (!g[b]){ g[b] = 1; heat[b] = 255; mv[b] = 2; g[k] = 0; heat[k] = 0; continue; }
      if (!diag) continue;
      const canL = x > 0 && !g[b - 1] && !g[k - 1];
      const canR = x < cols - 1 && !g[b + 1] && !g[k + 1];
      let t = -1;
      if (canL && canR) t = Math.random() < .5 ? b - 1 : b + 1;
      else if (canL) t = b - 1;
      else if (canR) t = b + 1;
      if (t >= 0){ g[t] = 1; heat[t] = 255; mv[t] = 2 + (t - b); g[k] = 0; heat[k] = 0; }
    }
  }

  // пол
  const last = (rows - 1) * cols;
  if (this.kind === 'drain'){
    const c = cols >> 1;
    for (let x = c - 2; x <= c + 2; x++)
      if (g[last + x]){ g[last + x] = 0; heat[last + x] = 0; this.out++; }
  } else if (this.gate){
    for (let x = 0; x < cols; x++){ g[last + x] = 0; heat[last + x] = 0; }
  }

  for (let i = 0; i < heat.length; i++) if (heat[i]) heat[i] = heat[i] > 13 ? heat[i] - 13 : 0;

  if ((this.t / STEP | 0) % 7 === 0) this.readout();
};

Sim.prototype.readout = function(){
  const { cols, rows, g } = this;
  // куча считается от пола вверх, летящие зёрна в неё не попадают
  let peak = 0, left = cols, right = -1;
  for (let x = 0; x < cols; x++){
    let hgt = 0;
    for (let y = rows - 1; y >= 0; y--){ if (!g[y * cols + x]) break; hgt++; }
    if (!hgt) continue;
    if (x < left) left = x;
    if (x > right) right = x;
    if (hgt > peak) peak = hgt;
  }

  const fill = this.count() / (cols * rows);
  this.fill = fill;

  if (this.kind === 'drain'){
    this.stat.textContent = 'out ' + this.out;
    return;
  }

  // пол открывается, когда короб набрался, и закрывается когда почти опустел
  if (!this.gate && fill > (this.kind === 'pour' ? .55 : .50)){ this.gate = true; this.cell.classList.add('gate'); }
  if (this.gate && fill < .16){ this.gate = false; this.cell.classList.remove('gate'); }

  if (this.gate){ this.stat.textContent = 'floor open'; return; }
  if (this.kind === 'pour'){ this.stat.textContent = 'peak ' + peak; return; }
  const half = Math.max(1, (right - left) / 2);
  this.stat.textContent = 'slope ' + Math.round(Math.atan2(peak, half) * 57.2958) + '°';
};

Sim.prototype.draw = function(){
  const ctx = this.ctx;
  ctx.clearRect(0, 0, this.w, this.h);
  ctx.drawImage(this.lat, 0, 0, this.w, this.h);

  const { cols, rows, g, heat, mv } = this;
  // между двумя шагами модели зерно рисуется на полпути, поэтому падение слитное
  const a = this.acc / STEP;
  const back = (1 - (a > 1 ? 1 : a)) * CELL;

  const N = 6;
  const buckets = [[], [], [], [], [], []];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++){
      const k = y * cols + x;
      if (!g[k]) continue;
      let b = (heat[k] * N / 256) | 0;
      if (b > N - 1) b = N - 1;
      buckets[b].push(k);
    }

  for (let b = 0; b < N; b++){
    const list = buckets[b];
    if (!list.length) continue;
    const t = b / (N - 1);
    const base = 2.16 + .42 * t;
    ctx.fillStyle = rgba(mix(INK, HOT, t), .70 + .28 * t);
    ctx.beginPath();
    for (let i = 0; i < list.length; i++){
      const k = list[i];
      const m = mv[k];
      let x = this.ox + (k % cols) * CELL;
      let y = this.oy + ((k / cols) | 0) * CELL;
      if (m){ x -= (m - 2) * back; y -= back; }
      // у каждой клетки свой постоянный размер, иначе масса выглядит печатной решёткой
      const r = base * (.84 + .30 * (((k * 1103515245 + 12345) >>> 16 & 255) / 255));
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, 6.2832);
    }
    ctx.fill();
  }
};

/* ------------------------------------------------------------------ */
const sims = [...document.querySelectorAll('.cell')].map(c => new Sim(c));
const clock = document.getElementById('clock');
const gridLabel = document.getElementById('grid');
function showGrid(){ const s = sims[0]; if (s.cols) gridLabel.textContent = s.cols + ' by ' + s.rows + ' cells'; }
sims.forEach(s => new ResizeObserver(() => { s.fit(); showGrid(); }).observe(s.panel));
sims.forEach(s => s.fit());
showGrid();

let last = 0, t0 = 0, shown = -1;
function frame(now){
  if (!t0) t0 = now;
  const dt = Math.min(.06, (now - last) / 1000) || .016;
  last = now;

  for (const s of sims){
    if (!s.cols) { s.fit(); showGrid(); continue; }
    s.acc += dt;
    let n = 0;
    while (s.acc >= STEP && n < 6){ s.step(); s.acc -= STEP; n++; }
    s.draw();
  }

  const sec = ((now - t0) / 1000) | 0;
  if (sec !== shown){
    shown = sec;
    clock.textContent = String((sec / 60 | 0) % 60).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
