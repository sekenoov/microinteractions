/* Звук смены режима. Всё синтезируется.
   Общая часть: волна от пальцев шуршит воздухом и едет по панораме от руки.
   pixel: восьмибитное арпеджио. ascii: телетайп и звоночек в конце.
   glass: бокал, по которому щёлкнули, с переливом сверху. heat: газ вспыхнул, гул и треск.
   dust: человек осыпается песком, ветер уносит вправо. Обратно: песок слетается и встаёт аккордом.
   play() возвращает, сколько секунд в звуке есть острые удары: столько микрофон не слушает,
   иначе свой же треск из динамиков сработает как щелчок. */

function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export class Sound {
  constructor(ctx) {
    this.ctx = ctx;
    this.R = rng(7);
    const sr = ctx.sampleRate;
    const nb = this.nb = ctx.createBuffer(1, sr * 3, sr), nd = nb.getChannelData(0), r = rng(11);
    for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;

    this.master = this.g(1.4);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = .004; comp.release.value = .2;
    this.master.connect(this.f('highpass', 35, .7)).connect(comp).connect(ctx.destination);

    // короткая комната, чтобы синтез не звучал в вакууме
    const verb = this.verb = ctx.createConvolver(), ir = ctx.createBuffer(2, Math.floor(1.8 * sr), sr), rr = rng(5);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let k = 0; k < d.length; k++) d[k] = (rr() * 2 - 1) * Math.exp(-k / sr / .4); }
    verb.buffer = ir; verb.connect(this.g(.22)).connect(this.master);
    this.muted = false;
  }

  g(v) { const x = this.ctx.createGain(); x.gain.value = v; return x; }
  f(type, freq, q) { const x = this.ctx.createBiquadFilter(); x.type = type; x.frequency.value = freq; if (q != null) x.Q.value = q; return x; }
  out(node, pan, send = .25) {
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan || 0));
    node.connect(p).connect(this.master);
    if (send) p.connect(this.g(send)).connect(this.verb);
    return p;
  }
  noise(t, len) { const s = this.ctx.createBufferSource(); s.buffer = this.nb; s.start(t, this.R() * 1.5); s.stop(t + len + .05); return s; }
  tone(t, f0, f1, gain, dec, pan, type = 'sine', send, att = .002) {
    const o = this.ctx.createOscillator(), gn = this.g(0);
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dec * 3);
    gn.gain.setValueAtTime(0, t);
    gn.gain.linearRampToValueAtTime(gain, t + att);
    gn.gain.setTargetAtTime(0, t + att, dec);
    o.connect(gn); this.out(gn, pan, send);
    o.start(t); o.stop(t + att + dec * 7);
    return o;
  }
  burst(t, freq, q, gain, dec, pan, send) {
    const s = this.noise(t, dec * 7), bp = this.f('bandpass', freq, q), gn = this.g(0);
    gn.gain.setValueAtTime(gain, t); gn.gain.setTargetAtTime(0, t + .001, dec);
    s.connect(bp).connect(gn); this.out(gn, pan, send);
  }

  // волна: воздух, полоса едет вверх и уходит, звук едет от руки к другому краю
  whoosh(t, pan, dur = .62, gain = .085) {
    const s = this.noise(t, dur + .3), bp = this.f('bandpass', 280, 1.1), gn = this.g(0), p = this.ctx.createStereoPanner();
    bp.frequency.setValueAtTime(280, t);
    bp.frequency.exponentialRampToValueAtTime(3800, t + dur * .55);
    bp.frequency.exponentialRampToValueAtTime(1400, t + dur);
    gn.gain.setValueAtTime(0, t);
    gn.gain.linearRampToValueAtTime(gain, t + .07);
    gn.gain.setTargetAtTime(0, t + dur * .45, dur * .3);
    p.pan.setValueAtTime(pan, t);
    p.pan.linearRampToValueAtTime(-pan * .6, t + dur);
    s.connect(bp).connect(gn).connect(p).connect(this.master);
    p.connect(this.g(.3)).connect(this.verb);
  }

  pixel(t, pan) {
    // восьмибитный подъём: квадрат, арпеджио вверх и короткое эхо ниже
    const n = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    n.forEach((f, i) => this.tone(t + .03 + i * .045, f, 0, .085, .04, pan * .5, 'square', .12, .001));
    this.tone(t + .3, 1046.5, 0, .045, .05, -pan * .3, 'square', .2, .001);
    this.tone(t + .03, 130.8, 65.4, .12, .09, 0, 'square', 0, .002);
    return .45;
  }

  ascii(t, pan) {
    // телетайп: удары ускоряются по ходу волны, в конце звоночек каретки
    let x = t + .03;
    for (let i = 0; i < 16; i++) {
      const p = pan * (1 - i / 16) + (this.R() - .5) * .5;
      this.burst(x, 2200 + this.R() * 1800, 3, .22 + this.R() * .08, .007, p, .1);
      this.tone(x, 900 + this.R() * 300, 0, .05, .014, p, 'triangle', .05, .001);
      x += .045 - i * .0017;
    }
    this.tone(x + .06, 2637, 0, .045, .35, -pan * .3, 'sine', .35, .002);
    this.tone(x + .06, 2637 * 2.01, 0, .012, .2, -pan * .3, 'sine', .35, .002);
    return x - t + .15;
  }

  glass(t, pan) {
    // бокал: негармоничные обертоны и двойник с биениями, сверху перелив
    const f0 = 1180, parts = [[1, .07, 1.1], [2.32, .035, .7], [4.25, .02, .45], [6.63, .012, .3]];
    for (const [k, a, d] of parts) {
      this.tone(t + .04, f0 * k, 0, a, d, pan * .4, 'sine', .45, .003);
      this.tone(t + .04, f0 * k * 1.004, 0, a * .6, d * .9, -pan * .2, 'sine', .45, .003);
    }
    for (let i = 0; i < 7; i++) this.tone(t + .12 + i * .055, 2400 + i * 260 + this.R() * 80, 0, .012, .25, (this.R() - .5) * 1.2, 'sine', .6, .02);
    return .15;
  }

  heat(t, pan) {
    // вспышка газа: глухой удар, пламя по полосе, потом треск
    const o = this.tone(t + .02, 95, 42, .3, .16, 0, 'sine', .1, .01);
    const s = this.noise(t, 1.4), bp = this.f('bandpass', 380, .8), gn = this.g(0);
    bp.frequency.setValueAtTime(380, t); bp.frequency.exponentialRampToValueAtTime(1100, t + .25); bp.frequency.exponentialRampToValueAtTime(500, t + 1.2);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.2, t + .06); gn.gain.setTargetAtTime(0, t + .25, .35);
    s.connect(bp).connect(gn); this.out(gn, pan * .4, .2);
    let x = t + .12;
    for (let i = 0; i < 22; i++) {
      x += .02 + this.R() * .06;
      this.burst(x, 1500 + this.R() * 3500, 1.5, .05 + this.R() * .1, .0025 + this.R() * .003, (this.R() - .5) * 1.4, .15);
    }
    return x - t + .05;
  }

  // Танос: песок сыплется, ветер уносит его вправо, как частицы на экране
  dustOut(t, pan) {
    const dur = 2.6;
    const s = this.noise(t, dur + .5), lp = this.f('lowpass', 5200, .5), hp = this.f('highpass', 500, .5), gn = this.g(0), p = this.ctx.createStereoPanner();
    lp.frequency.setValueAtTime(5200, t + .2); lp.frequency.exponentialRampToValueAtTime(700, t + dur);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.16, t + .35); gn.gain.setTargetAtTime(0, t + 1.1, .55);
    p.pan.setValueAtTime(pan * .5, t); p.pan.linearRampToValueAtTime(.85, t + dur);
    s.connect(hp).connect(lp).connect(gn).connect(p).connect(this.master);
    p.connect(this.g(.35)).connect(this.verb);
    // крупинки: гуще в начале, потом редеют и уходят вправо и вниз по высоте
    for (let i = 0; i < 230; i++) {
      const u = Math.pow(this.R(), 1.7), x = t + .06 + u * 2.2;
      this.burst(x, 6500 - u * 4500 + this.R() * 1500, 2.5, (.07 + this.R() * .06) * (1 - u * .8), .002 + this.R() * .004, pan * (1 - u) + u * .9 + (this.R() - .5) * .3, .3);
    }
    this.tone(t + .05, 220, 110, .07, .5, 0, 'sine', .4, .25);
    return 2.4;
  }

  dustIn(t, pan) {
    const dur = 1.25;
    const s = this.noise(t, dur + .4), lp = this.f('lowpass', 600, .5), hp = this.f('highpass', 450, .5), gn = this.g(0), p = this.ctx.createStereoPanner();
    lp.frequency.setValueAtTime(600, t); lp.frequency.exponentialRampToValueAtTime(6000, t + dur);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.15, t + dur * .9); gn.gain.setTargetAtTime(0, t + dur, .06);
    p.pan.setValueAtTime(.85, t); p.pan.linearRampToValueAtTime(pan * .3, t + dur);
    s.connect(hp).connect(lp).connect(gn).connect(p).connect(this.master);
    p.connect(this.g(.3)).connect(this.verb);
    for (let i = 0; i < 170; i++) {
      const u = 1 - Math.pow(this.R(), 1.6), x = t + .1 + u * (dur - .12);
      this.burst(x, 1800 + u * 5000, 2.5, (.04 + this.R() * .06) * (.3 + u * .7), .002 + this.R() * .003, .9 * (1 - u) + pan * u + (this.R() - .5) * .3, .25);
    }
    // собрался: мягкий мажорный аккорд
    const at = t + dur;
    [[261.6, .06], [392, .045], [523.3, .04], [659.3, .025]].forEach(([f, a], i) => this.tone(at + i * .012, f, 0, a, .5, (i - 1.5) * .25, 'sine', .4, .02));
    this.tone(at, 130.8, 0, .08, .25, 0, 'sine', .1, .01);
    return 2;
  }

  plain(t, pan) {
    this.tone(t + .03, 660, 0, .04, .12, pan * .4, 'sine', .3, .004);
    return .2;
  }

  play(from, to, pan) {
    if (this.muted) return 0;
    const ctx = this.ctx;
    if (ctx.state === 'suspended' && ctx.resume && !(ctx instanceof OfflineAudioContext)) ctx.resume().catch(() => {});
    const t = ctx.currentTime + .01;
    if (to === 5) return this.dustOut(t, pan);
    if (from === 5) return this.dustIn(t, pan);
    this.whoosh(t, pan);
    if (to === 1) return this.pixel(t, pan);
    if (to === 2) return this.ascii(t, pan);
    if (to === 3) return this.glass(t, pan);
    if (to === 4) return this.heat(t, pan);
    return this.plain(t, pan);
  }
}
