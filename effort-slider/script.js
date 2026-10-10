(() => {
  const LEVELS = [
    { name: 'Low',       caption: 'Instant reply, almost no thinking',            accent: '#94A3B8', accent2: '#CBD5E1', particles: 0,  shake: 0,   glow: 8,  aurora: 0.08, aspeed: 0.7, amp: 3,  speed: 2.6, tilt: 0  },
    { name: 'Medium',    caption: 'A little thought, a quick answer',             accent: '#38BDF8', accent2: '#7DD3FC', particles: 3,  shake: 0,   glow: 14, aurora: 0.16, aspeed: 0.85,amp: 5,  speed: 2.2, tilt: 2  },
    { name: 'High',      caption: 'A steady balance of speed and reasoning',      accent: '#10B981', accent2: '#6EE7B7', particles: 5,  shake: 0,   glow: 18, aurora: 0.26, aspeed: 1,   amp: 7,  speed: 1.9, tilt: 4  },
    { name: 'Extra',     caption: 'Thinks noticeably deeper than usual',          accent: '#F5A524', accent2: '#FBC56C', particles: 8,  shake: 1.2, glow: 24, aurora: 0.4,  aspeed: 1.2, amp: 9,  speed: 1.6, tilt: 6  },
    { name: 'Max',       caption: 'Maximum thought before every word',            accent: '#F43F5E', accent2: '#FB7185', particles: 13, shake: 2.4, glow: 32, aurora: 0.46, aspeed: 1.45,amp: 12, speed: 1.25,tilt: 9  },
    { name: 'Ultracode', caption: 'Peak mode, thinks longer and solves the hardest problems', accent: '#8B5CF6', accent2: '#E879F9', particles: 20, shake: 3.6, glow: 46, aurora: 0.66, aspeed: 1.8, amp: 16, speed: 0.95,tilt: 13 },
  ];

  const MODELS = [
    { id: 'fable',  name: 'Fable 5',  badge: 'Requires usage credits', accent: '#14B8A6', accent2: '#5EEAD4', power: 'quick',    glow: 0,  scale: 0.82 },
    { id: 'opus',   name: 'Opus 5',   badge: null,                     accent: '#7C3AED', accent2: '#C4B5FD', power: 'genius',   glow: 14, scale: 1.18 },
    { id: 'sonnet', name: 'Sonnet 5', badge: null,                     accent: '#D97757', accent2: '#E8A27C', power: 'balanced', glow: 0,  scale: 1    },
  ];

  // 16 x 14 pixel-art bitmap: '.' empty, '1' body, '2' eye
  const PET_ROWS = [
    '...11......11...',
    '..1111....1111..',
    '..111111111111..',
    '.11111111111111.',
    '.11122111122111.',
    '.11122111122111.',
    '.11111111111111.',
    '.11111111111111.',
    '.11111111111111.',
    '..111111111111..',
    '...111....111...',
    '...111....111...',
    '...111....111...',
    '...111....111...',
  ].map(r => r.padEnd(16, '.'));

  const $ = (sel) => document.querySelector(sel);

  const effortTrigger  = $('#effortTrigger');
  const effortPillLabel= $('#effortPillLabel');
  const effortCard     = $('#effortCard');
  const levelName       = $('#levelName');
  const composerText     = $('#composerText');
  const sliderTrack     = $('#sliderTrack');
  const dotsWrap         = $('#dots');
  const thumb            = $('#thumb');
  const particleLayer    = $('#particleLayer');
  const levelCaption     = $('#levelCaption');
  const mascot           = $('#mascot');
  const mascotWrap       = $('#mascotWrap');
  const mascotScale      = $('#mascotScale');
  const mascotSparks     = $('#mascotSparks');
  const flash            = $('#flash');
  const brandLogo        = $('#brandLogo');

  const modelTrigger    = $('#modelTrigger');
  const modelPillLabel  = $('#modelPillLabel');
  const modelsCard      = $('#modelsCard');
  const modelList       = $('#modelList');
  const modelMore       = $('#modelMore');
  const effortBanner      = $('#effortBanner');
  const effortCanvas      = $('#effortCanvas');
  const effortBannerLabel = $('#effortBannerLabel');

  const N = LEVELS.length;
  let currentIndex = 2;
  let currentModelIndex = 2; // Sonnet 5
  let dragging = false;
  let suppressNextClick = false;
  let lastWheelAt = 0;

  // --- build pixel mascot ---
  const svgNS = 'http://www.w3.org/2000/svg';
  PET_ROWS.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', 1);
      rect.setAttribute('height', 1);
      rect.setAttribute('class', ch === '2' ? 'mascot-pixel mascot-pixel--eye' : 'mascot-pixel');
      mascot.appendChild(rect);
    });
  });

  // --- build brand asterisk logo (12-ray sparkle) ---
  for (let i = 0; i < 12; i++) {
    const ray = document.createElementNS(svgNS, 'path');
    ray.setAttribute('d', 'M50,50 L44,17 Q50,10 56,17 Z');
    ray.setAttribute('transform', `rotate(${i * 30} 50 50)`);
    brandLogo.appendChild(ray);
  }

  // --- build dots ---
  LEVELS.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'dot';
    d.dataset.index = i;
    dotsWrap.appendChild(d);
  });
  const dotEls = [...dotsWrap.children];

  const pctForIndex = (i) => (i / (N - 1)) * 100;

  function applyMascotSpeed() {
    const level = LEVELS[currentIndex];
    const model = MODELS[currentModelIndex];
    const speedMult = model.power === 'quick' ? 1.45 : model.power === 'genius' ? 0.72 : 1;
    effortCard.style.setProperty('--mascot-speed', (level.speed / speedMult) + 's');
  }

  function setVars(level) {
    effortCard.style.setProperty('--accent', level.accent);
    effortCard.style.setProperty('--accent-2', level.accent2);
    effortCard.style.setProperty('--accent-from', LEVELS[0].accent);
    effortCard.style.setProperty('--glow-blur', level.glow + 'px');
    effortCard.style.setProperty('--aurora-opacity', level.aurora);
    effortCard.style.setProperty('--aurora-speed', level.aspeed);
    effortCard.style.setProperty('--shake-amt', level.shake + 'px');
    effortCard.style.setProperty('--mascot-amp', level.amp + 'px');
    mascot.style.setProperty('--mascot-tilt', level.tilt + 'deg');
    applyMascotSpeed();
    refreshMood();
  }

  // --- mascot mood + autonomous actions ---
  let currentMood = 'neutral';
  let actionTimerId = null;

  function moodForIndex(index) {
    if (index <= 1) return 'sad';
    if (index === 2) return 'neutral';
    return 'active';
  }

  function playRandomAction() {
    const actions = ['action-spin', 'action-hop', 'action-glance'];
    const pick = actions[Math.floor(Math.random() * actions.length)];
    mascotScale.classList.remove('action-spin', 'action-hop', 'action-glance', 'popping');
    void mascotScale.offsetWidth;
    mascotScale.classList.add(pick);
  }

  function stopActionLoop() {
    if (actionTimerId) { clearTimeout(actionTimerId); actionTimerId = null; }
  }

  function startActionLoop() {
    if (actionTimerId) return;
    const tick = () => {
      playRandomAction();
      actionTimerId = setTimeout(tick, 1500 + Math.random() * 900);
    };
    actionTimerId = setTimeout(tick, 900 + Math.random() * 600);
  }

  function refreshMood() {
    const mood = moodForIndex(currentIndex);
    if (mood !== currentMood) {
      mascotWrap.classList.remove('mood-sad', 'mood-neutral', 'mood-active');
      mascotWrap.classList.add('mood-' + mood);
      currentMood = mood;
    }
    const cardOpen = effortCard.classList.contains('open');
    if (mood === 'active' && cardOpen) startActionLoop();
    else stopActionLoop();
  }

  function paintDots(index) {
    dotEls.forEach((d, i) => {
      d.classList.toggle('is-active', i === index);
      d.classList.toggle('is-passed', i < index);
    });
  }

  function paintTexts(level) {
    effortPillLabel.textContent = level.name;
    levelName.textContent = level.name;
    effortBannerLabel.textContent = level.name.toUpperCase();
    levelCaption.style.opacity = 0;
    setTimeout(() => {
      levelCaption.textContent = level.caption;
      levelCaption.style.opacity = 1;
    }, 90);
  }

  function spawnSparks(count, colorA, colorB, originX, originY, spread = 1) {
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      const angle = Math.random() * Math.PI * 2;
      const dist = (18 + Math.random() * 34) * spread;
      const size = 3 + Math.random() * 4;
      const dur = 480 + Math.random() * 420;
      s.style.left = originX + 'px';
      s.style.top = originY + 'px';
      s.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
      s.style.setProperty('--sz', size + 'px');
      s.style.setProperty('--dur', dur + 'ms');
      s.style.setProperty('--c', Math.random() > 0.5 ? colorA : colorB);
      particleLayer.appendChild(s);
      setTimeout(() => s.remove(), dur + 60);
    }
  }

  function triggerShake(level) {
    if (level.shake <= 0) return;
    effortCard.classList.remove('shaking');
    void effortCard.offsetWidth;
    effortCard.classList.add('shaking');
  }

  function popMascot() {
    mascotScale.classList.remove('popping');
    void mascotScale.offsetWidth;
    mascotScale.classList.add('popping');
  }

  function triggerMascotPulse(level) {
    popMascot();
    if (level.particles >= 8) {
      spawnMascotSparks(Math.round(level.particles * 0.6), level.accent, level.accent2);
    }
  }

  function spawnMascotSparks(count, colorA, colorB) {
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      const angle = Math.random() * Math.PI * 2;
      const dist = 14 + Math.random() * 26;
      const size = 2.5 + Math.random() * 3;
      const dur = 420 + Math.random() * 380;
      s.style.left = '27px';
      s.style.top = '30px';
      s.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
      s.style.setProperty('--sz', size + 'px');
      s.style.setProperty('--dur', dur + 'ms');
      s.style.setProperty('--c', Math.random() > 0.5 ? colorA : colorB);
      mascotSparks.appendChild(s);
      setTimeout(() => s.remove(), dur + 60);
    }
  }

  function spawnSpeedlines() {
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.className = 'speedline';
      s.style.top = (18 + i * 8) + 'px';
      s.style.animationDelay = (i * 60) + 'ms';
      mascotSparks.appendChild(s);
      setTimeout(() => s.remove(), 520);
    }
  }

  function triggerFlash() {
    flash.classList.remove('pulse');
    void flash.offsetWidth;
    flash.classList.add('pulse');
  }

  function applyLevel(index, { userInitiated = true, livePct = null } = {}) {
    index = Math.max(0, Math.min(N - 1, index));
    const changed = index !== currentIndex;
    currentIndex = index;
    const level = LEVELS[index];

    const pct = livePct !== null ? livePct : pctForIndex(index);
    sliderTrack.style.setProperty('--thumb-pct', pct + '%');
    sliderTrack.setAttribute('aria-valuenow', String(index));

    setVars(level);
    paintDots(index);
    paintTexts(level);

    if (userInitiated && changed) {
      const trackRect = sliderTrack.getBoundingClientRect();
      const originX = (pctForIndex(index) / 100) * trackRect.width;
      const originY = trackRect.height / 2;
      spawnSparks(level.particles, level.accent, level.accent2, originX, originY);
      triggerShake(level);
      triggerMascotPulse(level);
      if (index === N - 1) triggerFlash();
    }
  }

  // --- popup open/close (effort) ---
  function openCard() {
    closeModels();
    effortCard.classList.add('open');
    effortTrigger.setAttribute('aria-expanded', 'true');
    refreshMood();
    startEffortCanvas();
  }
  function closeCard() {
    effortCard.classList.remove('open');
    effortTrigger.setAttribute('aria-expanded', 'false');
    stopActionLoop();
    stopEffortCanvas();
  }
  effortTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    effortCard.classList.contains('open') ? closeCard() : openCard();
  });

  // --- popup open/close (models) ---
  function openModels() {
    closeCard();
    modelsCard.classList.add('open');
    modelTrigger.setAttribute('aria-expanded', 'true');
  }
  function closeModels() {
    modelsCard.classList.remove('open');
    modelTrigger.setAttribute('aria-expanded', 'false');
  }

  // --- animated dot-grid banner (effort popup) ---
  let bannerRAF = null;
  let bannerDots = null;
  let bannerSize = { w: 0, h: 0 };

  function buildBannerDots(w, h) {
    const spacing = 13;
    const cols = Math.max(2, Math.floor(w / spacing));
    const rows = Math.max(2, Math.floor(h / spacing));
    const offX = (w - (cols - 1) * spacing) / 2;
    const offY = (h - (rows - 1) * spacing) / 2;
    const dots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dots.push({
          x: offX + c * spacing,
          y: offY + r * spacing,
          phase: Math.random() * Math.PI * 2,
          speed: 0.6 + Math.random() * 0.7,
        });
      }
    }
    return dots;
  }

  function drawBannerFrame(ctx, w, h, t) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    bannerDots.forEach((d) => {
      const o = 0.12 + 0.5 * Math.abs(Math.sin(t * 0.0016 * d.speed + d.phase));
      const jitter = Math.sin(t * 0.0011 * d.speed + d.phase * 1.7) * 1.6;
      ctx.globalAlpha = o;
      ctx.beginPath();
      ctx.arc(d.x + jitter, d.y, 1.15, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function startEffortCanvas() {
    const rect = effortBanner.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    bannerSize = { w: rect.width, h: rect.height };
    effortCanvas.width = bannerSize.w * dpr;
    effortCanvas.height = bannerSize.h * dpr;
    const ctx = effortCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bannerDots = buildBannerDots(bannerSize.w, bannerSize.h);
    if (bannerRAF) cancelAnimationFrame(bannerRAF);
    const loop = (t) => {
      drawBannerFrame(ctx, bannerSize.w, bannerSize.h, t);
      bannerRAF = requestAnimationFrame(loop);
    };
    bannerRAF = requestAnimationFrame(loop);
  }

  function stopEffortCanvas() {
    if (bannerRAF) { cancelAnimationFrame(bannerRAF); bannerRAF = null; }
  }
  modelTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    modelsCard.classList.contains('open') ? closeModels() : openModels();
  });

  document.addEventListener('click', (e) => {
    if (!effortCard.contains(e.target) && !effortTrigger.contains(e.target)) closeCard();
    if (!modelsCard.contains(e.target) && !modelTrigger.contains(e.target)) closeModels();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeCard(); closeModels(); }
    if (modelsCard.classList.contains('open') && ['1', '2', '3'].includes(e.key)) {
      const idx = Number(e.key) - 1;
      if (idx < MODELS.length) selectModel(idx);
    }
  });

  // --- models list ---
  function renderModels() {
    modelList.innerHTML = '';
    MODELS.forEach((m, i) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'model-row' + (i === currentModelIndex ? ' is-selected' : '');
      row.innerHTML = `
        <span class="model-row-name">${m.name}</span>
        ${m.badge ? `<span class="model-badge">${m.badge}</span>` : ''}
        <span class="model-row-spacer"></span>
        <svg class="model-check" width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M1 5L4.5 8.5L12 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="model-num">${i + 1}</span>
      `;
      row.addEventListener('click', (e) => { e.stopPropagation(); selectModel(i); });
      modelList.appendChild(row);
    });
  }

  function selectModel(index) {
    const changed = index !== currentModelIndex;
    currentModelIndex = index;
    const model = MODELS[index];

    modelPillLabel.textContent = model.name;
    document.documentElement.style.setProperty('--model-accent', model.accent);
    document.documentElement.style.setProperty('--model-accent-2', model.accent2);
    mascotWrap.classList.remove('power-quick', 'power-genius', 'power-balanced');
    mascotWrap.classList.add('power-' + model.power);
    mascotWrap.style.setProperty('--power-scale', model.scale);
    mascotWrap.style.setProperty('--power-glow', model.glow + 'px');
    applyMascotSpeed();
    renderModels();

    if (changed) {
      modelTrigger.classList.remove('pinging');
      void modelTrigger.offsetWidth;
      modelTrigger.classList.add('pinging');

      popMascot();

      if (model.power === 'genius') spawnMascotSparks(10, model.accent, model.accent2);
      if (model.power === 'quick') spawnSpeedlines();
    }
  }

  modelMore.addEventListener('click', (e) => {
    e.stopPropagation();
    modelMore.classList.remove('nudge');
    void modelMore.offsetWidth;
    modelMore.classList.add('nudge');
  });

  // --- click / tap to jump (effort slider) ---
  sliderTrack.addEventListener('click', (e) => {
    if (suppressNextClick) { suppressNextClick = false; return; }
    const rect = sliderTrack.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const index = Math.round(pct * (N - 1));
    applyLevel(index, { userInitiated: true });
  });

  // --- drag ---
  function nearestIndexFromClientX(clientX) {
    const rect = sliderTrack.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return { index: Math.round(pct * (N - 1)), pct: pct * 100 };
  }

  thumb.addEventListener('pointerdown', (e) => {
    dragging = true;
    sliderTrack.classList.add('dragging');
    thumb.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  thumb.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const { index, pct } = nearestIndexFromClientX(e.clientX);
    const level = LEVELS[index];
    if (index !== currentIndex) {
      currentIndex = index;
      setVars(level);
      paintDots(index);
      paintTexts(level);
    }
    sliderTrack.style.setProperty('--thumb-pct', pct + '%');
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    sliderTrack.classList.remove('dragging');
    suppressNextClick = true;
    const { index } = nearestIndexFromClientX(e.clientX);
    applyLevel(index, { userInitiated: true });
  }
  thumb.addEventListener('pointerup', endDrag);
  thumb.addEventListener('pointercancel', endDrag);

  // --- keyboard (effort slider) ---
  sliderTrack.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); applyLevel(currentIndex + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); applyLevel(currentIndex - 1); }
    else if (e.key === 'Home') { e.preventDefault(); applyLevel(0); }
    else if (e.key === 'End') { e.preventDefault(); applyLevel(N - 1); }
  });

  // --- wheel ---
  sliderTrack.addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheelAt < 260) return;
    lastWheelAt = now;
    applyLevel(currentIndex + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  // --- typewriter placeholder ---
  const PLACEHOLDER_TEXT = 'Type your prompt here…';
  const typeChars = [...PLACEHOLDER_TEXT].map((ch) => {
    const span = document.createElement('span');
    span.className = 'type-char';
    span.textContent = ch === ' ' ? ' ' : ch;
    composerText.appendChild(span);
    return span;
  });

  function typewriterCycle() {
    typeChars.forEach((el, i) => {
      el.style.transitionDelay = (i * 30) + 'ms';
      el.classList.add('visible');
    });
    const typeDuration = typeChars.length * 30 + 400;
    setTimeout(() => {
      typeChars.forEach((el, i) => {
        el.style.transitionDelay = ((typeChars.length - 1 - i) * 16) + 'ms';
        el.classList.remove('visible');
      });
      const eraseDuration = typeChars.length * 16 + 400;
      setTimeout(typewriterCycle, eraseDuration + 1600);
    }, typeDuration + 2600);
  }

  // --- init ---
  renderModels();
  selectModel(currentModelIndex);
  setVars(LEVELS[currentIndex]);
  paintDots(currentIndex);
  paintTexts(LEVELS[currentIndex]);
  sliderTrack.style.setProperty('--thumb-pct', pctForIndex(currentIndex) + '%');

  window.addEventListener('load', () => {
    setTimeout(openCard, 450);
    setTimeout(typewriterCycle, 500);
  });
})();
