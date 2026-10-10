(function () {
  const canvas = document.getElementById('iron-canvas');
  const ctx = canvas.getContext('2d');

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;

  let px, py, angle, baseAlpha; // particle arrays
  let count = 0;

  let mouseX = -9999, mouseY = -9999, hasMouse = false;
  let raf = null, running = false;
  let t = 0;

  const POLE_SEP = 30;
  const K = 5200;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const spacing = 7.2;
    const cols = Math.floor(W / spacing);
    const rows = Math.floor(H / spacing);
    count = cols * rows;
    px = new Float32Array(count);
    py = new Float32Array(count);
    angle = new Float32Array(count);
    baseAlpha = new Float32Array(count);

    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const jitterX = (Math.random() - 0.5) * spacing * 0.55;
        const jitterY = (Math.random() - 0.5) * spacing * 0.55;
        px[i] = c * spacing + spacing / 2 + jitterX;
        py[i] = r * spacing + spacing / 2 + jitterY;
        angle[i] = Math.random() * Math.PI;
        baseAlpha[i] = 0.4 + Math.random() * 0.3;
        i++;
      }
    }
  }

  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    hasMouse = true;
  }
  function onLeave() { hasMouse = false; }
  function onTouch(e) {
    if (!e.touches || !e.touches.length) return;
    const t0 = e.touches[0];
    onMove({ clientX: t0.clientX, clientY: t0.clientY });
    e.preventDefault();
  }

  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', onLeave);
  canvas.addEventListener('touchmove', onTouch, { passive: false });
  canvas.addEventListener('touchstart', onTouch, { passive: false });
  canvas.addEventListener('touchend', onLeave);

  function fieldAt(x, y) {
    if (hasMouse) {
      const ax = mouseX, ay = mouseY - POLE_SEP;
      const bx = mouseX, by = mouseY + POLE_SEP;

      let dxA = x - ax, dyA = y - ay;
      let rA = Math.max(Math.sqrt(dxA * dxA + dyA * dyA), 8);
      let fA = K / (rA * rA * rA);

      let dxB = x - bx, dyB = y - by;
      let rB = Math.max(Math.sqrt(dxB * dxB + dyB * dyB), 8);
      let fB = -K / (rB * rB * rB);

      const fx = dxA * fA + dxB * fB;
      const fy = dyA * fA + dyB * fB;
      const mag = Math.sqrt(fx * fx + fy * fy);
      return [fx, fy, mag];
    } else {
      const s1 = Math.sin(x * 0.012 + t * 0.6) * Math.cos(y * 0.01 - t * 0.4);
      const s2 = Math.cos(x * 0.008 - t * 0.3 + y * 0.006);
      const fx = Math.cos(s1 * Math.PI + s2);
      const fy = Math.sin(s1 * Math.PI - s2 * 0.7);
      return [fx, fy, 0.35];
    }
  }

  function step() {
    t += 0.012;
    const rect = { w: W, h: H };

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#08090b';
    ctx.fillRect(0, 0, W, H);

    if (hasMouse) {
      const g = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 120);
      g.addColorStop(0, 'rgba(120,190,255,0.10)');
      g.addColorStop(1, 'rgba(120,190,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 120, 0, Math.PI * 2);
      ctx.fill();
    }

    const TIERS = 5;
    const paths = [];
    const tierStrength = [];
    for (let k = 0; k < TIERS; k++) { paths.push([]); tierStrength.push(0); }

    for (let i = 0; i < count; i++) {
      const x = px[i], y = py[i];
      const [fx, fy, mag] = fieldAt(x, y);
      let target = Math.atan2(fy, fx);

      let cur = angle[i];
      let diff = target - cur;
      diff = ((diff + Math.PI / 2) % Math.PI + Math.PI) % Math.PI - Math.PI / 2;
      cur += diff * 0.16;
      angle[i] = cur;

      const strength = hasMouse ? Math.min(1, mag * 26) : 0.3;
      const len = 3 + strength * 4.2;
      const dx = Math.cos(cur) * len;
      const dy = Math.sin(cur) * len;

      const tier = Math.min(TIERS - 1, Math.floor(strength * TIERS));
      paths[tier].push([x - dx, y - dy, x + dx, y + dy]);
    }

    for (let k = 0; k < TIERS; k++) {
      const segs = paths[k];
      if (!segs.length) continue;
      const p = new Path2D();
      for (let s = 0; s < segs.length; s++) {
        const seg = segs[s];
        p.moveTo(seg[0], seg[1]);
        p.lineTo(seg[2], seg[3]);
      }
      const a = 0.28 + (k / (TIERS - 1)) * 0.62;
      const bright = 170 + Math.round((k / (TIERS - 1)) * 75);
      ctx.strokeStyle = `rgba(${bright},${bright},${bright + 8},${a})`;
      ctx.lineWidth = 1 + (k / (TIERS - 1)) * 0.6;
      ctx.stroke(p);
    }

    ctx.restore();
    if (running) raf = requestAnimationFrame(step);
  }

  function start() {
    if (running) return;
    resize();
    running = true;
    raf = requestAnimationFrame(step);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
  }
  window.addEventListener('resize', () => { if (running) resize(); });

  window.IronFilingsDemo = { start, stop };
})();
