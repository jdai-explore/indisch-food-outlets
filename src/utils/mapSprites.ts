export interface GeneratedSprite {
  width: number;
  height: number;
  data: Uint8Array;
  pixelRatio: number;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Generates crisp Retina (2x) WebGL sprites on demand for MapLibre's `styleimagemissing` event:
 * - `pin-rated|<hex>|<rating>` -> Airbnb/Apple Maps-style rating pill with beak pointer
 * - `pin-open|<hex>`           -> Sculpted architectural teardrop pin with diamond sparkle
 * - `cluster|<count>`          -> Translucent halo medallion with exact cluster count
 */
export function generateMapSprite(id: string): GeneratedSprite | null {
  if (typeof document === 'undefined') return null;

  const parts = id.split('|');
  const kind = parts[0];
  const dpr = 2;

  if (kind === 'pin-rated' && parts.length >= 3) {
    const color = parts[1];
    const ratingText = parts[2];
    const logicalW = 54;
    const logicalH = 34;

    const canvas = document.createElement('canvas');
    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(dpr, dpr);

    // Subtle elevation shadow
    ctx.save();
    ctx.shadowColor = 'rgba(13, 15, 18, 0.34)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;

    const pillX = 4;
    const pillY = 3;
    const pillW = logicalW - 8;
    const pillH = 22;
    const r = 11;
    const midX = logicalW / 2;

    // Pill + downward pointer beak as one seamless silhouette
    ctx.beginPath();
    ctx.moveTo(pillX + r, pillY);
    ctx.lineTo(pillX + pillW - r, pillY);
    ctx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + r);
    ctx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - r, pillY + pillH);
    ctx.lineTo(midX + 4.5, pillY + pillH);
    ctx.lineTo(midX, pillY + pillH + 5.5);
    ctx.lineTo(midX - 4.5, pillY + pillH);
    ctx.lineTo(pillX + r, pillY + pillH);
    ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + r);
    ctx.quadraticCurveTo(pillX, pillY, pillX + r, pillY);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();

    // Crisp white border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Crisp star + tabular rating text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 10.5px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`★ ${ratingText}`, midX, pillY + pillH / 2 + 0.5);

    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return {
      width: canvas.width,
      height: canvas.height,
      data: new Uint8Array(img.data.buffer),
      pixelRatio: dpr,
    };
  }

  if (kind === 'pin-open' && parts.length >= 2) {
    const color = parts[1];
    const logicalW = 28;
    const logicalH = 34;

    const canvas = document.createElement('canvas');
    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(dpr, dpr);

    const cx = logicalW / 2;
    const cy = 12.5;
    const radius = 8.8;

    ctx.save();
    ctx.shadowColor = 'rgba(13, 15, 18, 0.32)';
    ctx.shadowBlur = 4.5;
    ctx.shadowOffsetY = 2;

    // Architectural teardrop silhouette
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI * 0.82, Math.PI * 0.18, false);
    ctx.quadraticCurveTo(cx + 3.5, cy + 10, cx, 30);
    ctx.quadraticCurveTo(cx - 3.5, cy + 10, cx - radius * Math.cos(Math.PI * 0.18), cy + radius * Math.sin(Math.PI * 0.18));
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner crisp 4-point spice diamond motif
    ctx.beginPath();
    ctx.moveTo(cx, cy - 3.6);
    ctx.lineTo(cx + 3.2, cy);
    ctx.lineTo(cx, cy + 3.6);
    ctx.lineTo(cx - 3.2, cy);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return {
      width: canvas.width,
      height: canvas.height,
      data: new Uint8Array(img.data.buffer),
      pixelRatio: dpr,
    };
  }

  if (kind === 'cluster' && parts.length >= 2) {
    const count = Number(parts[1]) || 0;
    const label = count > 999 ? '999+' : String(count);
    const logicalSize = count >= 50 ? 48 : count >= 15 ? 40 : 34;

    const canvas = document.createElement('canvas');
    canvas.width = logicalSize * dpr;
    canvas.height = logicalSize * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(dpr, dpr);

    const cx = logicalSize / 2;
    const cy = logicalSize / 2;
    const bg = count >= 50 ? '#0F766E' : count >= 15 ? '#BE123C' : '#D97706';
    const outerR = logicalSize / 2 - 2;
    const innerR = outerR - 4;

    // Soft translucent outer halo
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fillStyle = count >= 50 ? 'rgba(15, 118, 110, 0.24)' : count >= 15 ? 'rgba(190, 18, 60, 0.24)' : 'rgba(217, 119, 6, 0.24)';
    ctx.fill();

    // Crisp inner medallion
    ctx.save();
    ctx.shadowColor = 'rgba(13, 15, 18, 0.28)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Count text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${count >= 100 ? 11.5 : 12}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy + 0.5);

    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return {
      width: canvas.width,
      height: canvas.height,
      data: new Uint8Array(img.data.buffer),
      pixelRatio: dpr,
    };
  }

  // Fallback pill (unused)
  void drawRoundedRectPath;
  return null;
}
