export class GlyphSampler {
  static fontString(size) {
    return `800 ${size}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
  }

  static sample(word, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);

    const ctx = canvas.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let fontSize = Math.round(width * 0.2);
    ctx.font = GlyphSampler.fontString(fontSize);
    while (ctx.measureText(word).width > width * 0.78 && fontSize > 14) {
      fontSize -= 3;
      ctx.font = GlyphSampler.fontString(fontSize);
    }

    ctx.fillStyle = '#fff';
    ctx.fillText(word, canvas.width / 2, canvas.height / 2);

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const spacing = Math.max(2.6, Math.min(7.2, fontSize * 0.042));
    const radius = Math.max(2.0, Math.min(6.2, fontSize * 0.046));
    const points = [];

    for (let y = 0; y < canvas.height; y += spacing) {
      for (let x = 0; x < canvas.width; x += spacing) {
        const alphaIndex = (Math.round(y) * canvas.width + Math.round(x)) * 4 + 3;
        if (data[alphaIndex] > 140) {
          points.push([
            x + (Math.random() - 0.5) * spacing * 0.5,
            y + (Math.random() - 0.5) * spacing * 0.5,
          ]);
        }
      }
    }

    return { points, radius };
  }
}
