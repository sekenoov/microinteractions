import { GlyphSampler } from './GlyphSampler.js';
import { ParticleField } from './ParticleField.js';
import { PointerTracker } from './PointerTracker.js';
import { MetalRenderer } from './MetalRenderer.js';

export class LiquidMetalApp {
  constructor(canvas, input, blurElement) {
    this.canvas = canvas;
    this.input = input;
    this.renderer = new MetalRenderer(canvas, blurElement);
    this.field = new ParticleField();
    this.pointer = new PointerTracker(canvas);
    this.word = (input?.value || 'FLOW').trim().toUpperCase() || 'FLOW';
    this.time = 0;
    this.frame = null;
    this.running = false;

    this.tick = this.tick.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.bindInput();
    window.addEventListener('resize', this.handleResize);
  }

  bindInput() {
    if (!this.input) return;
    this.input.addEventListener('input', this.handleInput);
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.input.blur();
    });
  }

  handleInput() {
    const value = this.input.value.trim().toUpperCase();
    this.word = value || 'FLOW';
    if (this.renderer.width > 0) this.applyWord(true);
  }

  handleResize() {
    if (!this.running) return;
    this.renderer.resize();
    this.applyWord(false);
  }

  applyWord(morph) {
    const { points, radius } = GlyphSampler.sample(this.word, this.renderer.width, this.renderer.height);
    this.renderer.setBlur(radius);
    this.field.retarget(points, radius, morph);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.frame = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
  }

  ensureSized() {
    if (this.field.count > 0) return true;
    this.renderer.resize();
    if (this.renderer.width === 0 || this.renderer.height === 0) return false;
    this.applyWord(false);
    return true;
  }

  tick() {
    if (this.ensureSized()) {
      this.time += 0.02;
      this.field.update(this.time, this.pointer);
      this.renderer.draw(this.field, this.pointer);
    }
    if (this.running) this.frame = requestAnimationFrame(this.tick);
  }
}
