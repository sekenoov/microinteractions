export class DisplacementMap {
  constructor(size, bulgePower, chromaStrength) {
    this.size = size;
    this.bulgePower = bulgePower;
    this.chromaStrength = chromaStrength;
    this.mask = new Uint8Array(0);
    this.rx = new Float32Array(0);
    this.ry = new Float32Array(0);
    this.gx = new Float32Array(0);
    this.gy = new Float32Array(0);
    this.bx = new Float32Array(0);
    this.by = new Float32Array(0);
  }

  build(magnification) {
    const { size, bulgePower, chromaStrength } = this;
    const radius = size / 2;
    const count = size * size;
    const sourceHalf = radius / magnification;

    this.mask = new Uint8Array(count);
    this.rx = new Float32Array(count);
    this.ry = new Float32Array(count);
    this.gx = new Float32Array(count);
    this.gy = new Float32Array(count);
    this.bx = new Float32Array(count);
    this.by = new Float32Array(count);

    for (let y = 0; y < size; y++) {
      const dy = y - radius + 0.5;
      for (let x = 0; x < size; x++) {
        const dx = x - radius + 0.5;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const t = distance / radius;
        const index = y * size + x;

        if (t > 1) {
          this.mask[index] = 0;
          continue;
        }

        this.mask[index] = 1;
        const angle = Math.atan2(dy, dx);
        const bulge = Math.pow(t, bulgePower) * sourceHalf;
        const baseX = Math.cos(angle) * bulge;
        const baseY = Math.sin(angle) * bulge;
        const chroma = chromaStrength * t;
        const chromaX = Math.cos(angle) * chroma;
        const chromaY = Math.sin(angle) * chroma;

        this.rx[index] = baseX + chromaX;
        this.ry[index] = baseY + chromaY;
        this.gx[index] = baseX;
        this.gy[index] = baseY;
        this.bx[index] = baseX - chromaX;
        this.by[index] = baseY - chromaY;
      }
    }
  }
}
