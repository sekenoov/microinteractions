(function () {
  const disc = document.getElementById('water-disc');
  const surface = document.getElementById('water-surface');
  const glow = document.getElementById('water-glow');
  const ripples = document.getElementById('water-ripples');
  const disp = document.getElementById('disp');
  if (!disc) return;

  let rafDisp = null;

  function onMove(e) {
    const rect = disc.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = rect.width / 2;
    if (dist > maxR * 1.15) { glow.style.opacity = '0'; return; }

    glow.style.opacity = '0.9';
    glow.style.left = x + 'px';
    glow.style.top = y + 'px';
    glow.style.transform = `translate(-50%, -50%) scale(${1 - Math.min(dist / maxR, 0.6) * 0.3})`;
  }
  function onLeave() { glow.style.opacity = '0'; }

  disc.addEventListener('mousemove', onMove);
  disc.addEventListener('mouseleave', onLeave);

  function animateDisplacement() {
    if (rafDisp) cancelAnimationFrame(rafDisp);
    const duration = 900;
    const start = performance.now();
    const peak = 34;

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      // fast rise, slow decaying settle (damped oscillation feel via easing)
      let v;
      if (t < 0.18) {
        v = (t / 0.18) * peak;
      } else {
        const tt = (t - 0.18) / 0.82;
        v = peak * Math.exp(-tt * 4.2) * Math.cos(tt * 9);
      }
      disp.setAttribute('scale', Math.max(0, v).toFixed(2));
      if (t < 1) {
        rafDisp = requestAnimationFrame(frame);
      } else {
        disp.setAttribute('scale', '0');
      }
    }
    rafDisp = requestAnimationFrame(frame);
  }

  function spawnRipple(delay) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'ripple-ring';
      ripples.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }, delay);
  }

  function onClick(e) {
    animateDisplacement();
    spawnRipple(0);
    spawnRipple(110);
    spawnRipple(230);
    surface.animate(
      [{ transform: 'scale(1,1)' }, { transform: 'scale(1.015,0.965)' }, { transform: 'scale(0.985,1.02)' }, { transform: 'scale(1,1)' }],
      { duration: 420, easing: 'cubic-bezier(.4,0,.2,1)' }
    );
  }
  disc.addEventListener('click', onClick);

  window.WaterDemo = {
    start() {},
    stop() {
      if (rafDisp) cancelAnimationFrame(rafDisp);
      disp.setAttribute('scale', '0');
      glow.style.opacity = '0';
      ripples.innerHTML = '';
    }
  };
})();
