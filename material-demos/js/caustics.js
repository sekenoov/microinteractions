(function () {
  const canvas = document.getElementById('caustics-canvas');
  const ctx = canvas.getContext('2d');

  let dpr = 1; // internal buffer is intentionally low-res, upscaled
  let W = 0, H = 0;
  let iw = 0, ih = 0;
  let buf, imgData;

  let mouseX = 0, mouseY = 0, hasMouse = false;
  let boost = 0; // click punch, decays
  let raf = null, running = false;
  let t = 0;

  const TAU = Math.PI * 2;
  const OFFSET = 250;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W);
    canvas.height = Math.round(H);

    const budget = 6400;
    const aspect = H / W;
    iw = Math.round(Math.sqrt(budget / aspect));
    ih = Math.round(iw * aspect);

    buf = document.createElement('canvas');
    buf.width = iw; buf.height = ih;
    imgData = buf.getContext('2d').createImageData(iw, ih);
  }

  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    hasMouse = true;
  }
  function onLeave() { hasMouse = false; }
  function onDown() { boost = 1; }
  function onTouch(e) {
    if (!e.touches || !e.touches.length) return;
    const t0 = e.touches[0];
    onMove({ clientX: t0.clientX, clientY: t0.clientY });
    e.preventDefault();
  }
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', onLeave);
  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('touchmove', onTouch, { passive: false });
  canvas.addEventListener('touchstart', (e) => { onTouch(e); onDown(); }, { passive: false });
  canvas.addEventListener('touchend', onLeave);

  function causticAt(px, py, t, rx, ry, rippleAmt) {
    let px0 = px, py0 = py;
    if (rippleAmt > 0.001) {
      const dx = px - rx, dy = py - ry;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      const wave = Math.sin(dist * 5 - t * 3.4) * Math.exp(-dist * 1.4);
      px0 += (dx / dist) * rippleAmt * wave;
      py0 += (dy / dist) * rippleAmt * wave;
    }

    let ix = px0, iy = py0;
    let c = 0;
    const INTEN = 0.005;
    for (let n = 0; n < 5; n++) {
      const tt = t * (1.0 - 3.5 / (n + 1));
      const nx = px0 + Math.cos(tt - ix) + Math.sin(tt + iy);
      const ny = py0 + Math.sin(tt - iy) + Math.cos(tt + ix);
      ix = nx; iy = ny;
      let dxv = Math.sin(ix + tt) / INTEN;
      let dyv = Math.cos(iy + tt) / INTEN;
      if (Math.abs(dxv) < 1e-4) dxv = 1e-4;
      if (Math.abs(dyv) < 1e-4) dyv = 1e-4;
      const lx = px0 / dxv;
      const ly = py0 / dyv;
      const len = Math.sqrt(lx * lx + ly * ly) || 1e-4;
      c += 1 / len;
    }
    c /= 5;
    c = 1.17 - Math.pow(c, 1.4);
    return Math.pow(Math.abs(c), 8);
  }

  function step() {
    t += 0.008;
    if (boost > 0) boost *= 0.93; else boost = 0;

    let rx = 0, ry = 0;
    const rippleAmt = hasMouse ? (0.5 + boost * 2.2) : 0;
    if (hasMouse) {
      rx = (mouseX / W) * TAU - OFFSET;
      ry = (mouseY / H) * TAU - OFFSET;
    }

    const data = imgData.data;
    let p = 0;
    for (let y = 0; y < ih; y++) {
      const py = (y / ih) * TAU - OFFSET;
      for (let x = 0; x < iw; x++) {
        const px = (x / iw) * TAU - OFFSET;
        const c = causticAt(px, py, t, rx, ry, rippleAmt);
        data[p]     = Math.min(255, Math.max(0, (c + 0.02) * 255));
        data[p + 1] = Math.min(255, Math.max(0, (c + 0.40) * 255));
        data[p + 2] = Math.min(255, Math.max(0, (c + 0.58) * 255));
        data[p + 3] = 255;
        p += 4;
      }
    }
    buf.getContext('2d').putImageData(imgData, 0, 0);

    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.filter = 'blur(1.6px)';
    ctx.drawImage(buf, 0, 0, iw, ih, 0, 0, W, H);
    ctx.filter = 'none';

    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,4,6,0.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

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

  window.CausticsDemo = { start, stop };
})();
