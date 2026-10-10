(function () {
  const canvas = document.getElementById('metal-canvas');
  const ctx = canvas.getContext('2d');
  const input = document.getElementById('metal-input');
  const gooBlur = document.querySelector('#goo feGaussianBlur');

  let currentWord = (input && input.value) || 'FLOW';

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;

  let baseX, baseY, curX, curY, velX, velY, phase, radius;
  let n = 0;

  let mouseX = -9999, mouseY = -9999, hasMouse = false;
  let raf = null, running = false;
  let t = 0;

  function samplePoints(word) {
    const off = document.createElement('canvas');
    off.width = Math.round(W);
    off.height = Math.round(H);
    const octx = off.getContext('2d');
    octx.clearRect(0, 0, off.width, off.height);
    octx.fillStyle = '#fff';
    let fontSize = Math.round(W * 0.20);
    octx.font = `800 ${fontSize}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';

    while (octx.measureText(word).width > W * 0.78 && fontSize > 14) {
      fontSize -= 3;
      octx.font = `800 ${fontSize}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
    }
    octx.fillText(word, off.width / 2, off.height / 2);

    const data = octx.getImageData(0, 0, off.width, off.height).data;
    const spacing = Math.max(2.6, Math.min(7.2, fontSize * 0.042));
    const pts = [];
    for (let y = 0; y < off.height; y += spacing) {
      for (let x = 0; x < off.width; x += spacing) {
        const idx = (Math.round(y) * off.width + Math.round(x)) * 4 + 3;
        if (data[idx] > 140) {
          const jx = (Math.random() - 0.5) * spacing * 0.5;
          const jy = (Math.random() - 0.5) * spacing * 0.5;
          pts.push([x + jx, y + jy]);
        }
      }
    }
    const radiusBase = Math.max(2.0, Math.min(6.2, fontSize * 0.046));
    return { pts, radiusBase };
  }

  function applyWord(word, morph) {
    const { pts, radiusBase } = samplePoints(word);
    if (gooBlur) gooBlur.setAttribute('stdDeviation', Math.max(1.2, radiusBase * 0.55).toFixed(2));
    const newN = pts.length;
    const newBaseX = new Float32Array(newN);
    const newBaseY = new Float32Array(newN);
    const newCurX = new Float32Array(newN);
    const newCurY = new Float32Array(newN);
    const newVelX = new Float32Array(newN);
    const newVelY = new Float32Array(newN);
    const newPhase = new Float32Array(newN);
    const newRadius = new Float32Array(newN);

    let oldOrder = null;
    if (morph && n > 0) {
      oldOrder = new Array(n);
      for (let i = 0; i < n; i++) oldOrder[i] = i;
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = oldOrder[i]; oldOrder[i] = oldOrder[j]; oldOrder[j] = tmp;
      }
    }

    for (let i = 0; i < newN; i++) {
      newBaseX[i] = pts[i][0];
      newBaseY[i] = pts[i][1];
      if (morph && oldOrder) {
        const oi = oldOrder[i % n];
        newCurX[i] = curX[oi];
        newCurY[i] = curY[oi];
        newVelX[i] = velX[oi] * 0.7;
        newVelY[i] = velY[oi] * 0.7;
      } else {
        newCurX[i] = pts[i][0];
        newCurY[i] = pts[i][1];
      }
      newPhase[i] = Math.random() * Math.PI * 2;
      newRadius[i] = radiusBase + Math.random() * (radiusBase * 0.4);
    }

    n = newN;
    baseX = newBaseX; baseY = newBaseY;
    curX = newCurX; curY = newCurY;
    velX = newVelX; velY = newVelY;
    phase = newPhase; radius = newRadius;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    applyWord(currentWord, false);
  }

  if (input) {
    input.addEventListener('input', () => {
      const val = (input.value || '').toUpperCase().trim();
      currentWord = val || 'FLOW';
      if (W > 0) applyWord(currentWord, true);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });
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

  const PULL_RADIUS = 150;
  const PULL_AMOUNT = 78;
  const STIFF = 0.16;
  const DAMP = 0.80;

  function step() {
    t += 0.02;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';

    for (let i = 0; i < n; i++) {
      let tx = baseX[i], ty = baseY[i];
      tx += Math.sin(t * 1.4 + phase[i]) * 1.6;
      ty += Math.cos(t * 1.1 + phase[i]) * 1.6;

      if (hasMouse) {
        const dx = mouseX - baseX[i];
        const dy = mouseY - baseY[i];
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < PULL_RADIUS) {
          const falloff = Math.pow(1 - d / PULL_RADIUS, 1.6);
          const nx = d > 0.001 ? dx / d : 0;
          const ny = d > 0.001 ? dy / d : 0;
          tx += nx * PULL_AMOUNT * falloff;
          ty += ny * PULL_AMOUNT * falloff;
        }
      }

      const ax = (tx - curX[i]) * STIFF;
      const ay = (ty - curY[i]) * STIFF;
      velX[i] = (velX[i] + ax) * DAMP;
      velY[i] = (velY[i] + ay) * DAMP;
      curX[i] += velX[i];
      curY[i] += velY[i];

      ctx.beginPath();
      ctx.arc(curX[i], curY[i], radius[i], 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-atop';
    const grad = ctx.createLinearGradient(0, 0, W * 0.7, H);
    grad.addColorStop(0, '#f6f8fa');
    grad.addColorStop(0.32, '#c7cdd6');
    grad.addColorStop(0.5, '#5c636e');
    grad.addColorStop(0.68, '#9199a3');
    grad.addColorStop(1, '#eef2f4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    if (hasMouse) {
      ctx.globalCompositeOperation = 'source-atop';
      const hl = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, PULL_RADIUS * 0.8);
      hl.addColorStop(0, 'rgba(255,255,255,0.55)');
      hl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hl;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.globalCompositeOperation = 'source-over';
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

  window.LiquidMetalDemo = { start, stop };
})();
