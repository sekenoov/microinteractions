/* Четыре черновика. Общая палитра: кость, графит, вермильон, холодная зелень.
   Каждая штука идёт сама, курсор только вмешивается. */

const C = { bone:'#e8e3d6', bone2:'#dcd6c6', ash:'#a9a394', ink:'#16171a', ink2:'#0c0d0f',
            verm:'#ff4a1c', cold:'#2e7a70' };
const TAU = Math.PI * 2;
const pieces = [];

function mkCanvas(node){
  const ctx = node.getContext('2d');
  const o = { node, ctx, w:0, h:0, dpr:1, px:0, py:0, tx:0, ty:0, on:0, want:0, vis:true };
  const stage = node.parentElement;

  o.fit = () => {
    const r = stage.getBoundingClientRect();
    if (!r.width) return;
    o.dpr = Math.min(2, devicePixelRatio || 1);
    o.w = r.width; o.h = r.height;
    node.width = Math.round(r.width * o.dpr);
    node.height = Math.round(r.height * o.dpr);
    ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
    if (o.onFit) o.onFit();
  };

  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    o.tx = e.clientX - r.left; o.ty = e.clientY - r.top; o.want = 1;
  });
  stage.addEventListener('pointerleave', () => { o.want = 0; });

  new ResizeObserver(() => o.fit()).observe(stage);
  new IntersectionObserver(([e]) => { o.vis = e.isIntersecting; }).observe(stage);
  o.fit();
  return o;
}

/* ------------------------------------------------------------------
   01 ЛИНЗА. Линии идут справа налево. Внутри линзы время тянется,
   отставание накапливается и не исчезает сразу на выходе.
------------------------------------------------------------------ */
(function lens(){
  const node = document.querySelector('[data-c="lens"]');
  const o = mkCanvas(node);
  const SP = 23, SPEED = 32, NY = 40;
  let lines = [];

  o.onFit = () => {
    const n = Math.ceil(o.w / SP) + 3;
    lines = [];
    for (let i = 0; i < n; i++) lines.push({ x: i * SP, lag: new Float32Array(NY) });
  };
  o.onFit();

  let lx = 0, ly = 0, last = 0;

  o.draw = (t) => {
    const dt = Math.min(.05, (t - last) / 1000) || .016; last = t;
    const ctx = o.ctx, W = o.w, H = o.h;
    ctx.clearRect(0, 0, W, H);

    o.on += (o.want - o.on) * .06;
    const dxs = W * .5 + Math.cos(t / 1000 * .33) * W * .27;
    const dys = H * .5 + Math.sin(t / 1000 * .47) * H * .26;
    const gx = o.tx * o.on + dxs * (1 - o.on);
    const gy = o.ty * o.on + dys * (1 - o.on);
    lx += (gx - lx) * .07; ly += (gy - ly) * .07;

    const R = Math.min(W, H) * .30, inv = 1 / (R * R * .62);
    const stepY = H / (NY - 1);

    ctx.strokeStyle = 'rgba(169,163,148,.22)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(lx, ly, R, 0, TAU); ctx.stroke();

    for (const L of lines){
      L.x -= SPEED * dt;
      if (L.x < -SP){ L.x += lines.length * SP; L.lag.fill(0); }

      let hot = 0;
      ctx.beginPath();
      for (let k = 0; k < NY; k++){
        const y = k * stepY;
        const dx = L.x - lx, dy = y - ly;
        const infl = Math.exp(-(dx * dx + dy * dy) * inv);
        L.lag[k] = L.lag[k] * .990 + infl * SPEED * dt * 1.9;
        if (infl > hot) hot = infl;
        const x = L.x + L.lag[k];
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      const heat = Math.max(0, Math.min(1, hot * 1.35 - .10));
      ctx.strokeStyle = heat > .02
        ? 'rgba(255,74,28,' + (.32 + .6 * heat) + ')'
        : 'rgba(22,23,26,.30)';
      ctx.lineWidth = 1 + heat * 1.4;
      ctx.stroke();
    }
  };
  pieces.push(o);
})();

/* ------------------------------------------------------------------
   02 РЕЛЬЕФ. Тепловое поле, изолинии по marching squares.
   Своя точка греет сама, курсор добавляет. Всё остывает в равнину.
------------------------------------------------------------------ */
(function terrain(){
  const node = document.querySelector('[data-c="terrain"]');
  const o = mkCanvas(node);
  const CW = 12;
  let gw = 0, gh = 0, f = null, g = null;

  o.onFit = () => {
    gw = Math.max(8, Math.floor(o.w / CW) + 1);
    gh = Math.max(8, Math.floor(o.h / CW) + 1);
    f = new Float32Array(gw * gh); g = new Float32Array(gw * gh);
  };
  o.onFit();

  const LV = [.09, .19, .31, .45, .61, .79];

  function heat(cx, cy, amt, rad){
    const i0 = Math.max(0, (cx - rad) | 0), i1 = Math.min(gw - 1, (cx + rad) | 0);
    const j0 = Math.max(0, (cy - rad) | 0), j1 = Math.min(gh - 1, (cy + rad) | 0);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++){
      const dx = i - cx, dy = j - cy;
      f[j * gw + i] += amt * Math.exp(-(dx * dx + dy * dy) / (2 * rad * rad * .35));
    }
  }

  function seg(ctx, a, b){ ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }

  o.draw = (t) => {
    const ctx = o.ctx, W = o.w, H = o.h;
    const ts = t / 1000;

    // диффузия и остывание
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++){
      const k = j * gw + i;
      const l = f[i > 0 ? k - 1 : k], r = f[i < gw - 1 ? k + 1 : k];
      const u = f[j > 0 ? k - gw : k], d = f[j < gh - 1 ? k + gw : k];
      g[k] = (f[k] * .62 + (l + r + u + d) * .095) * .9885;
    }
    f.set(g);

    heat(gw * (.5 + .33 * Math.cos(ts * .27)), gh * (.5 + .33 * Math.sin(ts * .41)), .085, 2.6);
    heat(gw * (.5 + .27 * Math.cos(ts * -.19 + 2)), gh * (.5 + .29 * Math.sin(ts * .23 + 1)), .05, 3.4);

    o.on += (o.want - o.on) * .12;
    if (o.on > .01) heat(o.tx / o.w * gw, o.ty / o.h * gh, .16 * o.on, 2.2);

    ctx.clearRect(0, 0, W, H);
    const cw = W / (gw - 1), ch = H / (gh - 1);

    for (let n = 0; n < LV.length; n++){
      const lv = LV[n];
      const top = n / (LV.length - 1);
      ctx.beginPath();
      for (let j = 0; j < gh - 1; j++) for (let i = 0; i < gw - 1; i++){
        const a = f[j * gw + i], b = f[j * gw + i + 1];
        const c = f[(j + 1) * gw + i + 1], d = f[(j + 1) * gw + i];
        const id = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0);
        if (!id || id === 15) continue;
        const x0 = i * cw, y0 = j * ch;
        const T = (p, q) => (lv - p) / ((q - p) || 1e-6);
        const P = {
          t: [x0 + cw * T(a, b), y0],
          r: [x0 + cw,           y0 + ch * T(b, c)],
          b: [x0 + cw * T(d, c), y0 + ch],
          l: [x0,                y0 + ch * T(a, d)]
        };
        switch (id){
          case 1: case 14: seg(ctx, P.l, P.b); break;
          case 2: case 13: seg(ctx, P.b, P.r); break;
          case 3: case 12: seg(ctx, P.l, P.r); break;
          case 4: case 11: seg(ctx, P.t, P.r); break;
          case 6: case 9:  seg(ctx, P.t, P.b); break;
          case 7: case 8:  seg(ctx, P.t, P.l); break;
          case 5:  seg(ctx, P.t, P.l); seg(ctx, P.b, P.r); break;
          case 10: seg(ctx, P.t, P.r); seg(ctx, P.b, P.l); break;
        }
      }
      ctx.strokeStyle = top > .74
        ? 'rgba(255,74,28,' + (.5 + .5 * top) + ')'
        : 'rgba(232,227,214,' + (.30 + .48 * top) + ')';
      ctx.lineWidth = top > .74 ? 1.4 : .95;
      ctx.stroke();
    }

    // редкие отметки высот
    ctx.fillStyle = 'rgba(169,163,148,.55)';
    ctx.font = '9px ui-monospace, Menlo, monospace';
    for (let j = 2; j < gh - 2; j += 7) for (let i = 2; i < gw - 2; i += 11){
      const v = f[j * gw + i];
      if (v < .07) continue;
      ctx.fillText(Math.round(v * 1000).toString(), i * cw + 3, j * ch - 3);
    }
  };
  pieces.push(o);
})();

/* ------------------------------------------------------------------
   03 СТЕНА. Штырьки. С той стороны проходит слово и продавливает их.
   Курсор давит с этой стороны, штырьки уходят внутрь.
------------------------------------------------------------------ */
(function pins(){
  const node = document.querySelector('[data-c="pins"]');
  const o = mkCanvas(node);
  const SP = 11;
  const WORDS = ['ТУТ Я', 'ДЫШИТ', 'ПОЗЖЕ', 'ОТКРОЙ'];
  let gw = 0, gh = 0, h = null, mask = null, mw = 0, wi = -1, cycle = 0;

  const off = document.createElement('canvas');
  const octx = off.getContext('2d', { willReadFrequently: true });

  function bake(){
    wi = (wi + 1) % WORDS.length;
    mw = gw * 3;
    off.width = mw; off.height = gh;
    octx.clearRect(0, 0, mw, gh);
    octx.fillStyle = '#fff';
    octx.textAlign = 'center'; octx.textBaseline = 'middle';
    let size = Math.round(gh * .78);
    octx.font = '700 ' + size + 'px ui-monospace, Menlo, monospace';
    const word = WORDS[wi];
    while (octx.measureText(word).width > gw * .95 && size > 6){
      size -= 1;
      octx.font = '700 ' + size + 'px ui-monospace, Menlo, monospace';
    }
    octx.fillText(word, mw / 2, gh / 2);
    mask = octx.getImageData(0, 0, mw, gh).data;
  }

  o.onFit = () => {
    gw = Math.max(10, Math.floor(o.w / SP));
    gh = Math.max(8, Math.floor(o.h / SP));
    h = new Float32Array(gw * gh);
    bake();
  };
  o.onFit();

  let last = 0;
  o.draw = (t) => {
    const dt = Math.min(.05, (t - last) / 1000) || .016; last = t;
    const ctx = o.ctx, W = o.w, H = o.h;
    ctx.clearRect(0, 0, W, H);

    cycle += dt / 7.4;
    if (cycle >= 1){ cycle = 0; bake(); }
    // слово проходит слева направо, читается только в середине хода
    const u = cycle + .10 * Math.sin(TAU * cycle);
    const px = (u * (mw + gw) - gw) | 0;
    const press = Math.sin(Math.min(1, Math.max(0, (cycle - .12) / .76)) * Math.PI);

    o.on += (o.want - o.on) * .1;
    const cgx = o.tx / o.w * gw, cgy = o.ty / o.h * gh;

    const ox = (W - (gw - 1) * SP) / 2, oy = (H - (gh - 1) * SP) / 2;

    for (let j = 0; j < gh; j++){
      for (let i = 0; i < gw; i++){
        const sx = i + px;
        let target = 0;
        if (sx >= 0 && sx < mw) target = (mask[(j * mw + sx) * 4 + 3] / 255) * press;
        if (o.on > .01){
          const dx = i - cgx, dy = j - cgy;
          target -= .85 * o.on * Math.exp(-(dx * dx + dy * dy) / 18);
        }
        const k = j * gw + i;
        h[k] += (target - h[k]) * .17;

        const v = h[k];
        const x = ox + i * SP, y = oy + j * SP;

        ctx.fillStyle = 'rgba(169,163,148,.16)';
        ctx.fillRect(x - 1, y - 1, 2, 2);

        const rise = v * 10;
        const a = Math.min(1, Math.abs(v));
        if (a < .04) continue;
        const s = 2.2 + 2.8 * a;
        ctx.fillStyle = v > .55
          ? 'rgba(255,74,28,' + (.55 + .45 * a) + ')'
          : (v > 0 ? 'rgba(232,227,214,' + (.2 + .75 * a) + ')'
                   : 'rgba(46,122,112,' + (.25 + .5 * a) + ')');
        ctx.fillRect(x - s / 2, y - rise - s / 2, s, s);
      }
    }
  };
  pieces.push(o);
})();

/* ------------------------------------------------------------------
   04 НИТКА. Абзац распускается в одну нитку и сматывается обратно.
------------------------------------------------------------------ */
(function thread(){
  const box = document.querySelector('[data-t="thread"]');
  const p = box.querySelector('.thread__text');
  const path = box.querySelector('.thread__path');
  const words = p.dataset.text.split(' ');
  let els = [], nat = [], out = false, ph = 0;

  p.innerHTML = words.map(w =>
    '<span class="ws' + (w.indexOf('нитка') === 0 ? ' w--knot' : '') + '">' + w + ' </span>').join('');
  els = [...p.querySelectorAll('.ws')];

  const ruler = document.createElement('span');
  ruler.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0';
  p.appendChild(ruler);
  function exact(txt){
    const cs = getComputedStyle(p);
    ruler.style.font = cs.font;
    ruler.style.letterSpacing = cs.letterSpacing;
    ruler.textContent = txt;
    return ruler.getBoundingClientRect().width;
  }

  function measure(){
    els.forEach(e => { e.classList.remove('w'); e.style.cssText = ''; });
    const cs = getComputedStyle(p);
    const padL = parseFloat(cs.paddingLeft), padT = parseFloat(cs.paddingTop);
    const r0 = p.getBoundingClientRect();
    nat = els.map(e => {
      const r = e.getBoundingClientRect();
      return { x: r.left - r0.left - padL, y: r.top - r0.top - padT,
               w: exact(e.textContent), h: r.height };
    });
    els.forEach((e, i) => {
      e.classList.add('w');
      e.style.left = nat[i].x + 'px';
      e.style.top = nat[i].y + 'px';
    });
    layout();
  }

  function layout(){
    const r = box.getBoundingClientRect();
    if (!r.width || !nat.length) return;
    const cs = getComputedStyle(p);
    const padL = parseFloat(cs.paddingLeft), padT = parseFloat(cs.paddingTop);
    const pr = p.getBoundingClientRect();
    const ox = pr.left - r.left + padL, oy = pr.top - r.top + padT;

    const pad = r.width * .06;
    const total = nat.reduce((s, n) => s + n.w, 0);
    const k = Math.min(.78, (r.width - pad * 2) / (total || 1));
    const cy = r.height * .5, amp = r.height * .17;

    const pts = [];
    let x = pad;
    els.forEach((e, i) => {
      const y = cy + Math.sin(x / r.width * TAU * 1.4 + ph) * amp;
      pts.push([x, y]);
      e.style.transform = out
        ? 'translate(' + (x - ox - nat[i].x) + 'px,' + (y - nat[i].h * k / 2 - oy - nat[i].y) + 'px) scale(' + k + ')'
        : 'translate(0,0) scale(1)';
      e.style.transitionDelay = (out ? i * 26 : (els.length - i) * 20) + 'ms';
      x += nat[i].w * k;
    });
    path.setAttribute('d', pts.map((q, i) =>
      (i ? 'L' : 'M') + (q[0] / r.width * 100).toFixed(2) + ' ' + (q[1] / r.height * 100).toFixed(2)
    ).join(' '));
  }

  box.addEventListener('pointermove', e => {
    if (!out) return;
    const r = box.getBoundingClientRect();
    ph = (e.clientX - r.left) / r.width * TAU;
    layout();
  });

  function cycle(){
    out = !out;
    box.classList.toggle('is-out', out);
    layout();
    setTimeout(cycle, out ? 4200 : 3400);
  }

  new ResizeObserver(() => measure()).observe(box);
  requestAnimationFrame(() => { measure(); setTimeout(cycle, 1800); });
})();

/* ------------------------------------------------------------------ */
const grid = document.getElementById('grid');
grid.addEventListener('click', e => {
  const tile = e.target.closest('.tile');
  if (!tile) return;
  const solo = tile.classList.contains('is-solo');
  [...grid.children].forEach(t => t.classList.remove('is-solo'));
  grid.classList.toggle('is-solo', !solo);
  if (!solo) tile.classList.add('is-solo');
});
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  grid.classList.remove('is-solo');
  [...grid.children].forEach(t => t.classList.remove('is-solo'));
});

document.getElementById('theme').addEventListener('click', () => {
  const r = document.documentElement;
  r.setAttribute('data-inv', r.getAttribute('data-inv') === '1' ? '0' : '1');
});

function frame(t){
  for (const p of pieces) if (p.vis && p.w) p.draw(t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
