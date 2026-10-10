(function () {
  const cassette = document.getElementById('cassette');
  const reelLeft = document.getElementById('reel-left');
  const reelRight = document.getElementById('reel-right');
  const woundLeft = document.getElementById('wound-left');
  const woundRight = document.getElementById('wound-right');
  const label = document.querySelector('.cassette__label');
  if (!cassette) return;

  let reelAngle = 0;
  let windAmount = 0.5; // 0 = all tape on right, 1 = all tape on left
  let velocity = 0;     // px delta per frame equivalent
  let lastX = 0;
  let dragging = false;
  let raf = null;
  let running = false;
  let flutter = 0;

  function applyReels() {
    reelLeft.style.transform = `rotate(${reelAngle}deg)`;
    reelRight.style.transform = `rotate(${reelAngle}deg)`;
    const leftScale = 0.32 + windAmount * 0.6;
    const rightScale = 0.32 + (1 - windAmount) * 0.6;
    woundLeft.style.transform = `scale(${leftScale})`;
    woundRight.style.transform = `scale(${rightScale})`;
  }

  function applyFlutter() {
    const amt = Math.max(-1, Math.min(1, flutter / 14));
    label.style.transform = `skewX(${amt * 4}deg) scaleY(${1 - Math.abs(amt) * 0.04})`;
  }

  function onDown(e) {
    dragging = true;
    lastX = (e.touches ? e.touches[0].clientX : e.clientX);
    velocity = 0;
    cassette.style.cursor = 'grabbing';
    ensureLoop();
  }
  function onMove(e) {
    if (!dragging) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    const dx = x - lastX;
    lastX = x;
    velocity = dx;
    reelAngle += dx * 1.8;
    windAmount = Math.max(0, Math.min(1, windAmount - dx * 0.0026));
    flutter = dx;
    applyReels();
    applyFlutter();
    e.preventDefault && e.preventDefault();
  }
  function onUp() {
    dragging = false;
    cassette.style.cursor = 'grab';
  }

  cassette.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  cassette.addEventListener('touchstart', onDown, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);

  function tick() {
    if (!dragging) {
      if (Math.abs(velocity) > 0.02) {
        reelAngle += velocity * 1.8;
        windAmount = Math.max(0, Math.min(1, windAmount - velocity * 0.0026));
        velocity *= 0.94;
        flutter = velocity;
        applyReels();
        applyFlutter();
      } else if (Math.abs(flutter) > 0.01) {
        flutter *= 0.85;
        applyFlutter();
      }
    }
    if (running) raf = requestAnimationFrame(tick);
  }

  function ensureLoop() {
    if (!running) {
      running = true;
      raf = requestAnimationFrame(tick);
    }
  }

  window.CassetteDemo = {
    start() { applyReels(); applyFlutter(); running = true; raf = requestAnimationFrame(tick); },
    stop() { running = false; if (raf) cancelAnimationFrame(raf); dragging = false; velocity = 0; flutter = 0; }
  };
})();
