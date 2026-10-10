export class SceneRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.imageData = null;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.render();
  }

  render() {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#07070a';
    ctx.fillRect(0, 0, width, height);
    this.drawGrid();
    this.drawBlobs();
    this.drawLabel();
    this.drawRing();
    this.drawDots();
    this.imageData = ctx.getImageData(0, 0, width, height);
  }

  drawGrid() {
    const { ctx, width, height } = this;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 26) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  drawBlobs() {
    const { ctx, width, height } = this;
    const blobs = [
      [width * 0.24, height * 0.28, 130, '#ff4fd8'],
      [width * 0.76, height * 0.24, 150, '#38e0ff'],
      [width * 0.72, height * 0.78, 140, '#ffb347'],
      [width * 0.22, height * 0.76, 120, '#7c5cff'],
      [width * 0.5, height * 0.5, 90, '#4dffb0'],
    ];
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, radius, color] of blobs) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  drawLabel() {
    const { ctx, width, height } = this;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f4f6f8';
    ctx.font = `800 ${Math.round(width * 0.11)}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText('REFRACT', width / 2, height / 2);
  }

  drawRing() {
    const { ctx, width, height } = this;
    ctx.strokeStyle = 'rgba(244, 246, 248, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(width * 0.5 - width * 0.11, height * 0.5 - height * 0.2, width * 0.22, height * 0.4);
  }

  drawDots() {
    const { ctx, width, height } = this;
    const count = 26;
    const radius = Math.min(width, height) * 0.42;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = width / 2 + Math.cos(angle) * radius;
      const y = height / 2 + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.fillStyle = i % 2 === 0 ? '#38e0ff' : '#ff4fd8';
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
