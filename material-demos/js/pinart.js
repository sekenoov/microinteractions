(function () {
  const canvas = document.getElementById('pinart-canvas');
  const ctx = canvas.getContext('2d');

  const CELL = 13;
  let cols = 0, rows = 0;
  let height = null;   // current dent depth per pin (0 = rest, negative = pressed in)
  let vel = null;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  let mouseX = -9999, mouseY = -9999;
  let prevMouseX = -9999, prevMouseY = -9999;
  let hasMouse = false;
  let raf = null;
  let running = false;

  const RADIUS = 70;
  const MAX_DEPTH = 1;
  const STIFFNESS = 0.22;
  const DAMPING = 0.72;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    cols = Math.floor(rect.width / CELL);
    rows = Math.floor(rect.height / CELL);
    height = new Float32Array(cols * rows);
    vel = new Float32Array(cols * rows);
  }

  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX / dpr;
    mouseY = (e.clientY - rect.top) * scaleY / dpr;
    hasMouse = true;
  }
  function onLeave() { hasMouse = false; mouseX = -9999; mouseY = -9999; }

  function onTouch(e) {
    if (!e.touches || !e.touches.length) return;
    const t = e.touches[0];
    onMove({ clientX: t.clientX, clientY: t.clientY });
    e.preventDefault();
  }

  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', onLeave);
  canvas.addEventListener('touchmove', onTouch, { passive: false });
  canvas.addEventListener('touchstart', onTouch, { passive: false });
  canvas.addEventListener('touchend', onLeave);

  const lightDir = normalize(-0.55, -0.65, 0.75);
  function normalize(x, y, z) {
    const l = Math.sqrt(x * x + y * y + z * z);
    return [x / l, y / l, z / l];
  }

  const baseR = 176, baseG = 180, baseB = 186;

  function step() {
    const cw = CELL;
    const rMouse = RADIUS / cw;

    // target field from mouse
    const mx = mouseX / cw;
    const my = mouseY / cw;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        let target = 0;
        if (hasMouse) {
          const dx = x - mx;
          const dy = y - my;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < rMouse) {
            const falloff = 0.5 + 0.5 * Math.cos((d / rMouse) * Math.PI);
            target = -MAX_DEPTH * falloff;
          }
        }
        const h = height[idx];
        const a = (target - h) * STIFFNESS;
        vel[idx] = (vel[idx] + a) * DAMPING;
        height[idx] += vel[idx];
      }
    }

    render();
    if (running) raf = requestAnimationFrame(step);
  }

  function render() {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.fillStyle = '#0c0c0d';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const r = CELL * 0.36;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const h = height[idx];

        const hL = x > 0 ? height[idx - 1] : h;
        const hR = x < cols - 1 ? height[idx + 1] : h;
        const hU = y > 0 ? height[idx - cols] : h;
        const hD = y < rows - 1 ? height[idx + cols] : h;
        const nx = (hL - hR) * 3.2;
        const ny = (hU - hD) * 3.2;
        const nz = 1;
        const nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const diffuse = Math.max(0, (nx / nl) * lightDir[0] + (ny / nl) * lightDir[1] + (nz / nl) * lightDir[2]);

        const depthShade = 1 + h * 0.55; // pressed pins darker overall
        const shade = Math.max(0.12, Math.min(1.35, 0.35 + diffuse * 1.05) * depthShade);

        const cx = x * CELL + CELL / 2;
        const cy = y * CELL + CELL / 2;

        const rr = Math.min(255, baseR * shade);
        const gg = Math.min(255, baseG * shade);
        const bb = Math.min(255, baseB * shade + 4);

        ctx.beginPath();
        ctx.fillStyle = `rgb(${rr | 0},${gg | 0},${bb | 0})`;
        ctx.arc(cx, cy - h * CELL * 0.9, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
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

  window.PinArtDemo = { start, stop };
})();
