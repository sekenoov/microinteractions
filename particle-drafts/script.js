/* PARTICLE DRAFTS. Eight rough loops, one per idea.
   Every sketch draws in a virtual 400 by 500 frame and restarts after `dur`. */

const W = 400, H = 500;
const C = {
  bg: '#121615', card: '#1a1f1d', card2: '#222927',
  line: 'rgba(233,230,217,.12)', ink: '#e9e6d9',
  dim: 'rgba(233,230,217,.56)', faint: 'rgba(233,230,217,.30)',
  hot: '#ff5b34', blue: '#4c8dff', yellow: '#ffd43b', violet: '#b48cff', green: '#3ddc97',
};
const SANS = '-apple-system, "SF Pro Text", Inter, system-ui, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const ease = t => 1 - Math.pow(1 - t, 3);
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const rand = (a, b) => a + Math.random() * (b - a);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
const pick = a => a[Math.random() * a.length | 0];

function rr(ctx, x, y, w, h, r, fill, stroke){
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill){ ctx.fillStyle = fill; ctx.fill(); }
  if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
function txt(ctx, s, x, y, font, color, align){
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

/* Draws into an offscreen frame and returns the opaque pixels as points, with colour. */
function sample(draw, step){
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  draw(x);
  const d = x.getImageData(0, 0, W, H).data, pts = [];
  for (let y = 0; y < H; y += step) for (let i = 0; i < W; i += step){
    const k = (y * W + i) * 4;
    if (d[k + 3] > 110) pts.push({ x: i, y, c: 'rgb(' + d[k] + ',' + d[k + 1] + ',' + d[k + 2] + ')' });
  }
  return pts;
}

/* Column heap: grains fall, topple to a lower neighbour, settle. */
function Heap(x0, x1, floor, cell){
  this.x0 = x0; this.cell = cell; this.floor = floor;
  this.cols = Math.floor((x1 - x0) / cell);
  this.top = new Float32Array(this.cols).fill(floor);
  this.grains = []; this.fall = [];
}
Heap.prototype.col = function(x){ return clamp(Math.floor((x - this.x0) / this.cell), 0, this.cols - 1); };
Heap.prototype.place = function(x, color){
  let c = this.col(x);
  for (let k = 0; k < 60; k++){
    const h = this.top[c], half = this.cell * .5;
    const l = c > 0 && this.top[c - 1] > h + half, r = c < this.cols - 1 && this.top[c + 1] > h + half;
    if (l && r) c += Math.random() < .5 ? -1 : 1; else if (l) c--; else if (r) c++; else break;
  }
  const y = this.top[c] - this.cell;
  this.top[c] = y;
  this.grains.push({ x: this.x0 + c * this.cell, y, c: color });
};
Heap.prototype.drop = function(x, y, color, vx, vy){ this.fall.push({ x, y, vx: vx || 0, vy: vy || 0, c: color }); };
Heap.prototype.step = function(dt){
  const f = this.fall;
  for (let i = f.length - 1; i >= 0; i--){
    const g = f[i];
    g.vy += 1100 * dt; g.x += g.vx * dt; g.y += g.vy * dt;
    if (g.y >= this.top[this.col(g.x)] - this.cell){ this.place(g.x, g.c); f[i] = f[f.length - 1]; f.pop(); }
  }
};
Heap.prototype.draw = function(ctx, alpha){
  const s = this.cell - .7;
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  for (const g of this.grains){ ctx.fillStyle = g.c; ctx.fillRect(g.x, g.y, s, s); }
  for (const g of this.fall){ ctx.fillStyle = g.c; ctx.fillRect(g.x, g.y, s, s); }
  ctx.globalAlpha = 1;
};

function cursor(ctx, x, y, down){
  ctx.save(); ctx.translate(x, y); if (down) ctx.scale(.88, .88);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4.5, 13); ctx.lineTo(7.5, 19.5);
  ctx.lineTo(10, 18.5); ctx.lineTo(7, 12); ctx.lineTo(12.5, 12); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
}

const SKETCHES = {

  /* 01 — a whole paragraph assembles under the typing dots, then collapses into "ok". */
  typing: {
    dur: 8.6,
    init(s){
      const lines = ['honestly I’ve been thinking', 'about what you said and I', 'think you’re right, but I', 'also want to explain why it', 'hurt a little, because the', 'way it came out made me', 'feel like I was the only one'];
      const fz = 15, lh = 20, bottom = 430;
      s.big = { x: 26, y: bottom - (lines.length * lh + 20), w: 262, h: lines.length * lh + 20 };
      s.dots = { x: 26, y: bottom - 38, w: 66, h: 38 };
      s.ok = { x: 26, y: bottom - 38, w: 50, h: 38 };
      const ty = s.big.y + 10 + fz;
      const pts = sample(x => {
        x.font = fz + 'px ' + SANS; x.fillStyle = '#fff';
        lines.forEach((l, i) => x.fillText(l, 40, ty + i * lh));
      }, 2);
      pts.sort((a, b) => (Math.floor((a.y - s.big.y) / lh) * 1e4 + a.x) - (Math.floor((b.y - s.big.y) / lh) * 1e4 + b.x));
      const okPts = sample(x => { x.font = '500 ' + fz + 'px ' + SANS; x.fillStyle = '#fff'; x.fillText('ok', 40, bottom - 14); }, 1);
      s.p = pts.map((p, i) => ({
        x: 52, y: bottom - 19, vx: 0, vy: 0, tx: p.x, ty: p.y,
        ox: okPts[i % okPts.length].x, oy: okPts[i % okPts.length].y,
        born: .9 + 2.7 * i / pts.length, sw: 4.9 + Math.random() * .6, live: false,
      }));
    },
    frame(s, ctx, t, dt){
      txt(ctx, 'Alex', 200, 52, '600 15px ' + SANS, C.ink, 'center');
      txt(ctx, t < 5.6 ? 'typing…' : 'online', 200, 70, '11px ' + SANS, t < 5.6 ? C.hot : C.faint, 'center');
      ctx.fillStyle = C.line; ctx.fillRect(0, 88, W, 1);
      rr(ctx, 218, 112, 156, 36, 18, C.hot);
      txt(ctx, 'so… what do you think?', 296, 135, '13px ' + SANS, '#1a0f0b', 'center');

      let b;
      if (t < .9) b = s.dots;
      else if (t < 4.9){ const k = ease(seg(t, .9, 3.6)); b = { x: 26, y: lerp(s.dots.y, s.big.y, k), w: lerp(s.dots.w, s.big.w, k), h: lerp(s.dots.h, s.big.h, k) }; }
      else { const k = easeIO(seg(t, 4.9, 5.7)); b = { x: 26, y: lerp(s.big.y, s.ok.y, k), w: lerp(s.big.w, s.ok.w, k), h: lerp(s.big.h, s.ok.h, k) }; }
      rr(ctx, b.x, b.y, b.w, b.h, 18, C.card2);

      const da = 1 - seg(t, 3.4, 3.9);
      if (da > 0) for (let i = 0; i < 3; i++){
        const ph = Math.sin(t * 7 - i * .8) * .5 + .5;
        ctx.globalAlpha = da * (.35 + .65 * ph);
        ctx.beginPath(); ctx.arc(46 + i * 13, b.y + b.h - 19 - ph * 2, 4, 0, 7); ctx.fillStyle = C.ink; ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const p of s.p){
        if (t < p.born) continue;
        if (!p.live){ p.live = true; p.vx = rand(-40, 160); p.vy = rand(-260, -40); }
        const gx = t > p.sw ? p.ox : p.tx, gy = t > p.sw ? p.oy : p.ty;
        p.vx += ((gx - p.x) * 140 - p.vx * 15) * dt;
        p.vy += ((gy - p.y) * 140 - p.vy * 15) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.fillStyle = Math.abs(p.vx) + Math.abs(p.vy) > 60 ? C.hot : C.ink;
        ctx.fillRect(p.x, p.y, 1.8, 1.8);
      }
    },
  },

  /* 02 — copied text as coloured grit; match style sieves out everything but the ink. */
  paste: {
    dur: 9,
    init(s){
      s.kinds = [[C.ink, 'text', .42], [C.blue, 'link', .15], [C.yellow, 'highlight', .14], [C.violet, 'Calibri 11', .15], [C.green, '1.15 spacing', .14]];
      s.doc = new Heap(70, 330, 452, 5);
      s.sieve = new Heap(70, 330, 262, 5);
      s.acc = 0;
    },
    kind(s){
      let r = Math.random();
      for (const k of s.kinds){ if ((r -= k[2]) < 0) return k[0]; }
      return C.ink;
    },
    frame(s, ctx, t, dt){
      const second = t > 4.2;
      if (t > 4.0 && !s.reset){ s.reset = true; s.doc = new Heap(70, 330, 452, 5); }

      txt(ctx, second ? '⌘⇧V' : '⌘V', 200, 56, '600 22px ' + SANS, second ? C.hot : C.ink, 'center');
      txt(ctx, second ? 'paste and match style' : 'paste', 200, 76, '11px ' + MONO, C.faint, 'center');
      rr(ctx, 160, 92, 80, 16, 8, C.card2);

      const pouring = (t > .5 && t < 2.9) || (t > 4.5 && t < 6.9);
      if (pouring){
        s.acc += 330 * dt;
        while (s.acc >= 1){
          s.acc--;
          const col = SKETCHES.paste.kind(s);
          const heap = second && col !== C.ink ? s.sieve : s.doc;
          heap.drop(200 + gauss() * 70, 104, col, rand(-15, 15), rand(0, 40));
        }
      }

      if (second){
        const a = seg(t, 4.2, 4.5);
        ctx.globalAlpha = a;
        ctx.strokeStyle = C.dim; ctx.lineWidth = 1;
        for (let x = 66; x < 336; x += 6){ ctx.beginPath(); ctx.moveTo(x, 262); ctx.lineTo(x + 3, 268); ctx.stroke(); }
        ctx.fillStyle = C.dim; ctx.fillRect(62, 262, 276, 1);
        txt(ctx, 'sieve', 344, 268, '9.5px ' + MONO, C.faint);
        ctx.globalAlpha = 1;
      }

      rr(ctx, 64, 300, 272, 156, 3, null, C.line);
      txt(ctx, 'Doc', 72, 316, '9.5px ' + MONO, C.faint);

      s.doc.step(dt); s.sieve.step(dt);
      s.doc.draw(ctx, t > 3.4 && t < 4.0 ? 1 - seg(t, 3.4, 3.9) : 1);
      s.sieve.draw(ctx);

      let x = 34;
      ctx.font = '9.5px ' + MONO;
      for (const k of s.kinds){
        ctx.fillStyle = k[0]; ctx.fillRect(x, 476, 6, 6);
        txt(ctx, k[1], x + 10, 483, '9.5px ' + MONO, C.dim);
        x += 18 + ctx.measureText(k[1]).width;
      }
    },
  },

  /* 03 — 2.4 GB drains through the floor, then the app pours it straight back. */
  cache: {
    dur: 9.2,
    init(s){
      s.total = 1100; s.tones = ['#e9e6d9', '#d8cdb0', '#c7b68c', '#b9a37a'];
      s.heap = new Heap(76, 324, 420, 5);
      for (let i = 0; i < s.total; i++) s.heap.place(200 + gauss() * 90, pick(s.tones));
      s.out = []; s.drained = false; s.refill = null; s.acc = 0;
    },
    frame(s, ctx, t, dt){
      if (t > 1.8 && !s.drained){
        s.drained = true;
        for (const g of s.heap.grains) s.out.push({ x: g.x, y: g.y, vy: 0, d: rand(0, .18) + (420 - g.y) * .0016, c: g.c });
        s.heap.grains = [];
      }
      if (t > 4.6 && !s.refill) s.refill = new Heap(76, 324, 420, 5);
      if (s.refill && t < 7.3){
        s.acc += s.total / 2.6 * dt;
        while (s.acc >= 1 && s.refill.grains.length + s.refill.fall.length < s.total){ s.acc--; s.refill.drop(200 + gauss() * 110, 150, pick(s.tones), rand(-20, 20), 40); }
      }

      txt(ctx, 'Storage', 40, 58, '600 15px ' + SANS, C.ink);
      txt(ctx, 'Cache', 40, 92, '12px ' + SANS, C.dim);

      let left;
      if (!s.drained) left = s.total;
      else if (!s.refill) left = s.out.filter(g => g.y < 420).length;
      else left = s.refill.grains.length;
      const gb = 2.4 * left / s.total;
      const label = gb >= 1 ? gb.toFixed(1) + ' GB' : gb * 1024 >= 1 ? Math.round(gb * 1024) + ' MB' : '0 KB';
      const hotLabel = (t > 3.2 && t < 4.6) || t > 7.4;
      txt(ctx, label, 40, 128, '600 30px ' + SANS, hotLabel ? C.hot : C.ink);
      if (t > 3.2 && t < 4.6) txt(ctx, 'cleared', 40, 148, '11px ' + MONO, C.hot);
      if (t > 4.6 && t < 7.4) txt(ctx, 'opening app…', 40, 148, '11px ' + MONO, C.faint);
      if (t > 7.4) txt(ctx, 'and it’s back', 40, 148, '11px ' + MONO, C.hot);

      const press = t > 1.5 && t < 1.8;
      rr(ctx, 240, 100, 120, 34, 17, press ? C.hot : C.card2);
      txt(ctx, 'Clear cache', 300, 122, '500 13px ' + SANS, press ? '#1a0f0b' : C.ink, 'center');

      ctx.fillStyle = C.line; ctx.fillRect(70, 170, 1, 252); ctx.fillRect(330, 170, 1, 252);
      const open = seg(t, 1.7, 1.9) * (1 - seg(t, 3.6, 3.9));
      ctx.fillStyle = C.dim;
      ctx.fillRect(70, 421, 130 - open * 120, 1.5);
      ctx.fillRect(200 + open * 120, 421, 130 - open * 120, 1.5);

      for (const g of s.out){
        if (t - 1.8 < g.d) { ctx.fillStyle = g.c; ctx.fillRect(g.x, g.y, 4.3, 4.3); continue; }
        g.vy += 1100 * dt; g.y += g.vy * dt;
        if (g.y < H){ ctx.fillStyle = g.c; ctx.fillRect(g.x, g.y, 4.3, 4.3); }
      }
      s.heap.draw(ctx);
      if (s.refill){ s.refill.step(dt); s.refill.draw(ctx); }
    },
  },

  /* 04 — a cannon for drinking water, a single piece for taxes. */
  confetti: {
    dur: 9.4,
    init(s){ s.bits = []; s.fired = [false, false]; },
    burst(s, x, y, n, power){
      const pal = [C.hot, C.yellow, C.blue, C.green, C.violet, C.ink];
      for (let i = 0; i < n; i++) s.bits.push({
        x, y, vx: rand(-1, 1) * 360 * power, vy: -rand(220, 720) * power,
        r: rand(0, 6), vr: rand(-12, 12), f: rand(0, 6), vf: rand(6, 14),
        c: pick(pal), g: 620, drag: 2.2, w: rand(5, 8), h: rand(3, 4.5),
      });
    },
    frame(s, ctx, t, dt){
      txt(ctx, 'Today', 40, 60, '600 15px ' + SANS, C.ink);
      const rows = [['Drink water', '8 glasses', 1.0], ['File taxes', 'due Apr 15 · 3 hrs', 4.8]];
      rows.forEach((r, i) => {
        const y = 110 + i * 84, done = t > r[2];
        rr(ctx, 30, y, 340, 64, 10, C.card);
        ctx.beginPath(); ctx.arc(64, y + 32, 11, 0, 7);
        if (done){ ctx.fillStyle = C.hot; ctx.fill(); }
        else { ctx.strokeStyle = C.dim; ctx.lineWidth = 1.5; ctx.stroke(); }
        if (done){
          ctx.beginPath(); ctx.moveTo(58.5, y + 32); ctx.lineTo(62.5, y + 36); ctx.lineTo(69.5, y + 28);
          ctx.strokeStyle = '#1a0f0b'; ctx.lineWidth = 2; ctx.stroke();
        }
        txt(ctx, r[0], 88, y + 29, '500 14px ' + SANS, done ? C.dim : C.ink);
        txt(ctx, r[1], 88, y + 46, '11px ' + SANS, C.faint);
      });

      if (t > 1.0 && !s.fired[0]){ s.fired[0] = true; SKETCHES.confetti.burst(s, 64, 142, 300, 1); }
      if (t > 4.8 && !s.fired[1]){
        s.fired[1] = true;
        s.bits.push({ x: 64, y: 226, vx: 22, vy: -90, r: 0, vr: 3, f: 0, vf: 5, c: C.yellow, g: 90, drag: 2.6, w: 7, h: 4, sad: true });
      }

      if (t > 1.2) {
        const a = seg(t, 1.2, 1.5) * (1 - seg(t, 4.0, 4.4));
        ctx.globalAlpha = a;
        rr(ctx, 100, 300, 200, 40, 20, C.hot);
        txt(ctx, 'Hydration streak: 1 day!', 200, 325, '600 12.5px ' + SANS, '#1a0f0b', 'center');
        ctx.globalAlpha = 1;
      }
      if (t > 5.4) {
        ctx.globalAlpha = seg(t, 5.4, 5.8);
        txt(ctx, 'ok.', 200, 325, '12px ' + MONO, C.faint, 'center');
        ctx.globalAlpha = 1;
      }

      for (const b of s.bits){
        const k = Math.exp(-b.drag * dt);
        b.vx *= k; b.vy = b.vy * k + b.g * dt;
        if (b.sad) b.vx = Math.sin(t * 2.6) * 28;
        b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt; b.f += b.vf * dt;
        if (b.y > H + 10) continue;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.scale(1, Math.cos(b.f));
        ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      }
    },
  },

  /* 05 — the account blows away as dust and reassembles. */
  delete: {
    dur: 9.4,
    card(ctx){
      rr(ctx, 50, 140, 300, 150, 12, C.card, C.line);
      ctx.beginPath(); ctx.arc(96, 192, 26, 0, 7); ctx.fillStyle = C.hot; ctx.fill();
      txt(ctx, 'D', 96, 200, '600 22px ' + SANS, '#1a0f0b', 'center');
      txt(ctx, 'Dias Sekenov', 136, 188, '600 17px ' + SANS, C.ink);
      txt(ctx, '@sekenoov', 136, 208, '13px ' + SANS, C.dim);
      ctx.fillStyle = C.line; ctx.fillRect(70, 236, 260, 1);
      txt(ctx, 'Joined 2014 · 1,204 posts · 9 drafts', 70, 266, '11.5px ' + SANS, C.dim);
    },
    init(s){
      s.p = sample(x => SKETCHES.delete.card(x), 3).map(p => ({
        hx: p.x, hy: p.y, x: p.x, y: p.y, vx: 0, vy: 0, c: p.c, a: 1,
        d: 1.7 + (p.x - 50) / 300 * 1.1 + rand(0, .25),
        back: 4.6 + (350 - p.x) / 300 * .6 + rand(0, .3),
      }));
    },
    frame(s, ctx, t, dt){
      const whole = t < 1.7 || t > 6.6;
      if (whole) SKETCHES.delete.card(ctx);
      else for (const p of s.p){
        if (t > p.back){
          p.vx += ((p.hx - p.x) * 90 - p.vx * 13) * dt;
          p.vy += ((p.hy - p.y) * 90 - p.vy * 13) * dt;
          p.a = Math.min(1, p.a + dt * 1.6);
        } else if (t > p.d){
          p.vx += (rand(80, 220) + Math.sin(p.y * .05 + t * 3) * 120) * dt;
          p.vy += (rand(-90, 10) + Math.cos(p.x * .04 + t * 2) * 60) * dt;
          p.a = Math.max(0, p.a - dt * .9);
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.a <= .01) continue;
        ctx.globalAlpha = p.a; ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 2.6, 2.6);
      }
      ctx.globalAlpha = 1;

      const press = t > 1.3 && t < 1.7;
      const gone = t > 1.7 && t < 6.6;
      ctx.globalAlpha = gone ? .25 : 1;
      rr(ctx, 110, 330, 180, 38, 19, press ? C.hot : null, C.hot);
      txt(ctx, 'Delete account', 200, 354, '500 13px ' + SANS, press ? '#1a0f0b' : C.hot, 'center');
      ctx.globalAlpha = 1;

      const a = seg(t, 3.0, 3.4) * (1 - seg(t, 4.4, 4.7));
      if (a > 0){ ctx.globalAlpha = a; txt(ctx, 'Account deleted.', 200, 222, '500 15px ' + SANS, C.ink, 'center'); ctx.globalAlpha = 1; }
      if (t > 6.7){
        ctx.globalAlpha = seg(t, 6.7, 7.1);
        txt(ctx, 'Welcome back. We kept everything.', 200, 410, '12px ' + MONO, C.hot, 'center');
        ctx.globalAlpha = 1;
      }
    },
  },

  /* 06 — scroll the terms fast and they crumble onto I agree. */
  terms: {
    dur: 9,
    init(s){
      const words = 'the user agrees that any content may be used licensed shared retained indefinitely by the company its affiliates partners and successors for any purpose including'.split(' ');
      s.lines = [];
      for (let i = 0; i < 30; i++){
        let line = '', n = 6 + (i * 7 % 4);
        for (let k = 0; k < n; k++) line += words[(i * 5 + k * 3) % words.length] + ' ';
        s.lines.push({ s: (i % 6 === 0 ? (i / 6 + 1) + '. ' : '') + line.trim(), y: 140 + i * 14, gone: false });
      }
      s.heap = new Heap(48, 352, 456, 4);
      s.fly = []; s.off = 0;
    },
    frame(s, ctx, t, dt){
      rr(ctx, 36, 66, 328, 400, 10, C.card, C.line);
      txt(ctx, t > 6.6 ? 'Agreed. Thanks for reading.' : 'Terms of Service', 56, 98, '600 14px ' + SANS, t > 6.6 ? C.hot : C.ink);
      const page = Math.min(48, 1 + Math.floor(s.off / 9));
      txt(ctx, 'page ' + page + ' of 48', 344, 98, '10px ' + MONO, C.faint, 'right');

      s.off += (t < .6 ? 10 : 30 + 420 * seg(t, .6, 2.8)) * dt * (t < 4 ? 1 : 0);
      ctx.save(); ctx.beginPath(); ctx.rect(48, 112, 304, 280); ctx.clip();
      ctx.font = '10px ' + SANS;
      for (const l of s.lines){
        if (l.gone) continue;
        const y = l.y - s.off;
        if (y < 124){
          l.gone = true;
          const w = ctx.measureText(l.s).width, n = Math.round(w / 6);
          for (let k = 0; k < n; k++) s.heap.drop(56 + Math.random() * w, y, pick(['#bdb8a9', '#a39e90', '#8b877b']), rand(-25, 25), rand(-30, 30));
          continue;
        }
        txt(ctx, l.s, 56, y, '10px ' + SANS, C.dim);
      }
      ctx.restore();

      const press = t > 6.4 && t < 6.7;
      rr(ctx, 60, 404, 280, 42, 21, press ? '#ff8a6b' : C.hot);
      txt(ctx, 'I agree', 200, 430, '600 14px ' + SANS, '#1a0f0b', 'center');

      s.heap.step(dt);
      let cx = 380, cy = 330;
      if (t > 4.1 && t < 6.3){
        const u = seg(t, 4.2, 6.1);
        cx = lerp(330, 80, u); cy = 418 + Math.sin(u * 22) * 13;
        const gs = s.heap.grains;
        for (let i = gs.length - 1; i >= 0; i--){
          const g = gs[i], dx = g.x - cx, dy = g.y - cy, d = Math.hypot(dx, dy);
          if (d < 22){
            s.fly.push({ x: g.x, y: g.y, vx: dx / (d || 1) * rand(80, 240), vy: -rand(140, 360), c: g.c, a: 1 });
            gs[i] = gs[gs.length - 1]; gs.pop();
          }
        }
      } else if (t >= 6.3){ cx = 200; cy = 424; }
      s.heap.draw(ctx);
      for (const g of s.fly){
        g.vy += 900 * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.a -= dt * 1.2;
        if (g.a <= 0) continue;
        ctx.globalAlpha = g.a; ctx.fillStyle = g.c; ctx.fillRect(g.x, g.y, 3.3, 3.3);
      }
      ctx.globalAlpha = 1;
      if (t > 3.9) cursor(ctx, cx, cy, press);
    },
  },

  /* 07 — hovering old files kicks up dust; the 2019 one is a cloud. */
  dust: {
    dur: 9.4,
    init(s){
      s.rows = [['notes.txt', 'Today, 09:12', 0], ['invoice_oct.pdf', 'Last week', .04], ['thesis_draft_2.docx', 'Mar 2021', .35], ['Final_v7_REALLY_final.docx', 'Feb 2019', 1]];
      s.specks = []; s.air = [];
      s.rows.forEach((r, i) => {
        const y = 128 + i * 54;
        for (let k = 0; k < r[2] * 1100; k++) s.specks.push({ row: i, x: rand(36, 364), y: rand(y + 2, y + 50), s: rand(.8, 2), a: rand(.25, .75) });
      });
      s.path = [[0, 390, 90], [.6, 300, 154], [1.4, 300, 154], [1.9, 280, 208], [2.7, 280, 208], [3.2, 260, 262], [4.0, 260, 262], [4.5, 240, 316], [9.4, 240, 316]];
      s.puffed = false;
    },
    frame(s, ctx, t, dt){
      rr(ctx, 30, 70, 340, 340, 10, C.card, C.line);
      txt(ctx, 'Name', 52, 112, '10px ' + MONO, C.faint);
      txt(ctx, 'Date modified', 348, 112, '10px ' + MONO, C.faint, 'right');

      let k = 0; while (k < s.path.length - 2 && t > s.path[k + 1][0]) k++;
      const a = s.path[k], b = s.path[k + 1], u = easeIO(seg(t, a[0], b[0]));
      const cx = lerp(a[1], b[1], u), cy = lerp(a[2], b[2], u);
      const hover = cy > 128 ? Math.floor((cy - 128) / 54) : -1;

      s.rows.forEach((r, i) => {
        const y = 128 + i * 54;
        ctx.fillStyle = C.line; ctx.fillRect(36, y, 328, 1);
        if (i === hover) rr(ctx, 36, y + 3, 328, 48, 6, 'rgba(255,91,52,.10)');
        rr(ctx, 52, y + 15, 16, 21, 2, null, C.dim);
        txt(ctx, r[0], 80, y + 31, '13px ' + SANS, C.ink);
        txt(ctx, r[1], 348, y + 31, '11px ' + SANS, C.faint, 'right');
      });

      if (hover === 3 && !s.puffed){
        s.puffed = true;
        for (let i = 0; i < 520; i++) s.air.push({ x: cx + gauss() * 90, y: cy + gauss() * 30, vx: gauss() * 70, vy: -rand(10, 90), s: rand(3, 11), a: rand(.08, .22), life: rand(3, 5.5), age: 0 });
      }
      for (let i = s.specks.length - 1; i >= 0; i--){
        const p = s.specks[i];
        const near = p.row === hover && (hover === 3 || Math.abs(p.x - cx) < 70 + (t % 1) * 60);
        if (near && Math.random() < (hover === 3 ? .5 : .08)){
          s.air.push({ x: p.x, y: p.y, vx: (p.x - cx) * .4 + gauss() * 20, vy: -rand(20, 80), s: p.s, a: p.a, life: rand(2, 4), age: 0 });
          s.specks[i] = s.specks[s.specks.length - 1]; s.specks.pop();
          continue;
        }
        ctx.globalAlpha = p.a; ctx.fillStyle = '#b8ab8c'; ctx.fillRect(p.x, p.y, p.s, p.s);
      }
      for (const p of s.air){
        p.age += dt; if (p.age > p.life) continue;
        p.vx += Math.sin(p.y * .03 + t) * 12 * dt; p.vy *= Math.exp(-.6 * dt);
        p.x += p.vx * dt; p.y += p.vy * dt;
        const g = 1 + p.age * .8;
        ctx.globalAlpha = p.a * (1 - p.age / p.life);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * g * .6, 0, 7); ctx.fillStyle = '#b8ab8c'; ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (t > 6.2){
        ctx.globalAlpha = seg(t, 6.2, 6.6);
        txt(ctx, 'last opened: never', 200, 450, '11px ' + MONO, C.hot, 'center');
        ctx.globalAlpha = 1;
      }
      cursor(ctx, cx, cy);
    },
  },

  /* 08 — Wi-Fi as a stream; behind the wall the photo sticks at 97%. */
  wifi: {
    dur: 9.4,
    init(s){ s.p = []; s.acc = 0; s.arr = 0; },
    frame(s, ctx, t, dt){
      const wall = 228;
      const px = lerp(140, 316, easeIO(seg(t, 1.8, 4.4))), py = 250;
      const dist = px - 56;
      const rate = 280 * clamp(Math.exp(-(dist - 84) / 55), 0, 1);

      ctx.fillStyle = 'rgba(233,230,217,.06)'; ctx.fillRect(wall, 110, 16, 290);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      for (let y = 110; y < 400; y += 10){ ctx.beginPath(); ctx.moveTo(wall, y + 10); ctx.lineTo(wall + 16, y); ctx.stroke(); }
      txt(ctx, 'bathroom', 340, 104, '10px ' + MONO, C.faint, 'right');

      rr(ctx, 30, 268, 52, 22, 4, C.card2, C.line);
      ctx.fillStyle = C.dim; ctx.fillRect(40, 244, 2, 24); ctx.fillRect(70, 244, 2, 24);
      ctx.beginPath(); ctx.arc(66, 279, 2.2, 0, 7); ctx.fillStyle = C.green; ctx.fill();
      txt(ctx, 'router', 56, 310, '10px ' + MONO, C.faint, 'center');

      s.acc += rate * dt;
      while (s.acc >= 1){ s.acc--; s.p.push({ x: 60, y: 262 + gauss() * 6, ph: rand(0, 6), dead: 0 }); }
      for (let i = s.p.length - 1; i >= 0; i--){
        const p = s.p[i];
        if (p.dead){
          p.dead += dt;
          if (p.dead > .5){ s.p[i] = s.p[s.p.length - 1]; s.p.pop(); continue; }
          ctx.globalAlpha = 1 - p.dead / .5; ctx.fillStyle = C.blue; ctx.fillRect(p.x, p.y, 2, 2);
          continue;
        }
        const dx = px - p.x, dy = py - p.y, d = Math.hypot(dx, dy);
        const ox = p.x;
        p.x += dx / d * 230 * dt; p.y += dy / d * 230 * dt + Math.sin(p.x * .06 + p.ph) * 22 * dt;
        if (ox < wall && p.x >= wall && Math.random() < .9){ p.dead = .001; continue; }
        if (d < 18){ s.arr++; s.p[i] = s.p[s.p.length - 1]; s.p.pop(); continue; }
        ctx.globalAlpha = 1; ctx.fillStyle = C.blue; ctx.fillRect(p.x, p.y, 2, 2);
      }
      ctx.globalAlpha = 1;

      rr(ctx, px - 36, py - 66, 72, 132, 12, C.card, 'rgba(233,230,217,.3)');
      const bars = rate > 160 ? 4 : rate > 60 ? 3 : rate > 18 ? 2 : 1;
      for (let i = 0; i < 4; i++){
        ctx.fillStyle = i < bars ? C.ink : 'rgba(233,230,217,.18)';
        ctx.fillRect(px - 24 + i * 5, py - 50 - i * 2.5, 3, 4 + i * 2.5);
      }
      const prog = Math.min(.97, s.arr / 560);
      txt(ctx, 'Sending', px, py - 6, '10px ' + SANS, C.dim, 'center');
      txt(ctx, 'photo…', px, py + 7, '10px ' + SANS, C.dim, 'center');
      rr(ctx, px - 24, py + 20, 48, 4, 2, 'rgba(233,230,217,.15)');
      rr(ctx, px - 24, py + 20, 48 * prog, 4, 2, C.blue);
      txt(ctx, Math.round(prog * 100) + '%', px, py + 44, '600 13px ' + SANS, t > 6 ? C.hot : C.ink, 'center');
    },
  },
};

function Panel(cell){
  this.def = SKETCHES[cell.dataset.sketch];
  this.box = cell.querySelector('.panel');
  this.cv = cell.querySelector('canvas');
  this.ctx = this.cv.getContext('2d');
  this.w = 0;
  this.restart();
  this.box.addEventListener('click', () => this.restart());
}
Panel.prototype.restart = function(){ this.t = 0; this.s = {}; this.def.init(this.s); };
Panel.prototype.fit = function(){
  const r = this.box.getBoundingClientRect();
  if (r.width === this.w) return;
  const dpr = Math.min(2, devicePixelRatio || 1);
  this.w = r.width;
  this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
  const k = r.width / W * dpr;
  this.ctx.setTransform(k, 0, 0, k, 0, 0);
};
Panel.prototype.tick = function(dt){
  this.t += dt;
  if (this.t > this.def.dur) this.restart();
  const ctx = this.ctx;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  this.def.frame(this.s, ctx, this.t, dt);
};

const panels = [...document.querySelectorAll('.cell')].map(c => new Panel(c));
let last = performance.now();
function loop(now){
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  for (const p of panels){ p.fit(); p.tick(dt); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
