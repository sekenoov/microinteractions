(function () {
  const card = document.getElementById('embroidery-target');
  const threadPath = document.getElementById('thread-visible');
  const revealPath = document.getElementById('reveal-path');
  const needle = document.getElementById('needle');
  const knot = document.getElementById('knot');
  const svg = document.getElementById('stitch-svg');

  if (!card) return;

  let len = 0;
  let raf = null;
  let progress = 0; // 0..1
  let direction = 0; // 1 = stitching in, -1 = unraveling
  let running = false;

  function measure() {
    len = revealPath.getTotalLength();
    revealPath.style.strokeDasharray = len;
    revealPath.style.strokeDashoffset = len;
  }

  function svgPointToLocal(pt) {
    // map svg viewBox coords to the card's pixel box (viewBox 320x200 maps to card size, non-uniform scale since preserveAspectRatio=none)
    const rect = card.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    return {
      x: (pt.x / vb.width) * rect.width,
      y: (pt.y / vb.height) * rect.height,
    };
  }

  function updateNeedle(p) {
    const dist = p * len;
    const pt = threadPath.getPointAtLength(dist);
    const pt2 = threadPath.getPointAtLength(Math.min(len, dist + 1));
    const angle = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * (180 / Math.PI);
    const local = svgPointToLocal(pt);
    needle.style.transform = `translate(${local.x - 4}px, ${local.y}px) rotate(${angle}deg)`;
  }

  function frame() {
    const speed = 0.028;
    progress += direction * speed;
    progress = Math.max(0, Math.min(1, progress));

    const offset = len * (1 - progress);
    revealPath.style.strokeDashoffset = offset;

    if (progress > 0.01 && progress < 0.995) {
      needle.style.opacity = '1';
      updateNeedle(progress);
    } else {
      needle.style.opacity = '0';
    }

    if (progress >= 1) {
      knot.classList.add('is-shown');
      const startPt = svgPointToLocal(threadPath.getPointAtLength(0));
      knot.style.left = (startPt.x - 4) + 'px';
      knot.style.top = (startPt.y - 4) + 'px';
      running = false;
      return;
    }
    if (progress <= 0) {
      knot.classList.remove('is-shown');
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function play(dir) {
    direction = dir;
    if (dir > 0) knot.classList.remove('is-shown');
    if (!running) {
      running = true;
      raf = requestAnimationFrame(frame);
    }
  }

  card.addEventListener('mouseenter', () => play(1));
  card.addEventListener('mouseleave', () => play(-1));
  card.addEventListener('touchstart', (e) => { play(1); }, { passive: true });

  window.addEventListener('resize', () => {
    if (progress > 0) updateNeedle(progress);
  });

  window.EmbroideryDemo = {
    start() { measure(); },
    stop() {
      if (raf) cancelAnimationFrame(raf);
      running = false;
      progress = 0;
      direction = 0;
      if (revealPath) {
        revealPath.style.strokeDashoffset = len;
      }
      needle.style.opacity = '0';
      knot.classList.remove('is-shown');
    }
  };
})();
