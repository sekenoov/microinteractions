import { ParticleField } from './ParticleField.js';

export class MetalRenderer {
  constructor(canvas, blurElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.blurElement = blurElement;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = 0;
    this.height = 0;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
  }

  setBlur(radius) {
    if (!this.blurElement) return;
    this.blurElement.setAttribute('stdDeviation', Math.max(1.2, radius * 0.55).toFixed(2));
  }

  paintParticles(field) {
    const { ctx } = this;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < field.count; i++) {
      ctx.beginPath();
      ctx.arc(field.curX[i], field.curY[i], field.radius[i], 0, Math.PI * 2);
      ctx.fill();
    }
  }

  paintMetalGradient() {
    const { ctx, width, height } = this;
    const gradient = ctx.createLinearGradient(0, 0, width * 0.7, height);
    gradient.addColorStop(0, '#f6f8fa');
    gradient.addColorStop(0.32, '#c7cdd6');
    gradient.addColorStop(0.5, '#5c636e');
    gradient.addColorStop(0.68, '#9199a3');
    gradient.addColorStop(1, '#eef2f4');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  paintPointerHighlight(pointer) {
    if (!pointer.active) return;
    const { ctx } = this;
    const highlight = ctx.createRadialGradient(
      pointer.x, pointer.y, 0,
      pointer.x, pointer.y, ParticleField.PULL_RADIUS * 0.8,
    );
    highlight.addColorStop(0, 'rgba(255,255,255,0.55)');
    highlight.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = highlight;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  draw(field, pointer) {
    const { ctx, width, height, dpr } = this;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';

    this.paintParticles(field);
    this.paintMetalGradient();
    this.paintPointerHighlight(pointer);

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }
}
