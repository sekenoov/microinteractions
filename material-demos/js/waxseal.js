(function () {
  const target = document.getElementById('wax-target');
  const stamp = document.getElementById('seal-stamp');
  const imprint = document.getElementById('seal-imprint');
  const paper = target ? target.closest('.paper') : null;

  let sealed = false;
  let dripEls = [];

  function clearDrips() {
    dripEls.forEach(d => d.remove());
    dripEls = [];
  }

  function makeDrips() {
    const n = 4 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'wax-drip';
      const angle = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.6;
      const dist = 58 + Math.random() * 14;
      const size = 8 + Math.random() * 10;
      const cx = 110 + Math.cos(angle) * dist;
      const cy = 110 + Math.sin(angle) * dist;
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.left = cx + 'px';
      el.style.top = cy + 'px';
      el.style.animationDelay = (i * 25) + 'ms';
      target.appendChild(el);
      dripEls.push(el);
      requestAnimationFrame(() => el.classList.add('is-shown'));
    }
  }

  function seal() {
    if (sealed) {
      // reset and re-play
      imprint.classList.remove('is-shown');
      clearDrips();
      void imprint.offsetWidth;
    }
    sealed = true;
    target.classList.add('is-sealed');

    stamp.classList.remove('is-dropping');
    void stamp.offsetWidth;
    stamp.classList.add('is-dropping');

    window.clearTimeout(seal._t1);
    window.clearTimeout(seal._t2);
    seal._t1 = window.setTimeout(() => {
      imprint.classList.add('is-shown');
      makeDrips();
      if (paper) {
        paper.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(0.985)' }, { transform: 'scale(1)' }],
          { duration: 260, easing: 'ease-out' }
        );
      }
    }, 370);
  }

  function reset() {
    sealed = false;
    target.classList.remove('is-sealed');
    imprint.classList.remove('is-shown');
    stamp.classList.remove('is-dropping');
    clearDrips();
  }

  target.addEventListener('click', seal);

  window.WaxSealDemo = { start() {}, stop() { reset(); } };
})();
