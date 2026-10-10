function clampIndex(value, max) {
  const v = value | 0;
  if (v < 0) return 0;
  if (v >= max) return max - 1;
  return v;
}

export class LensRenderer {
  constructor(canvas, size) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = size;
    canvas.width = size;
    canvas.height = size;
    this.imageData = this.ctx.createImageData(size, size);
  }

  render(scene, displacement, focusX, focusY) {
    const { data } = this.imageData;
    const source = scene.imageData.data;
    const sceneWidth = scene.width;
    const sceneHeight = scene.height;
    const { mask, rx, ry, gx, gy, bx, by } = displacement;
    const count = this.size * this.size;

    for (let i = 0, p = 0; i < count; i++, p += 4) {
      if (!mask[i]) {
        data[p + 3] = 0;
        continue;
      }

      const redX = clampIndex(focusX + rx[i], sceneWidth);
      const redY = clampIndex(focusY + ry[i], sceneHeight);
      const greenX = clampIndex(focusX + gx[i], sceneWidth);
      const greenY = clampIndex(focusY + gy[i], sceneHeight);
      const blueX = clampIndex(focusX + bx[i], sceneWidth);
      const blueY = clampIndex(focusY + by[i], sceneHeight);

      data[p] = source[(redY * sceneWidth + redX) * 4];
      data[p + 1] = source[(greenY * sceneWidth + greenX) * 4 + 1];
      data[p + 2] = source[(blueY * sceneWidth + blueX) * 4 + 2];
      data[p + 3] = 255;
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }
}
