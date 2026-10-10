export class ParticleField {
  static PULL_RADIUS = 150;
  static PULL_AMOUNT = 78;
  static STIFFNESS = 0.16;
  static DAMPING = 0.8;

  constructor() {
    this.count = 0;
    this.baseX = new Float32Array(0);
    this.baseY = new Float32Array(0);
    this.curX = new Float32Array(0);
    this.curY = new Float32Array(0);
    this.velX = new Float32Array(0);
    this.velY = new Float32Array(0);
    this.phase = new Float32Array(0);
    this.radius = new Float32Array(0);
  }

  static allocate(count) {
    return {
      baseX: new Float32Array(count),
      baseY: new Float32Array(count),
      curX: new Float32Array(count),
      curY: new Float32Array(count),
      velX: new Float32Array(count),
      velY: new Float32Array(count),
      phase: new Float32Array(count),
      radius: new Float32Array(count),
    };
  }

  static shuffledIndices(length) {
    const indices = Array.from({ length }, (_, i) => i);
    for (let i = length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }

  retarget(points, radius, morph) {
    const nextCount = points.length;
    const next = ParticleField.allocate(nextCount);
    const order = morph && this.count > 0 ? ParticleField.shuffledIndices(this.count) : null;

    for (let i = 0; i < nextCount; i++) {
      next.baseX[i] = points[i][0];
      next.baseY[i] = points[i][1];

      if (order) {
        const source = order[i % this.count];
        next.curX[i] = this.curX[source];
        next.curY[i] = this.curY[source];
        next.velX[i] = this.velX[source] * 0.7;
        next.velY[i] = this.velY[source] * 0.7;
      } else {
        next.curX[i] = points[i][0];
        next.curY[i] = points[i][1];
      }

      next.phase[i] = Math.random() * Math.PI * 2;
      next.radius[i] = radius + Math.random() * radius * 0.4;
    }

    this.count = nextCount;
    Object.assign(this, next);
  }

  targetFor(index, time, pointer) {
    let x = this.baseX[index] + Math.sin(time * 1.4 + this.phase[index]) * 1.6;
    let y = this.baseY[index] + Math.cos(time * 1.1 + this.phase[index]) * 1.6;

    if (!pointer.active) return [x, y];

    const dx = pointer.x - this.baseX[index];
    const dy = pointer.y - this.baseY[index];
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance >= ParticleField.PULL_RADIUS) return [x, y];

    const pull = Math.pow(1 - distance / ParticleField.PULL_RADIUS, 1.6) * ParticleField.PULL_AMOUNT;
    const inverse = distance > 0.001 ? 1 / distance : 0;
    x += dx * inverse * pull;
    y += dy * inverse * pull;
    return [x, y];
  }

  update(time, pointer) {
    for (let i = 0; i < this.count; i++) {
      const [targetX, targetY] = this.targetFor(i, time, pointer);

      this.velX[i] = (this.velX[i] + (targetX - this.curX[i]) * ParticleField.STIFFNESS) * ParticleField.DAMPING;
      this.velY[i] = (this.velY[i] + (targetY - this.curY[i]) * ParticleField.STIFFNESS) * ParticleField.DAMPING;
      this.curX[i] += this.velX[i];
      this.curY[i] += this.velY[i];
    }
  }
}
