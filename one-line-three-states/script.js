/* LINE. Three states of one line.
   Every switch runs through the line itself: the old state is pressed flat
   into a single thread, the new one grows back out of it. */

const TAU = Math.PI * 2;
const INK = [233,230,217], HOT = [255,91,52], PANEL = [17,21,20];
const rgba = (c,a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
const mix = (a,b,t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const smooth = (a,b,x) => { const t = clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2;
const easeOut = t => 1 - Math.pow(1-t, 3);
const FONT = 'ui-monospace, Menlo, monospace';

const stageEl = document.getElementById('stage');
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let W = 0, H = 0, CY = 0;

const ptr = { x:0, y:0, tx:0, ty:0, on:0, want:0 };
stageEl.addEventListener('pointermove', e => {
  const r = stageEl.getBoundingClientRect();
  ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top; ptr.want = 1;
});
stageEl.addEventListener('pointerleave', () => { ptr.want = 0; });

/* ---------------------------------------------------------------
   01 LENS
   Lines drift left. Inside the lens they fall behind, and the
   delay they picked up stays with them after they leave.
--------------------------------------------------------------- */
const lens = {
  name:'Lens', tag:'lens',
  hook:'It bends time instead of light. What goes in comes out late.',
  SP:18, SPEED:42, NY:40,
  lines:[], lx:0, ly:0, R:0, LAGMAX:1, peak:0,

  fit(){
    const n = Math.ceil(W / this.SP) + 3;
    this.lines = [];
    for (let i = 0; i < n; i++) this.lines.push({ x:i * this.SP, lag:new Float32Array(this.NY) });
    this.lx = W * .5; this.ly = CY;
  },

  step(dt, t){
    const dx0 = W * .5 + Math.cos(t * .33) * W * .26 + Math.cos(t * .11) * W * .07;
    const dy0 = CY + Math.sin(t * .47) * H * .27;
    const gx = ptr.tx * ptr.on + dx0 * (1 - ptr.on);
    const gy = ptr.ty * ptr.on + dy0 * (1 - ptr.on);
    this.lx += (gx - this.lx) * .075;
    this.ly += (gy - this.ly) * .075;

    const R = Math.min(W, H) * .31;
    const inv = 1 / (R * R * .58);
    const LAGMAX = R * .74;
    const stepY = H / (this.NY - 1);
    let mx = 0;

    for (const L of this.lines){
      L.x -= this.SPEED * dt;
      if (L.x < -this.SP){ L.x += this.lines.length * this.SP; L.lag.fill(0); }
      for (let k = 0; k < this.NY; k++){
        const dx = L.x - this.lx, dy = k * stepY - this.ly;
        const target = LAGMAX * Math.exp(-(dx*dx + dy*dy) * inv);
        const cur = L.lag[k];
        // picks up delay fast, gives it back slowly
        const v = cur + (target - cur) * (target > cur ? 3.2 : .58) * dt;
        L.lag[k] = v;
        if (v > mx) mx = v;
      }
    }
    this.R = R; this.LAGMAX = LAGMAX;
    this.peak += (mx - this.peak) * .1;
  },

  draw(p){
    const stepY = H / (this.NY - 1);
    const n = this.NY, half = p * .5;
    const i0 = Math.max(0, Math.floor((.5 - half) * (n - 1)));
    const i1 = Math.min(n - 1, Math.ceil((.5 + half) * (n - 1)));
    const spread = .3 + .7 * p;

    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(INK, .10 * p);
    ctx.beginPath();
    for (const L of this.lines){
      ctx.moveTo(L.x, CY + (i0 * stepY - CY) * p);
      ctx.lineTo(L.x, CY + (i1 * stepY - CY) * p);
    }
    ctx.stroke();

    for (const L of this.lines){
      let hot = 0;
      ctx.beginPath();
      for (let k = i0; k <= i1; k++){
        const y = CY + (k * stepY - CY) * p;
        const lag = L.lag[k];
        if (lag > hot) hot = lag;
        ctx.lineTo(L.x + lag * spread, y);
      }
      const h = smooth(.05, .55, hot / this.LAGMAX);
      ctx.strokeStyle = rgba(mix(INK, HOT, h), (.38 + .58 * h) * (.3 + .7 * p));
      ctx.lineWidth = 1 + h * 1.2;
      ctx.stroke();
    }

    if (p > .82){
      const a = (p - .82) / .18;
      ctx.strokeStyle = rgba(INK, .14 * a);
      ctx.beginPath(); ctx.arc(this.lx, this.ly, this.R, 0, TAU); ctx.stroke();

      const ms = Math.round(this.peak / this.SPEED * 1000);
      ctx.font = '9.5px ' + FONT;
      ctx.fillStyle = rgba(INK, .5 * a);
      ctx.fillText('held ' + ms + ' ms', this.lx + this.R * .70, this.ly - this.R * .70);
    }
  }
};

/* ---------------------------------------------------------------
   02 GROUND
   A heat field read as contour lines. Two slow sources draw it on
   their own, the cursor adds a hill, and all of it cools back flat.
--------------------------------------------------------------- */
const ground = {
  name:'Ground', tag:'contours',
  hook:'Everything the cursor touches turns into terrain, and then it cools back to flat.',
  CW:8, LV:[.10,.20,.33,.48,.65,.84],
  gw:0, gh:0, f:null, g:null, img:null, off:null, octx:null,

  fit(){
    this.gw = Math.max(12, Math.floor(W / this.CW) + 1);
    this.gh = Math.max(10, Math.floor(H / this.CW) + 1);
    this.f = new Float32Array(this.gw * this.gh);
    this.g = new Float32Array(this.gw * this.gh);
    this.off = this.off || document.createElement('canvas');
    this.off.width = this.gw; this.off.height = this.gh;
    this.octx = this.off.getContext('2d');
    this.img = this.octx.createImageData(this.gw, this.gh);
  },

  heat(cx, cy, amt, rad){
    const { gw, gh, f } = this;
    const s = 2 * rad * rad * .35;
    const i0 = Math.max(0, (cx - rad*2)|0), i1 = Math.min(gw-1, (cx + rad*2)|0);
    const j0 = Math.max(0, (cy - rad*2)|0), j1 = Math.min(gh-1, (cy + rad*2)|0);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++){
      const dx = i - cx, dy = j - cy;
      f[j*gw+i] += amt * Math.exp(-(dx*dx + dy*dy) / s);
    }
  },

  step(dt, t){
    const { gw, gh, f, g } = this;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++){
      const k = j*gw + i;
      const l = f[i > 0 ? k-1 : k], r = f[i < gw-1 ? k+1 : k];
      const u = f[j > 0 ? k-gw : k], d = f[j < gh-1 ? k+gw : k];
      g[k] = (f[k] * .60 + (l + r + u + d) * .10) * .9955;
    }
    f.set(g);

    this.heat(gw * (.5 + .34 * Math.cos(t * .52)),  gh * (.5 + .34 * Math.sin(t * .81)),  .058, 3.4);
    this.heat(gw * (.5 + .30 * Math.cos(-t * .37 + 2)), gh * (.5 + .32 * Math.sin(t * .44 + 1)), .040, 4.6);
    this.heat(gw * (.5 + .40 * Math.cos(t * .21 + 4)),  gh * (.5 + .24 * Math.sin(-t * .29 + 3)), .028, 5.5);
    if (ptr.on > .01) this.heat(ptr.x / W * gw, ptr.y / H * gh, .11 * ptr.on, 3.2);
  },

  draw(p){
    const { gw, gh, f, LV } = this;
    const cw = W / (gw - 1), ch = H / (gh - 1);
    const Y = y => CY + (y - CY) * p;

    const d = this.img.data;
    for (let k = 0, q = 0; k < f.length; k++, q += 4){
      const v = clamp(f[k], 0, 1);
      d[q] = INK[0]; d[q+1] = INK[1]; d[q+2] = INK[2];
      d[q+3] = (v * v * 50) | 0;
    }
    this.octx.putImageData(this.img, 0, 0);
    ctx.globalAlpha = p;
    ctx.drawImage(this.off, 0, CY * (1 - p), W, H * p);
    ctx.globalAlpha = 1;

    const marks = [];
    for (let n = 0; n < LV.length; n++){
      const lv = LV[n], top = n / (LV.length - 1);
      let seen = 0;
      ctx.beginPath();
      for (let j = 0; j < gh - 1; j++) for (let i = 0; i < gw - 1; i++){
        const a = f[j*gw+i], b = f[j*gw+i+1], c = f[(j+1)*gw+i+1], e = f[(j+1)*gw+i];
        const id = (a > lv ? 8:0) | (b > lv ? 4:0) | (c > lv ? 2:0) | (e > lv ? 1:0);
        if (!id || id === 15) continue;
        const x0 = i * cw, y0 = j * ch;
        const T = (u,v) => (lv - u) / ((v - u) || 1e-6);
        const t_ = [x0 + cw * T(a,b), Y(y0)];
        const r_ = [x0 + cw,          Y(y0 + ch * T(b,c))];
        const b_ = [x0 + cw * T(e,c), Y(y0 + ch)];
        const l_ = [x0,               Y(y0 + ch * T(a,e))];
        const S = (u,v) => { ctx.moveTo(u[0], u[1]); ctx.lineTo(v[0], v[1]); };
        switch (id){
          case 1: case 14: S(l_, b_); break;
          case 2: case 13: S(b_, r_); break;
          case 3: case 12: S(l_, r_); break;
          case 4: case 11: S(t_, r_); break;
          case 6: case 9:  S(t_, b_); break;
          case 7: case 8:  S(t_, l_); break;
          case 5:  S(t_, l_); S(b_, r_); break;
          case 10: S(t_, r_); S(b_, l_); break;
        }
        if (n === 2 && ++seen % 46 === 0) marks.push([l_[0], l_[1], Math.round(lv * 400)]);
      }
      const col = top > .72 ? mix(INK, HOT, (top - .72) / .28 * .9 + .1) : INK;
      ctx.strokeStyle = rgba(col, (.22 + .5 * top) * (.3 + .7 * p));
      ctx.lineWidth = top > .82 ? 1.25 : .9;
      ctx.stroke();
    }

    if (p > .88){
      const a = (p - .88) / .12;
      ctx.font = '9px ' + FONT;
      ctx.textBaseline = 'middle';
      for (const [x, y, v] of marks){
        const s = String(v);
        const w = ctx.measureText(s).width;
        ctx.fillStyle = rgba(PANEL, .95 * a);
        ctx.fillRect(x - w/2 - 3, y - 6, w + 6, 12);
        ctx.fillStyle = rgba(INK, .5 * a);
        ctx.fillText(s, x - w/2, y);
      }
      ctx.textBaseline = 'alphabetic';
    }
  }
};

/* ---------------------------------------------------------------
   03 THREAD
   The paragraph is stitched with one thread. Pull the loose end
   and the words come off it in order.
--------------------------------------------------------------- */
const thread = {
  name:'Thread', tag:'one thread',
  hook:'Pull the end. The paragraph comes apart word by word, then winds back.',
  TEXT:'Every word here is holding the one next to it. Take one away and this stops being a paragraph. What is left is a thread you can wind around a finger.',
  DUR:.85, STAG:.028,
  els:[], nat:[], out:false, T:9, hold:0, ph:0, p:1, ready:false,

  init(){
    this.box = document.getElementById('thread');
    this.svg = document.getElementById('tsvg');
    this.path = document.getElementById('tpath');
    this.knot = document.getElementById('tknot');
    this.host = document.getElementById('ttext');
    const inner = document.getElementById('tp');
    inner.innerHTML = this.TEXT.split(' ').map(w => '<span class="ws">' + w + ' </span>').join('');
    this.els = [...inner.querySelectorAll('.ws')];
    this.ruler = document.createElement('span');
    this.ruler.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0';
    this.host.appendChild(this.ruler);

    this.box.addEventListener('pointermove', e => {
      const r = this.box.getBoundingClientRect();
      this.ph = (e.clientX - r.left) / r.width * TAU * .8;
    });
  },

  measure(){
    if (!W) return;
    const cs = getComputedStyle(this.host);
    this.els.forEach(e => { e.classList.remove('w'); e.style.cssText = ''; });
    this.ruler.style.font = cs.font;
    const r0 = this.host.getBoundingClientRect();
    this.nat = this.els.map(e => {
      const r = e.getBoundingClientRect();
      this.ruler.textContent = e.textContent;
      return { x:r.left - r0.left, y:r.top - r0.top, h:r.height,
               w:this.ruler.getBoundingClientRect().width };
    });
    this.els.forEach((e, i) => {
      e.classList.add('w');
      e.style.left = this.nat[i].x + 'px';
      e.style.top  = this.nat[i].y + 'px';
    });
    this.svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    this.ready = true;
  },

  step(dt){
    if (!this.ready) return;
    const N = this.els.length;
    this.T += dt;
    if (this.T > this.DUR + N * this.STAG){
      this.hold += dt;
      if (this.hold > (this.out ? 3.2 : 2.4)){ this.out = !this.out; this.T = 0; this.hold = 0; }
    }

    const total = this.nat.reduce((s, n) => s + n.w, 0);
    const pad = W * .085;
    const k = Math.min(.86, (W - pad * 2) / (total || 1));
    const amp = H * .19, freq = TAU * 1.15;
    const pts = [];
    let x = pad, avg = 0;

    for (let i = 0; i < N; i++){
      // the knot is the end being pulled, so the tail straightens first
      const d = (this.out ? (N - 1 - i) : i) * this.STAG;
      const q = easeOut(clamp((this.T - d) / this.DUR, 0, 1));
      const f = this.out ? q : 1 - q;
      avg += f;

      const sy = CY + Math.sin(x / W * freq + this.ph) * amp;
      const slope = Math.cos(x / W * freq + this.ph) * amp * freq / W;
      const nx = this.nat[i].x, ny = this.nat[i].y + this.nat[i].h / 2;
      const gx = nx + (x - nx) * f;
      const gy = CY + ((ny + (sy - ny) * f) - CY) * this.p;
      const s = 1 + (k - 1) * f;

      this.els[i].style.transform =
        'translate(' + (gx - nx) + 'px,' + (gy - ny) + 'px) rotate(' +
        (Math.atan(slope) * f) + 'rad) scale(' + s + ')';
      this.els[i].style.opacity = this.p;

      pts.push([gx, gy]);
      x += this.nat[i].w * s;
    }

    const last = pts[pts.length - 1];
    let dd = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 1; i < pts.length; i++){
      const a = pts[i-1], b = pts[i];
      dd += ' Q' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' ' +
            ((a[0]+b[0])/2).toFixed(1) + ' ' + ((a[1]+b[1])/2).toFixed(1);
    }
    dd += ' L' + last[0].toFixed(1) + ' ' + last[1].toFixed(1);
    const o = (.04 + .96 * (avg / N)) * this.p;
    this.path.setAttribute('d', dd);
    this.path.setAttribute('stroke-opacity', o);
    this.knot.setAttribute('cx', last[0]);
    this.knot.setAttribute('cy', last[1]);
    this.knot.setAttribute('r', 2.2 + 2.4 * (avg / N));
    this.knot.setAttribute('fill-opacity', o);
  },

  draw(p){ this.box.style.opacity = p > .02 ? 1 : 0; },
  hide(){ this.box.style.opacity = 0; }
};

/* ---------------------------------------------------------------
   stage
--------------------------------------------------------------- */
const MODES = [lens, ground, thread];
const TR = .95;

let mode = 0, next = 0, tr = 1, moving = false, swapped = true, queued = -1;

const capEl = document.getElementById('cap');
const capName = document.getElementById('capName');
const capHook = document.getElementById('capHook');
const tagEl = document.getElementById('tag');
const idxEl = document.getElementById('idx');
const bar = document.getElementById('bar');
const tabs = [...document.querySelectorAll('.tab')];

function moveBar(i){
  const b = tabs[i];
  bar.style.width = b.offsetWidth + 'px';
  bar.style.transform = 'translateX(' + b.offsetLeft + 'px)';
}

function applyMode(i){
  const m = MODES[i];
  capName.textContent = m.name;
  capHook.textContent = m.hook;
  tagEl.textContent = m.tag;
  idxEl.textContent = '0' + (i + 1) + ' / 03';
}

function go(i){
  if (moving){
    // клик во время перехода не теряется, встаёт в очередь
    if (i !== next){ queued = i; markTab(i); }
    return;
  }
  if (i === mode) return;
  next = i; tr = 0; moving = true; swapped = false;
  if (i === 2){ thread.out = false; thread.T = 9; thread.hold = 0; }
  capEl.classList.add('is-out');
  markTab(i);
}

function markTab(i){
  tabs.forEach((b, k) => b.classList.toggle('on', k === i));
  moveBar(i);
}

tabs.forEach(b => b.addEventListener('click', () => go(+b.dataset.i)));
addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '3') go(+e.key - 1);
  if (e.key === 'ArrowRight') go((mode + 1) % 3);
  if (e.key === 'ArrowLeft') go((mode + 2) % 3);
});

function fit(){
  const r = stageEl.getBoundingClientRect();
  const w = Math.round(r.width), h = Math.round(r.height);
  if (w < 40 || h < 40 || (w === W && h === H)) return;
  const dpr = Math.min(2, devicePixelRatio || 1);
  W = w; H = h; CY = H / 2;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  lens.fit(); ground.fit(); thread.measure(); moveBar(mode);
}

thread.init();
applyMode(0);
tabs[0].classList.add('on');
new ResizeObserver(fit).observe(stageEl);
fit();

let last = 0;
function frame(now){
  if (!W){ fit(); if (!W) return; }
  const t = now / 1000;
  const dt = Math.min(.05, (now - last) / 1000) || .016;
  last = now;

  ptr.on += (ptr.want - ptr.on) * .07;
  ptr.x += (ptr.tx - ptr.x) * .12;
  ptr.y += (ptr.ty - ptr.y) * .12;

  if (moving){
    tr += dt / TR;
    if (!swapped && tr >= .5){ swapped = true; applyMode(next); }
    if (tr >= 1){
      tr = 1; moving = false; mode = next; capEl.classList.remove('is-out');
      if (queued >= 0){ const q = queued; queued = -1; go(q); }
    }
  }

  const active = moving ? (tr < .5 ? mode : next) : mode;
  const p = moving ? (tr < .5 ? 1 - ease(tr / .5) : ease((tr - .5) / .5)) : 1;

  lens.step(dt, t);
  ground.step(dt, t);
  thread.p = active === 2 ? p : 0;
  if (active === 2 || moving) thread.step(dt);

  ctx.clearRect(0, 0, W, H);
  if (active === 2) thread.draw(p);
  else { thread.hide(); MODES[active].draw(p); }

  if (moving){
    const m = 1 - Math.abs(tr - .5) * 2;
    const a = Math.pow(m, .5);
    const x0 = W * (.5 - .5 * a), x1 = W * (.5 + .5 * a);
    // the thread is slack while it gathers, then pulls taut
    const sag = tr < .5 ? (1 - m) * H * .07 : (1 - m) * H * .012;
    ctx.strokeStyle = rgba(HOT, .2 + .8 * a);
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(x0, CY);
    ctx.quadraticCurveTo(W * .5, CY + sag * 2, x1, CY);
    ctx.stroke();
    ctx.fillStyle = rgba(HOT, a);
    ctx.beginPath(); ctx.arc(W * .5, CY + sag, 1.4 + 2 * a, 0, TAU); ctx.fill();
  }
}

let running = false;
function loop(now){ frame(now); requestAnimationFrame(loop); }
if (!running){ running = true; requestAnimationFrame(loop); }
