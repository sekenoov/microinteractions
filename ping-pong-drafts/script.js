// Семь черновых сцен про настольный теннис. Логический холст 400 × 500 (4:5).
const W = 400, H = 500;
const FONT = getComputedStyle(document.documentElement).getPropertyValue('--ui');
const MONO = getComputedStyle(document.documentElement).getPropertyValue('--mono');
const C = {};
function readPalette() {
  const s = getComputedStyle(document.documentElement);
  for (const k of ['scene', 'ink', 'sub', 'line', 'ball', 'tableB', 'tableG', 'red', 'rubber', 'pill', 'pillInk', 'card'])
    C[k] = s.getPropertyValue('--' + k).trim();
}
readPalette();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readPalette);

// ───────── помощники ─────────
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const io = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
const oc = u => 1 - Math.pow(1 - u, 3);
const tri = u => { const f = u % 2; return f < 1 ? f : 2 - f; };
const B = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
const dB = (t, a, b) => 3 * a * (1 - t) ** 2 + 6 * (b - a) * t * (1 - t) + 3 * (1 - b) * t * t;
function bez(x1, y1, x2, y2) {
  return p => {
    let t = p;
    for (let i = 0; i < 8; i++) { const d = dB(t, x1, x2); if (Math.abs(d) < 1e-6) break; t -= (B(t, x1, x2) - p) / d; }
    return B(clamp(t), y1, y2);
  };
}
function mixHex(a, b, u) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], u))).join(',')})`;
}
const arc = (x0, y0, x1, y1, h, u) => [lerp(x0, x1, u), lerp(y0, y1, u) - h * 4 * u * (1 - u)];

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function txt(ctx, s, x, y, o = {}) {
  const { size = 13, weight = 500, color = C.ink, align = 'center', mono = false, a = 1 } = o;
  ctx.globalAlpha = a; ctx.font = `${weight} ${size}px ${mono ? MONO : FONT}`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); ctx.globalAlpha = 1;
}
function pill(ctx, x, y, s, o = {}) {
  const { bg = C.pill, fg = C.pillInk, size = 11, a = 1, mono = false } = o;
  ctx.font = `600 ${size}px ${mono ? MONO : FONT}`;
  const w = ctx.measureText(s).width + size * 1.3, h = size * 1.9;
  ctx.globalAlpha = a; ctx.fillStyle = bg; rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y + .5); ctx.globalAlpha = 1;
}
function ball(ctx, x, y, r = 6, a = 1) {
  ctx.globalAlpha = a; ctx.fillStyle = C.ball; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
}
function paddle(ctx, x, y, o = {}) {
  const { rot = 0, sx = 1, s = 1, face = C.red } = o;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * sx, s);
  ctx.fillStyle = '#c8955f'; rr(ctx, -4.5, 16, 9, 24, 3); ctx.fill();
  ctx.fillStyle = face; ctx.beginPath(); ctx.ellipse(0, 0, 19, 21, 0, 0, 7); ctx.fill();
  ctx.restore();
}
function table(ctx, x0, x1, y, col) {
  ctx.globalAlpha = .45; ctx.fillStyle = C.sub;
  ctx.fillRect(x0 + 18, y + 6, 3, 70); ctx.fillRect(x1 - 21, y + 6, 3, 70); ctx.globalAlpha = 1;
  ctx.fillStyle = col; ctx.fillRect(x0, y, x1 - x0, 6);
  const m = (x0 + x1) / 2; ctx.fillStyle = C.ink; ctx.fillRect(m - 1, y - 24, 2, 24); ctx.fillRect(m - 3, y - 26, 6, 3);
}

// ───────── сцены ─────────
const scenes = [

// 1. Робот-пушка из Slack, в конце @channel
{
  slug: 'ping-pong-robot', title: '@channel ball machine',
  caption: 'Slack is a ball machine. You never asked for the drill.',
  loop: 8,
  init() {
    const L = ['quick q', 'ping', 'got a sec?', '?', 'bump', 'thoughts?', '👀', 'any update?', 'quick call?', 'ping', '+1?', '…', 'still on?', 'ping'];
    const shots = []; let s = .4, iv = .9, i = 0;
    while (s < 5.1) { shots.push({ s, l: L[i % L.length] }); s += iv; iv = Math.max(.18, iv * .8); i++; }
    return { shots, spray: null };
  },
  draw(ctx, t, dt, S) {
    const ty = 340, mx = 336, my = 258, nx = mx - 44, ny = my + 14, px = 74, py = 300;
    const fin = t > 5.4;
    table(ctx, 30, 370, ty, C.tableB);

    const n = S.shots.filter(s => s.s < t).length + (fin ? 40 : 0);
    txt(ctx, 'unread', 36, 44, { align: 'left', size: 12, color: C.sub });
    txt(ctx, String(n), 36, 72, { align: 'left', size: 32, weight: 700, color: fin ? C.red : C.ink });

    // пушка
    ctx.fillStyle = C.ink;
    rr(ctx, mx - 4, my + 30, 8, ty - my - 36, 3); ctx.fill();
    rr(ctx, mx - 22, ty - 6, 44, 6, 3); ctx.fill();
    rr(ctx, mx - 22, my, 44, 32, 9); ctx.fill();
    rr(ctx, nx - 2, ny - 7, 26, 14, 6); ctx.fill();
    ctx.globalAlpha = .25; rr(ctx, mx - 28, my - 40, 56, 38, 10); ctx.fill(); ctx.globalAlpha = 1;
    for (let k = 0; k < 6; k++) ball(ctx, mx - 18 + (k % 3) * 18, my - 26 + Math.floor(k / 3) * 14, 6);
    pill(ctx, mx, my - 58, fin ? '@channel' : '#general', { bg: fin ? C.red : C.pill, fg: fin ? '#fff' : C.pillInk, size: 12 });

    let hit = 0;
    for (const sh of S.shots) {
      const u = (t - sh.s) / .55;
      if (u >= 0 && u < 1) { const [x, y] = arc(nx, ny, px + 16, py - 2, 34, u); ball(ctx, x, y); pill(ctx, x, y - 19, sh.l, { size: 10 }); }
      const v = (t - sh.s - .55) / .6;
      if (v >= 0 && v < 1) { const [x, y] = arc(px + 16, py - 2, 240, 150, 50, v); ball(ctx, x, y, 6, 1 - v); pill(ctx, x, y - 19, '👍', { size: 10, a: 1 - v }); }
      const d = t - sh.s - .55; if (Math.abs(d) < .12) hit = Math.max(hit, 1 - Math.abs(d) / .12);
    }

    if (fin && !S.spray) S.spray = Array.from({ length: 40 }, () => ({ x: nx, y: ny, vx: -(140 + Math.random() * 300), vy: -(Math.random() * 320 - 60) }));
    const shake = fin ? Math.sin(t * 60) * 3 * clamp(1 - (t - 5.4)) : 0;
    paddle(ctx, px + shake, py, { rot: -.35 + hit * .7 });
    txt(ctx, 'you', px, py + 60, { size: 12, color: C.sub });

    if (S.spray) for (const b of S.spray) {
      b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.vy > 0 && b.y > ty - 6 && b.y < ty + 6 && b.x > 30 && b.x < 370) { b.y = ty - 6; b.vy *= -.5; b.vx *= .85; }
      if (b.y > 476) { b.y = 476; b.vy *= -.45; b.vx *= .8; }
      ball(ctx, b.x, b.y);
    }
  }
},

// 2. Вращение как easing: стробоскоп кадров, как spacing chart у аниматоров
{
  slug: 'spin-easing-curves', title: 'Spin is easing',
  caption: 'Every rally is a list of easing curves. Linear is the one that goes out.',
  loop: 7.8,
  draw(ctx, t) {
    const modes = [
      { name: 'topspin', e: 'ease-in', b: [.55, 0, 1, 1], land: 300, h: 60 },
      { name: 'backspin', e: 'ease-out', b: [0, 0, .45, 1], land: 255, h: 80 },
      { name: 'no spin', e: 'linear', b: [0, 0, 1, 1], land: 398, h: 50, out: true },
    ];
    const i = Math.min(2, Math.floor(t / 2.6)), m = modes[i], tau = t - i * 2.6;
    const f = bez(...m.b), p = clamp((tau - .3) / 1.3);
    const ty = 400, x0 = 62, y0 = 312;

    // редактор кривой
    const ex = 36, ey = 44, es = 130;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(ex, ey, es, es);
    const P = (u, v) => [ex + u * es, ey + es - v * es];
    ctx.strokeStyle = C.sub; ctx.beginPath(); ctx.moveTo(...P(0, 0)); ctx.lineTo(...P(m.b[0], m.b[1])); ctx.moveTo(...P(1, 1)); ctx.lineTo(...P(m.b[2], m.b[3])); ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let k = 0; k <= 40; k++) { const s = k / 40; const [x, y] = P(B(s, m.b[0], m.b[2]), B(s, m.b[1], m.b[3])); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = C.sub; for (const [u, v] of [[m.b[0], m.b[1]], [m.b[2], m.b[3]]]) { ctx.beginPath(); ctx.arc(...P(u, v), 4, 0, 7); ctx.fill(); }
    ball(ctx, ...P(p, f(p)), 5);

    txt(ctx, m.name, 190, 70, { align: 'left', size: 26, weight: 700 });
    txt(ctx, m.e, 190, 100, { align: 'left', size: 15, color: C.sub });
    txt(ctx, `cubic-bezier(${m.b.join(', ')})`, 190, 160, { align: 'left', size: 10.5, mono: true, color: C.sub });

    table(ctx, 40, 370, ty, C.tableB);
    paddle(ctx, 48, y0 + 4, { rot: -.3 + (tau > .25 && tau < .4 ? .5 : 0), s: .9 });

    const pos = q => {
      const x = lerp(x0, m.land, q);
      let y = lerp(y0, ty - 6, q) - m.h * 4 * q * (1 - q);
      if (m.out && x > 370) y += (x - 370) * 2.2;
      return [x, y];
    };
    // стробоскоп: шарик каждые 1/12 длительности
    for (let k = 0; k <= 12; k++) { const q = k / 12; if (q > p) break; ball(ctx, ...pos(f(q)), 6, .22); }
    if (tau > .3) ball(ctx, ...pos(f(p)));
    if (p >= 1) pill(ctx, Math.min(m.land, 360), ty - 40, m.out ? 'OUT' : 'IN', { bg: m.out ? C.red : C.pill, fg: m.out ? '#fff' : C.pillInk, size: 12 });
    txt(ctx, 'one dot = one frame', 200, 470, { size: 11, color: C.sub });
  }
},

// 3. Ракетка вместо переключателя темы
{
  slug: 'twiddle-theme-toggle', title: 'Twiddle to switch theme',
  caption: 'Players flip the bat between red and black. Your theme toggle could too.',
  loop: 8,
  draw(ctx, t) {
    const L = { bg: '#f3f1ec', ink: '#151515', bar: '#dcd8d0', face: '#e5372c', label: 'Light' };
    const D = { bg: '#141413', ink: '#f1efe9', bar: '#2f2d2a', face: '#1b1b1d', label: 'Dark' };
    const ev = [1.2, 2.8, 4.4, 6.3];
    const themes = [L, D, L, D];
    const n = ev.filter(e => t >= e).length;
    const cur = n ? themes[n - 1] : D, prev = n > 1 ? themes[n - 2] : D;
    const auto = t > 5.5;
    const cx = 200, cy = 290;

    const ui = th => {
      ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
      txt(ctx, 'Appearance', 36, 56, { align: 'left', size: 22, weight: 700, color: th.ink });
      ctx.fillStyle = th.bar;
      for (let k = 0; k < 3; k++) { rr(ctx, 36, 90 + k * 18, 328 - k * 70, 8, 4); ctx.fill(); }
      txt(ctx, 'Theme', 36, 430, { align: 'left', size: 15, weight: 600, color: th.ink });
      const lab = th === D && n === 4 ? 'Auto · 18:47' : (auto && n === 3 ? 'Auto · 18:46' : th.label);
      txt(ctx, lab, 364, 430, { align: 'right', size: 15, color: th.ink, mono: lab.startsWith('Auto') });
      ctx.fillStyle = th.bar; ctx.fillRect(36, 452, 328, 1);
    };
    const since = n ? t - ev[n - 1] : 9;
    if (since < .7) {
      ui(prev);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, oc(since / .7) * 560, 0, 7); ctx.clip(); ui(cur); ctx.restore();
    } else ui(cur);

    // ракетка: переворот вокруг вертикальной оси
    const fp = since < .32 ? since / .32 : 1;
    const sx = Math.abs(Math.cos(Math.PI * fp)) || .02;
    const face = fp < .5 ? prev.face : cur.face;
    paddle(ctx, cx, cy, { s: 2.4, sx, face, rot: since < .32 ? -.15 * Math.sin(Math.PI * fp) : 0 });
    if (face === D.face) { ctx.strokeStyle = '#3a3936'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, cy, 19 * 2.4 * sx, 21 * 2.4, 0, 0, 7); ctx.stroke(); }

    if (auto) pill(ctx, cx, cy - 78, n === 4 ? 'Auto · sunset' : 'Auto', { size: 12 });

    // мяч прилетает и улетает (в Auto мяча нет)
    for (const e of ev.slice(0, 3)) {
      const a = (t - (e - .5)) / .5, b = (t - e) / .5;
      if (a >= 0 && a < 1) ball(ctx, ...arc(430, 150, cx + 10, cy - 10, 60, a), 7);
      if (b >= 0 && b < 1) ball(ctx, ...arc(cx + 10, cy - 10, -30, 170, 80, b), 7);
    }
  }
},

// 4. Дизайн-ревью, которое навсегда застряло на деусе
{
  slug: 'deuce-design-review', title: 'Design review at deuce',
  caption: 'Design review is permanently at deuce.',
  loop: 9.5,
  init() {
    const asks = ['logo bigger', 'more pop', 'try blue?', 'bigger', 'make it pop', 'what if purple', 'more white space', 'less white space', 'bigger', 'feels off', 'try serif?', 'bigger'];
    const xs = []; let s = .5, d = .75, v = 2, a = 0;
    for (let i = 0; s < 7.3; i++) {
      const dir = i % 2 ? -1 : 1;
      xs.push({ s, d, dir, l: dir > 0 ? `v${v++}` : asks[a++ % asks.length] });
      s += d; d = Math.max(.3, d * .9);
    }
    if (xs[xs.length - 1].dir < 0) xs.pop();
    const last = xs[xs.length - 1];
    xs.push({ s: last.s + last.d, d: .7, dir: -1, l: 'can we go back to v1?', edge: true });
    return { xs };
  },
  draw(ctx, t, dt, S) {
    const ty = 370, lx = 70, rx = 330, py = 300;
    table(ctx, 40, 360, ty, C.tableB);

    let dz = 10, st = 10, lastChange = -9, reset = false;
    for (const x of S.xs) {
      const end = x.s + x.d;
      if (x.edge) { if (t > end) { reset = true; lastChange = Math.max(lastChange, end); } continue; }
      if (t > end) { x.dir > 0 ? dz++ : st++; lastChange = end; }
    }
    if (reset) { dz = 0; st = 0; }

    // табло
    const card = (x, val, label) => {
      const fl = clamp((t - lastChange) / .18), sy = fl < 1 ? Math.abs(Math.cos(Math.PI * fl)) : 1;
      ctx.save(); ctx.translate(x, 110); ctx.scale(1, Math.max(.05, sy));
      ctx.fillStyle = C.pill; rr(ctx, -46, -52, 92, 104, 10); ctx.fill();
      txt(ctx, String(val), 0, 3, { size: 54, weight: 700, color: C.pillInk, mono: true });
      ctx.fillStyle = C.scene; ctx.fillRect(-46, -1, 92, 2);
      ctx.restore();
      txt(ctx, label, x, 182, { size: 12, color: C.sub });
    };
    card(140, dz, 'Designer'); card(260, st, 'Stakeholder');
    if (dz === st && !reset) pill(ctx, 200, 210, 'DEUCE', { size: 10, bg: C.red, fg: '#fff' });
    if (reset && t > lastChange + .3) pill(ctx, 200, 210, 'edge ball · start over', { size: 10, bg: C.red, fg: '#fff' });

    let hitL = 0, hitR = 0;
    for (const x of S.xs) {
      const u = (t - x.s) / x.d;
      if (x.edge && u >= 1) {
        const k = t - x.s - x.d; ball(ctx, 40 - k * 60, ty + k * k * 900);
        continue;
      }
      if (u < 0 || u >= 1) continue;
      const [a, b] = x.dir > 0 ? [lx + 14, rx - 14] : [rx - 14, x.edge ? 42 : lx + 14];
      const [bx, by] = arc(a, py - 4, b, x.edge ? ty - 4 : py - 4, 60, u);
      ball(ctx, bx, by);
      pill(ctx, bx, by - 20, x.l, { size: 10 });
      if (u < .12) x.dir > 0 ? (hitL = 1 - u / .12) : (hitR = 1 - u / .12);
    }
    paddle(ctx, lx, py, { rot: -.35 + hitL * .6, s: .9 });
    paddle(ctx, rx, py, { rot: .35 - hitR * .6, s: .9, face: C.rubber });
  }
},

// 5. Пинг буквально: чем выше ms, тем дёрганей мяч
{
  slug: 'ping-ms-lag', title: 'Ping 12 ms vs 900 ms',
  caption: 'Ping 12 ms vs ping 900 ms.',
  loop: 8.5,
  init() { return { frozen: null }; },
  draw(ctx, t, dt, S) {
    const ping = t < 2.2 ? 12 : 12 + 888 * clamp((t - 2.2) / 3.8) ** 2;
    const lost = t > 6.3;
    const tile = (x, name, initial, dim) => {
      ctx.fillStyle = C.card; rr(ctx, x, 40, 170, 140, 14); ctx.fill();
      ctx.strokeStyle = C.line; ctx.stroke();
      ctx.globalAlpha = dim ? .35 : 1;
      ctx.fillStyle = C.sub; ctx.beginPath(); ctx.arc(x + 85, 102, 30, 0, 7); ctx.fill();
      txt(ctx, initial, x + 85, 103, { size: 22, weight: 700, color: C.card });
      ctx.globalAlpha = 1;
      txt(ctx, name, x + 14, 164, { align: 'left', size: 12, weight: 600 });
    };
    tile(24, 'You', 'Y', lost); tile(206, 'Sam', 'S', false);
    if (lost) { txt(ctx, 'Reconnecting…', 109, 102, { size: 13, weight: 600 }); pill(ctx, 291, 66, '11 : 0', { size: 11, mono: true }); txt(ctx, '🎉', 291, 102, { size: 26 }); }

    const col = ping < 100 ? '#2fae5b' : ping < 400 ? '#f0a020' : C.red;
    pill(ctx, 200, 214, `ping ${Math.round(ping)} ms`, { bg: col, fg: '#fff', size: 12, mono: true });

    const ty = 400, lx = 64, rx = 336, py = 330;
    table(ctx, 40, 360, ty, C.tableB);

    let tq = t;
    const step = ping > 40 ? ping / 1000 * .9 : 0;
    if (step) tq = Math.floor(t / step) * step;
    if (ping > 350 && (t * 1.7) % 1 < .15) tq -= .35;
    if (lost) { if (S.frozen == null) S.frozen = tq; tq = S.frozen; }

    const ph = tq / .62, k = Math.floor(ph), u = ph - k;
    const [a, b] = k % 2 ? [rx - 14, lx + 14] : [lx + 14, rx - 14];
    ball(ctx, ...arc(a, py - 4, b, py - 4, 60, u));
    const hit = u < .1 ? 1 - u / .1 : 0;
    paddle(ctx, lx, py, { rot: -.35 + (k % 2 ? 0 : hit * .6), s: .9 });
    paddle(ctx, rx, py, { rot: .35 - (k % 2 ? hit * .6 : 0), s: .9, face: C.rubber });

    if (lost) {
      ctx.fillStyle = C.pill; rr(ctx, 80, 250, 240, 40, 12); ctx.fill();
      txt(ctx, 'Your connection is unstable', 200, 270, { size: 13, weight: 600, color: C.pillInk });
    }
  }
},

// 6. Бесконечная полоса загрузки всё время играла в пинг-понг
{
  slug: 'indeterminate-rally', title: 'Indeterminate rally',
  caption: 'Indeterminate progress bars have been playing ping-pong this whole time.',
  loop: 7.5,
  init() { return { fly: null }; },
  draw(ctx, t, dt, S) {
    const bx0 = 84, bx1 = 316, by = 262;
    const failed = t > 5.7;

    ctx.fillStyle = C.card; rr(ctx, 50, 160, 300, 190, 18); ctx.fill(); ctx.strokeStyle = C.line; ctx.stroke();
    const fa = clamp((t - 5.7) / .25);
    txt(ctx, 'Uploading 3 files', 80, 200, { align: 'left', size: 16, weight: 700, a: 1 - fa });
    txt(ctx, 'design-final-v3.fig', 80, 222, { align: 'left', size: 12, color: C.sub, a: 1 - fa });
    txt(ctx, 'Something went wrong', 80, 200, { align: 'left', size: 16, weight: 700, a: fa });
    txt(ctx, 'Upload failed. Please try again.', 80, 222, { align: 'left', size: 12, color: C.sub, a: fa });
    ctx.fillStyle = failed ? 'rgba(229,55,44,.25)' : C.line; rr(ctx, bx0, by - 3, bx1 - bx0, 6, 3); ctx.fill();
    if (failed) { pill(ctx, 290, 318, 'Try again', { size: 12, a: fa }); }

    // ракетки появляются со второй секунды
    const pa = clamp((t - 2) / .4) * (failed ? 1 - fa : 1);
    const crosses = [.8, .6, .5, .42, .36, .3];
    let x = null, w = 70, hitL = 0, hitR = 0;
    if (t < 2) { w = 70; x = bx0 + w / 2 + io(tri(t)) * (bx1 - bx0 - w); }
    else {
      w = lerp(70, 10, clamp((t - 2) / .4));
      let s = 2;
      for (let i = 0; i < crosses.length; i++) {
        const d = crosses[i];
        if (t < s + d) { const u = (t - s) / d; x = i % 2 ? lerp(bx1 - 5, bx0 + 5, u) : lerp(bx0 + 5, bx1 - 5, u); if (u < .15) i % 2 ? (hitR = 1) : (hitL = 1); break; }
        s += d;
      }
      // последняя подача уходит мимо правой ракетки
      if (x == null) {
        const k = t - s;
        if (k < .26) { x = lerp(bx0 + 5, bx1 - 5, k / .26); if (k < .04) hitL = 1; }
        else {
          if (!S.fly) S.fly = { x: bx1 - 5, y: by, vx: 360, vy: -140 };
          const f = S.fly; f.vy += 1100 * dt; f.x += f.vx * dt; f.y += f.vy * dt;
          if (f.y > 470) { f.y = 470; f.vy *= -.5; f.vx *= .92; }
          ball(ctx, f.x, f.y, 5);
        }
      }
    }
    if (x != null) {
      if (w > 12) { ctx.fillStyle = C.ink; rr(ctx, x - w / 2, by - 3, w, 6, 3); ctx.fill(); }
      else ball(ctx, x, by, 5);
    }
    ctx.globalAlpha = pa; ctx.fillStyle = C.ink;
    ctx.save(); ctx.translate(bx0 - 6, by); ctx.rotate(-hitL * .4); rr(ctx, -2, -12, 4, 24, 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(bx1 + 6, by); ctx.rotate(hitR * .4); rr(ctx, -2, -12, 4, 24, 2); ctx.fill(); ctx.restore();
    ctx.globalAlpha = 1;
  }
},

// 7. 38 → 40 мм: мяч сделали заметнее ради ТВ
{
  slug: '40mm-legibility', title: '2 mm for legibility',
  caption: 'In 2000 table tennis made the ball 2 mm bigger. For legibility.',
  loop: 9.5,
  init() { return { phi: 0 }; },
  draw(ctx, t, dt, S) {
    const u = io(clamp((t - 3.2) / 1));
    const r = lerp(4, 7, u), cross = lerp(.3, .75, u);
    S.phi += dt / cross;
    const green = '#2f7a4f', blue = '#2a5fa8';
    const tc = mixHex(green, blue, io(clamp((t - 5) / .8)));

    // ТВ-рамка
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; rr(ctx, 24, 40, 352, 280, 18); ctx.stroke(); ctx.lineWidth = 1;
    pill(ctx, 62, 66, 'LIVE', { bg: C.red, fg: '#fff', size: 10 });
    pill(ctx, 330, 66, t > 6.5 ? 'to 11' : 'to 21', { size: 10, mono: true });

    const ty = 262, lx = 76, rx = 324, py = 210;
    ctx.save(); rr(ctx, 26, 42, 348, 276, 16); ctx.clip();
    table(ctx, 52, 348, ty, tc);
    const k = Math.floor(S.phi), v = S.phi - k;
    const [a, b] = k % 2 ? [rx - 12, lx + 12] : [lx + 12, rx - 12];
    // смаз у маленького быстрого мяча
    const blur = 1 - u;
    for (let g = 5; g >= 1; g--) {
      const vv = v - g * .05 * blur; if (vv < 0) continue;
      ball(ctx, ...arc(a, py, b, py, 46, vv), r, .12 * blur);
    }
    ball(ctx, ...arc(a, py, b, py, 46, v), r, lerp(.55, 1, u));
    const hit = v < .1 ? 1 - v / .1 : 0;
    paddle(ctx, lx, py + 4, { rot: -.35 + (k % 2 ? 0 : hit * .5), s: .7 });
    paddle(ctx, rx, py + 4, { rot: .35 - (k % 2 ? hit * .5 : 0), s: .7, face: C.rubber });
    ctx.restore();

    // слайдер
    const sx0 = 80, sx1 = 320, sy = 400;
    ctx.fillStyle = C.line; rr(ctx, sx0, sy - 2, sx1 - sx0, 4, 2); ctx.fill();
    ctx.fillStyle = C.ink; rr(ctx, sx0, sy - 2, (sx1 - sx0) * u, 4, 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(lerp(sx0, sx1, u), sy, 9, 0, 7); ctx.fill();
    txt(ctx, '38 mm', sx0, sy + 26, { size: 11, mono: true, color: C.sub });
    txt(ctx, '40 mm', sx1, sy + 26, { size: 11, mono: true, color: C.sub });

    const line = t < 3.2 ? ['1999', 'hard to follow on TV'] : t < 6.5 ? ['2000', 'bigger, slower, readable'] : ['2001', 'and games go to 11'];
    txt(ctx, line[0], 200, 352, { size: 22, weight: 700, mono: true });
    txt(ctx, line[1], 200, 460, { size: 13, color: C.sub });
  }
},
];

// ───────── сборка страницы ─────────
const grid = document.getElementById('grid');
const items = scenes.map((sc, i) => {
  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `<canvas></canvas><div class="meta"><div class="num">${String(i + 1).padStart(2, '0')} · ${sc.slug}</div><div class="title">${sc.title}</div><div class="cap">“${sc.caption}”</div></div>`;
  grid.appendChild(card);
  const cv = card.querySelector('canvas');
  const it = { sc, card, cv, ctx: cv.getContext('2d'), start: performance.now(), prevT: 1e9, state: null };
  card.addEventListener('click', () => { if (!document.body.classList.contains('single')) open(i); });
  return it;
});

function size() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  for (const it of items) {
    const w = it.cv.clientWidth || 300;
    it.cv.width = Math.round(w * dpr); it.cv.height = Math.round(w * 1.25 * dpr);
  }
}
addEventListener('resize', size);

let single = -1;
function open(i) {
  single = i;
  document.body.classList.toggle('single', i >= 0);
  items.forEach((it, k) => { it.card.classList.toggle('on', k === i); it.start = performance.now(); });
  const q = new URLSearchParams(location.search);
  i >= 0 ? q.set('d', scenes[i].slug) : q.delete('d');
  history.replaceState(null, '', q.toString() ? '?' + q : location.pathname);
  requestAnimationFrame(size);
}
addEventListener('keydown', e => {
  if (single < 0) return;
  if (e.key === 'Escape') open(-1);
  if (e.key === 'ArrowRight') open((single + 1) % scenes.length);
  if (e.key === 'ArrowLeft') open((single + scenes.length - 1) % scenes.length);
  if (e.key === ' ') { e.preventDefault(); items[single].start = performance.now(); }
});

const q = new URLSearchParams(location.search);
if (q.get('theme')) document.documentElement.dataset.theme = q.get('theme'), readPalette();
const d = scenes.findIndex(s => s.slug === q.get('d') || String(scenes.indexOf(s) + 1) === q.get('d'));
open(d);

function render(it, t, dt) {
  if (t < it.prevT || !it.state) it.state = it.sc.init ? it.sc.init() : {};
  it.prevT = t;
  const { ctx, cv } = it, k = cv.width / W;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = C.scene; ctx.fillRect(0, 0, W, H);
  it.sc.draw(ctx, t, dt, it.state);
}

// ?d=slug&t=6.2 прокручивает сцену до нужной секунды и замирает (для обложек)
const still = parseFloat(q.get('t'));
if (single >= 0 && !isNaN(still)) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (let t = 0; t <= still; t += 1 / 60) render(items[single], t, 1 / 60);
  }));
} else {
  let last = performance.now();
  const frame = now => {
    const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
    for (const it of items) {
      if (single >= 0 && it !== items[single]) continue;
      render(it, ((now - it.start) / 1000) % it.sc.loop, dt);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
