(function () {
  const buttons = Array.from(document.querySelectorAll('.switcher__btn'));
  const demos = {
    iron: { el: document.getElementById('demo-iron'), api: () => window.IronFilingsDemo },
    metal: { el: document.getElementById('demo-metal'), api: () => window.LiquidMetalDemo },
    caustics: { el: document.getElementById('demo-caustics'), api: () => window.CausticsDemo },
    ink: { el: document.getElementById('demo-ink'), api: () => window.InkDiffusionDemo },
    loupe: { el: document.getElementById('demo-loupe'), api: () => window.LoupeDemo },
  };

  let current = 'iron';

  function setBodyBg(el) {
    const bg = el.getAttribute('data-bg');
    if (bg) document.body.style.background = bg;
  }

  function show(name) {
    if (name === current && demos[name].el.classList.contains('is-active')) return;
    const prev = demos[current];
    const next = demos[name];

    if (prev && prev.api()) prev.api().stop();
    Object.values(demos).forEach(d => d.el.classList.remove('is-active'));
    buttons.forEach(b => b.classList.toggle('is-active', b.dataset.demo === name));

    next.el.classList.add('is-active');
    setBodyBg(next.el);
    if (next.api()) next.api().start();
    current = name;
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => show(btn.dataset.demo));
  });

  const switcher = document.getElementById('switcher');
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'h') {
      switcher.style.display = switcher.style.display === 'none' ? '' : 'none';
    }
  });

  setBodyBg(demos.iron.el);
  if (demos.iron.api()) demos.iron.api().start();
})();
