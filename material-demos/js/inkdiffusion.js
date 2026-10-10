(function () {
  const canvas = document.getElementById('ink-canvas');
  const ctx = canvas.getContext('2d');
  const label = document.getElementById('ink-label');

  const N = 140;
  let U, V, U2, V2;
  let buf, bctx, imgData;

  let W = 0, H = 0;
  let raf = null, running = false;
  let pressing = false;
  let px = -1, py = -1;

  const DU = 0.16, DV = 0.08, F = 0.045, K = 0.055;
  const STEPS_PER_FRAME = 16;

  function idx(x, y) {
    if (x < 0) x = 0; else if (x >= N) x = N - 1;
    if (y < 0) y = 0; else if (y >= N) y = N - 1;
    return y * N + x;
  }

  function reset() {
    U = new Float32Array(N * N).fill(1);
    V = new Float32Array(N * N).fill(0);
    U2 = new Float32Array(N * N);
    V2 = new Float32Array(N * N);
  }

  function seed(cx, cy, radius) {
    const r2 = radius * radius;
    for (let y = Math.max(0, cy - radius); y <= Math.min(N - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(N - 1, cx + radius); x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          const i = y * N + x;
          V[i] = 1;
          U[i] = 0.4;
        }
      }
    }
  }

  function simStep() {
    for (let y = 0; y < N; y++) {
      const yUp = y === 0 ? 0 : y - 1;
      const yDn = y === N - 1 ? N - 1 : y + 1;
      for (let x = 0; x < N; x++) {
        const xL = x === 0 ? 0 : x - 1;
        const xR = x === N - 1 ? N - 1 : x + 1;
        const i = y * N + x;

        const u = U[i], v = V[i];

        const lapU =
          U[y * N + xL] * 0.2 + U[y * N + xR] * 0.2 +
          U[yUp * N + x] * 0.2 + U[yDn * N + x] * 0.2 +
          U[yUp * N + xL] * 0.05 + U[yUp * N + xR] * 0.05 +
          U[yDn * N + xL] * 0.05 + U[yDn * N + xR] * 0.05 - u;

        const lapV =
          V[y * N + xL] * 0.2 + V[y * N + xR] * 0.2 +
          V[yUp * N + x] * 0.2 + V[yDn * N + x] * 0.2 +
          V[yUp * N + xL] * 0.05 + V[yUp * N + xR] * 0.05 +
          V[yDn * N + xL] * 0.05 + V[yDn * N + xR] * 0.05 - v;

        const uvv = u * v * v;
        let nu = u + (DU * lapU - uvv + F * (1 - u));
        let nv = v + (DV * lapV + uvv - (F + K) * v);
        if (nu < 0) nu = 0; else if (nu > 1) nu = 1;
        if (nv < 0) nv = 0; else if (nv > 1) nv = 1;
        U2[i] = nu;
        V2[i] = nv;
      }
    }
    const tu = U; U = U2; U2 = tu;
    const tv = V; V = V2; V2 = tv;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W);
    canvas.height = Math.round(H);

    buf = document.createElement('canvas');
    buf.width = N; buf.height = N;
    bctx = buf.getContext('2d');
    imgData = bctx.createImageData(N, N);
  }

  function posToGrid(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const lx = (clientX - rect.left) / rect.width;
    const ly = (clientY - rect.top) / rect.height;
    return [Math.round(lx * N), Math.round(ly * N)];
  }

  function onDown(e) {
    pressing = true;
    const p = e.touches ? e.touches[0] : e;
    const [gx, gy] = posToGrid(p.clientX, p.clientY);
    px = gx; py = gy;
    seed(gx, gy, 10);
    label.classList.add('is-hidden');
    e.preventDefault && e.preventDefault();
  }
  function onMoveP(e) {
    if (!pressing) return;
    const p = e.touches ? e.touches[0] : e;
    const [gx, gy] = posToGrid(p.clientX, p.clientY);
    px = gx; py = gy;
    e.preventDefault && e.preventDefault();
  }
  function onUp() { pressing = false; }

  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMoveP);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMoveP, { passive: false });
  window.addEventListener('touchend', onUp);

  function render() {
    const data = imgData.data;
    let p = 0;
    for (let i = 0; i < N * N; i++) {
      const v = V[i];
      const a = Math.max(0, Math.min(1, (v - 0.12) * 3.2));
      data[p] = 26;
      data[p + 1] = 22;
      data[p + 2] = 40;
      data[p + 3] = Math.round(a * 255);
      p += 4;
    }
    bctx.putImageData(imgData, 0, 0);

    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.filter = 'blur(0.6px)';
    ctx.drawImage(buf, 0, 0, N, N, 0, 0, W, H);
    ctx.filter = 'none';
  }

  function step() {
    if (pressing && px >= 0) seed(px, py, 4);
    for (let s = 0; s < STEPS_PER_FRAME; s++) simStep();
    render();
    if (running) raf = requestAnimationFrame(step);
  }

  function start() {
    if (running) return;
    reset();
    resize();
    label.classList.remove('is-hidden');
    running = true;
    raf = requestAnimationFrame(step);
  }
  function stop() {
    running = false;
    pressing = false;
    if (raf) cancelAnimationFrame(raf);
  }
  window.addEventListener('resize', () => { if (running) resize(); });

  window.InkDiffusionDemo = { start, stop };
})();
