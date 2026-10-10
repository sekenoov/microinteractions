(function () {
  const stage = document.querySelector('.stage--loupe');
  const sceneCanvas = document.getElementById('loupe-scene');
  const sctx = sceneCanvas.getContext('2d');
  const lens = document.getElementById('loupe-lens');
  const glass = document.querySelector('.loupe-glass');
  const glare = document.querySelector('.loupe-glare');
  const lensCanvas = document.getElementById('loupe-canvas');
  const lctx = lensCanvas.getContext('2d');
  const zoomLabel = document.getElementById('loupe-zoom');

  let W = 0, H = 0;
  let sceneImage = null;

  const LENS = 220;
  const BULGE_POWER = 1.55;
  const CHROMA_STRENGTH = 4.5;

  let mag = 2.4;
  const MAG_MIN = 1.5;
  const MAG_MAX = 4.5;

  let mask, dispRX, dispRY, dispGX, dispGY, dispBX, dispBY;
  let lensImageData;
  let dirty = true;

  let mouseX = 0, mouseY = 0, hasMouse = false;
  let lensX = 0, lensY = 0, velX = 0, velY = 0;
  let raf = null, running = false;
  let t = 0;

  function drawScene() {
    sctx.clearRect(0, 0, W, H);
    sctx.fillStyle = '#07070a';
    sctx.fillRect(0, 0, W, H);

    sctx.strokeStyle = 'rgba(255,255,255,0.06)';
    sctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 26) {
      sctx.beginPath(); sctx.moveTo(x, 0); sctx.lineTo(x, H); sctx.stroke();
    }
    for (let y = 0; y <= H; y += 26) {
      sctx.beginPath(); sctx.moveTo(0, y); sctx.lineTo(W, y); sctx.stroke();
    }

    const blobs = [
      [W * 0.24, H * 0.28, 130, '#ff4fd8'],
      [W * 0.76, H * 0.24, 150, '#38e0ff'],
      [W * 0.72, H * 0.78, 140, '#ffb347'],
      [W * 0.22, H * 0.76, 120, '#7c5cff'],
      [W * 0.5, H * 0.5, 90, '#4dffb0'],
    ];
    sctx.globalCompositeOperation = 'lighter';
    for (const [bx, by, r, color] of blobs) {
      const g = sctx.createRadialGradient(bx, by, 0, bx, by, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      sctx.fillStyle = g;
      sctx.beginPath();
      sctx.arc(bx, by, r, 0, Math.PI * 2);
      sctx.fill();
    }
    sctx.globalCompositeOperation = 'source-over';

    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillStyle = '#f4f6f8';
    sctx.font = `800 ${Math.round(W * 0.11)}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
    sctx.fillText('REFRACT', W / 2, H / 2);

    sctx.strokeStyle = 'rgba(244,246,248,0.7)';
    sctx.lineWidth = 2;
    sctx.strokeRect(W * 0.5 - W * 0.11, H * 0.5 - H * 0.20, W * 0.22, H * 0.40);

    const dots = 26;
    for (let i = 0; i < dots; i++) {
      const ang = (i / dots) * Math.PI * 2;
      const r = Math.min(W, H) * 0.42;
      const dx = W / 2 + Math.cos(ang) * r;
      const dy = H / 2 + Math.sin(ang) * r;
      sctx.beginPath();
      sctx.fillStyle = i % 2 === 0 ? '#38e0ff' : '#ff4fd8';
      sctx.arc(dx, dy, 4, 0, Math.PI * 2);
      sctx.fill();
    }

    sceneImage = sctx.getImageData(0, 0, W, H);
  }

  function buildDisplacement() {
    const R = LENS / 2;
    const count = LENS * LENS;
    mask = new Uint8Array(count);
    dispRX = new Float32Array(count); dispRY = new Float32Array(count);
    dispGX = new Float32Array(count); dispGY = new Float32Array(count);
    dispBX = new Float32Array(count); dispBY = new Float32Array(count);

    const srcHalf = R / mag;

    for (let y = 0; y < LENS; y++) {
      const dy = y - R + 0.5;
      for (let x = 0; x < LENS; x++) {
        const dx = x - R + 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const t2 = dist / R;
        const i = y * LENS + x;
        if (t2 > 1) { mask[i] = 0; continue; }
        mask[i] = 1;

        const angle = Math.atan2(dy, dx);
        const s = Math.pow(t2, BULGE_POWER);
        const mag2 = s * srcHalf;
        const baseX = Math.cos(angle) * mag2;
        const baseY = Math.sin(angle) * mag2;
        const chroma = CHROMA_STRENGTH * t2;
        const cx = Math.cos(angle) * chroma;
        const cy = Math.sin(angle) * chroma;

        dispRX[i] = baseX + cx; dispRY[i] = baseY + cy;
        dispGX[i] = baseX; dispGY[i] = baseY;
        dispBX[i] = baseX - cx; dispBY[i] = baseY - cy;
      }
    }
    dirty = false;
  }

  function resize() {
    const rect = sceneCanvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    sceneCanvas.width = W;
    sceneCanvas.height = H;
    lensCanvas.width = LENS;
    lensCanvas.height = LENS;
    lensImageData = lctx.createImageData(LENS, LENS);
    lensX = W / 2; lensY = H / 2;
    drawScene();
    buildDisplacement();
  }

  function onMove(e) {
    const rect = sceneCanvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    hasMouse = true;
  }
  function onTouch(e) {
    if (!e.touches || !e.touches.length) return;
    const t0 = e.touches[0];
    onMove({ clientX: t0.clientX, clientY: t0.clientY });
    e.preventDefault();
  }
  function onWheel(e) {
    e.preventDefault();
    mag = Math.max(MAG_MIN, Math.min(MAG_MAX, mag - e.deltaY * 0.0022));
    zoomLabel.textContent = `${mag.toFixed(1)}×`;
    dirty = true;
  }
  stage.addEventListener('mousemove', onMove);
  stage.addEventListener('touchmove', onTouch, { passive: false });
  stage.addEventListener('touchstart', onTouch, { passive: false });
  stage.addEventListener('wheel', onWheel, { passive: false });

  function renderLens() {
    const data = lensImageData.data;
    const scene = sceneImage.data;
    const sx = lensX, sy = lensY;
    let p = 0;

    for (let i = 0; i < LENS * LENS; i++, p += 4) {
      if (!mask[i]) { data[p + 3] = 0; continue; }

      let rx = (sx + dispRX[i]) | 0, ry = (sy + dispRY[i]) | 0;
      let gx = (sx + dispGX[i]) | 0, gy = (sy + dispGY[i]) | 0;
      let bx = (sx + dispBX[i]) | 0, by = (sy + dispBY[i]) | 0;

      if (rx < 0) rx = 0; else if (rx >= W) rx = W - 1;
      if (ry < 0) ry = 0; else if (ry >= H) ry = H - 1;
      if (gx < 0) gx = 0; else if (gx >= W) gx = W - 1;
      if (gy < 0) gy = 0; else if (gy >= H) gy = H - 1;
      if (bx < 0) bx = 0; else if (bx >= W) bx = W - 1;
      if (by < 0) by = 0; else if (by >= H) by = H - 1;

      data[p] = scene[(ry * W + rx) * 4];
      data[p + 1] = scene[(gy * W + gx) * 4 + 1];
      data[p + 2] = scene[(by * W + bx) * 4 + 2];
      data[p + 3] = 255;
    }
    lctx.putImageData(lensImageData, 0, 0);
  }

  const STIFF = 0.10, DAMP = 0.72;

  function step() {
    t += 0.016;
    if (dirty) buildDisplacement();

    if (hasMouse) {
      velX = (velX + (mouseX - lensX) * STIFF) * DAMP;
      velY = (velY + (mouseY - lensY) * STIFF) * DAMP;
    } else {
      const ox = W / 2 + Math.cos(t * 0.35) * W * 0.16;
      const oy = H / 2 + Math.sin(t * 0.5) * H * 0.14;
      velX = (velX + (ox - lensX) * 0.02) * 0.9;
      velY = (velY + (oy - lensY) * 0.02) * 0.9;
    }
    lensX += velX;
    lensY += velY;

    lens.style.transform = `translate(${lensX}px, ${lensY}px)`;

    const speed = Math.min(30, Math.sqrt(velX * velX + velY * velY));
    const angle = Math.atan2(velY, velX) * (180 / Math.PI);
    if (speed > 0.4) glare.style.setProperty('--glare-angle', `${angle + 90}deg`);

    renderLens();
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
    hasMouse = false;
    if (raf) cancelAnimationFrame(raf);
  }
  window.addEventListener('resize', () => { if (running) resize(); });

  window.LoupeDemo = { start, stop };
})();
