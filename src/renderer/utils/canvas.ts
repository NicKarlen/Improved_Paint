import Tesseract from 'tesseract.js';
import { StepIndicator, Shape, TextAnnotation, Tab, AppSettings } from '../../shared/types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Derive the next tab name from existing tabs.
 * If tabs exist, base it on the first tab's name and increment the trailing number.
 * Handles patterns like "Name 2", "Name nr3", "Name nr.3", "Name nr 3".
 */
export function nextTabName(tabs: Tab[], fallback = 'Screenshot'): string {
  if (tabs.length === 0) return `${fallback} 1`;

  const first = tabs[0].name;
  // Match optional "nr"/"nr."/"nr " prefix before the trailing number
  const m = first.match(/^(.*?)\s*(?:nr\.?\s*)?(\d+)\s*$/i);
  if (m) {
    const base = m[1];
    // Find the highest number across all tabs with the same base
    let max = 0;
    const basePattern = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:nr\\.?\\s*)?(\\d+)\\s*$`, 'i');
    for (const t of tabs) {
      const tm = t.name.match(basePattern);
      if (tm) max = Math.max(max, parseInt(tm[1], 10));
    }
    // Preserve the original numbering style
    const sep = first.slice(m[1].length, first.length - m[2].length);
    return `${base}${sep}${max + 1}`;
  }

  // No trailing number — append " 2" (first tab is implicitly "1")
  return `${first} ${tabs.length + 1}`;
}

export function fitToCanvasFrame(
  dataURL: string, width: number, height: number, bgColor: string
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(width / img.width, height / img.height);
      const sw = Math.round(img.width * scale);
      const sh = Math.round(img.height * scale);
      const ox = Math.round((width - sw) / 2);
      const oy = Math.round((height - sh) / 2);
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, ox, oy, sw, sh);
      resolve(c.toDataURL('image/png'));
    };
    img.src = dataURL;
  });
}

export function maybeApplyCanvasFrame(
  dataURL: string, settings: AppSettings
): Promise<string> {
  if (!settings.canvasFrameEnabled) return Promise.resolve(dataURL);
  return fitToCanvasFrame(
    dataURL, settings.canvasFrameWidth, settings.canvasFrameHeight, settings.canvasFrameBgColor
  );
}

export function createThumbnail(dataURL: string, maxSize = 80): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/png'));
    };
    img.src = dataURL;
  });
}

export function formatStepLabel(n: number, style: 'decimal' | 'roman'): string {
  if (style === 'decimal') return `${n}.`;
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
  return `${romans[n - 1] || n}.`;
}

export function renderStepIndicator(
  ctx: CanvasRenderingContext2D,
  indicator: StepIndicator,
  scale: number,
  stepSize: number,
  color = '#0ea5e9'
) {
  const x = indicator.x * scale;
  const y = indicator.y * scale;
  const size = stepSize * scale;
  const fontSize = (stepSize / 2) * scale;

  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = '#fff';
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(indicator.label, x, y);
}

const TEXT_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

/** Measure text annotation dimensions (for hit-testing and rendering) */
export function measureTextAnnotation(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  scale: number
): { width: number; height: number } {
  const fs = fontSize * scale;
  const padX = 6 * scale;
  const padY = 3 * scale;
  ctx.font = `600 ${fs}px ${TEXT_FONT}`;
  const lines = text.split('\n');
  let maxW = 0;
  for (const line of lines) {
    const m = ctx.measureText(line || ' ');
    if (m.width > maxW) maxW = m.width;
  }
  const lineHeight = fs * 1.2;
  return {
    width: maxW + padX * 2,
    height: lineHeight * lines.length + padY * 2,
  };
}

/** Draw a styled text callout box on the canvas */
export function renderTextAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: TextAnnotation,
  scale: number
) {
  const x = annotation.x * scale;
  const y = annotation.y * scale;
  const fs = annotation.fontSize * scale;
  const padX = 6 * scale;
  const padY = 3 * scale;
  const r = 4 * scale;

  ctx.save();
  ctx.font = `600 ${fs}px ${TEXT_FONT}`;

  const lines = annotation.text.split('\n');
  let maxW = 0;
  for (const line of lines) {
    const m = ctx.measureText(line || ' ');
    if (m.width > maxW) maxW = m.width;
  }
  const lineHeight = fs * 1.2;
  const boxW = maxW + padX * 2;
  const boxH = lineHeight * lines.length + padY * 2;

  // Background pill
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + boxW - r, y);
  ctx.arcTo(x + boxW, y, x + boxW, y + r, r);
  ctx.lineTo(x + boxW, y + boxH - r);
  ctx.arcTo(x + boxW, y + boxH, x + boxW - r, y + boxH, r);
  ctx.lineTo(x + r, y + boxH);
  ctx.arcTo(x, y + boxH, x, y + boxH - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();

  ctx.fillStyle = annotation.color;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Text — center each line vertically in its slot
  // Nudge down by ~8% of font size to compensate for ascender/descender imbalance
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const nudge = fs * 0.08;
  for (let i = 0; i < lines.length; i++) {
    const slotCenter = padY + lineHeight * i + lineHeight / 2 + nudge;
    ctx.fillText(lines[i], x + padX, y + slotCenter);
  }

  ctx.restore();
}

/** Draw outlined chevron-style arrow (stroked head+shaft + stroked chevron tails) */
function drawChevronArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  scale: number, sw: number, color: string, chevrons: boolean
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;

  const angle = Math.atan2(dy, dx);
  const ax = Math.cos(angle);
  const ay = Math.sin(angle);
  const px = -ay;
  const py = ax;

  const pt = (t: number, p: number): [number, number] =>
    [x2 - ax * t + px * p, y2 - ay * t + py * p];

  // Sizing
  const stroke = Math.max(sw * 1.5, 3 * scale);
  const shaftHalf = Math.max(sw * 2, 8 * scale);
  const headLen = Math.min(len * 0.30, shaftHalf * 5);
  const headHalf = shaftHalf * 2.2;

  const chevDepth = shaftHalf * 1.4;
  const chevHalf = shaftHalf * 0.9;
  const chevGap = shaftHalf * 0.7;
  const firstChevGap = shaftHalf * 1.4;
  const numChev = 3;

  const chevTotal = numChev * chevDepth + (numChev - 1) * chevGap + firstChevGap;
  const canFitChevrons = chevrons && len > headLen + chevTotal + chevGap;
  const hasShaft = len > headLen + shaftHalf;
  const shaftEnd = canFitChevrons
    ? Math.max(headLen + shaftHalf * 0.3, len - chevTotal)
    : len;

  ctx.strokeStyle = color;
  ctx.lineWidth = stroke;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Head + shaft outline
  ctx.beginPath();
  ctx.moveTo(...pt(0, 0));
  ctx.lineTo(...pt(headLen, -headHalf));
  ctx.lineTo(...pt(headLen, -shaftHalf));
  if (hasShaft) {
    ctx.lineTo(...pt(shaftEnd, -shaftHalf));
    ctx.lineTo(...pt(shaftEnd, shaftHalf));
  }
  ctx.lineTo(...pt(headLen, shaftHalf));
  ctx.lineTo(...pt(headLen, headHalf));
  ctx.closePath();
  ctx.stroke();

  // Chevron tails — stroked ">" shapes
  if (canFitChevrons) {
    ctx.lineJoin = 'round';
    for (let i = 0; i < numChev; i++) {
      const s = shaftEnd + firstChevGap + i * (chevDepth + chevGap);
      ctx.beginPath();
      ctx.moveTo(...pt(s + chevDepth, -chevHalf));
      ctx.lineTo(...pt(s, 0));
      ctx.lineTo(...pt(s + chevDepth, chevHalf));
      ctx.stroke();
    }
  }
}

/** Pixelate a rectangular region on the canvas */
export function renderBlurShape(ctx: CanvasRenderingContext2D, shape: Shape, scale: number) {
  const rx = Math.min(shape.x1, shape.x2) * scale;
  const ry = Math.min(shape.y1, shape.y2) * scale;
  const rw = Math.abs(shape.x2 - shape.x1) * scale;
  const rh = Math.abs(shape.y2 - shape.y1) * scale;
  if (rw < 2 || rh < 2) return;

  const strength = shape.blurStrength || 8;
  const pixelRx = Math.round(rx);
  const pixelRy = Math.round(ry);
  const pixelRw = Math.round(rw);
  const pixelRh = Math.round(rh);

  // Clamp to canvas bounds
  const cx = Math.max(0, pixelRx);
  const cy = Math.max(0, pixelRy);
  const cw = Math.min(pixelRw, ctx.canvas.width - cx);
  const ch = Math.min(pixelRh, ctx.canvas.height - cy);
  if (cw < 1 || ch < 1) return;

  // Use image-space dimensions for pixelation so blur looks the same at any zoom
  const imgW = Math.abs(shape.x2 - shape.x1);
  const imgH = Math.abs(shape.y2 - shape.y1);
  const tinyW = Math.max(1, Math.round(imgW / strength));
  const tinyH = Math.max(1, Math.round(imgH / strength));
  const tiny = document.createElement('canvas');
  tiny.width = tinyW;
  tiny.height = tinyH;
  const tctx = tiny.getContext('2d')!;
  tctx.imageSmoothingEnabled = true;
  tctx.drawImage(ctx.canvas, cx, cy, cw, ch, 0, 0, tinyW, tinyH);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(cx, cy, cw, ch);
  ctx.drawImage(tiny, 0, 0, tinyW, tinyH, cx, cy, cw, ch);
  ctx.restore();
}

export function renderShape(ctx: CanvasRenderingContext2D, shape: Shape, scale: number) {
  const x1 = shape.x1 * scale;
  const y1 = shape.y1 * scale;
  const x2 = shape.x2 * scale;
  const y2 = shape.y2 * scale;
  const sw = shape.strokeWidth * scale;

  ctx.save();
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.color;
  ctx.lineWidth = sw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (shape.type === 'rect') {
    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);

    if (shape.rectMode === 'blackout' || shape.rectMode === 'whiteout') {
      // Solid censor block — completely opaque
      const censorColor = shape.rectMode === 'blackout' ? '#000' : '#fff';
      ctx.fillStyle = censorColor;
      ctx.strokeStyle = censorColor;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
    } else if (shape.filled && sw < 0.5) {
      // Solid opaque fill, no border (used by simplify rects)
      ctx.fillRect(rx, ry, rw, rh);
    } else if (shape.filled) {
      // Filled rect with slight transparency + solid border
      ctx.globalAlpha = 0.18;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.globalAlpha = 1;
      ctx.strokeRect(rx, ry, rw, rh);
    } else {
      // Outline with rounded corners
      const r = Math.min(4 * scale, rw / 4, rh / 4);
      ctx.beginPath();
      ctx.moveTo(rx + r, ry);
      ctx.lineTo(rx + rw - r, ry);
      ctx.arcTo(rx + rw, ry, rx + rw, ry + r, r);
      ctx.lineTo(rx + rw, ry + rh - r);
      ctx.arcTo(rx + rw, ry + rh, rx + rw - r, ry + rh, r);
      ctx.lineTo(rx + r, ry + rh);
      ctx.arcTo(rx, ry + rh, rx, ry + rh - r, r);
      ctx.lineTo(rx, ry + r);
      ctx.arcTo(rx, ry, rx + r, ry, r);
      ctx.closePath();
      ctx.stroke();
    }
  } else if (shape.type === 'arrow') {
    drawChevronArrow(ctx, x1, y1, x2, y2, scale, sw, shape.color, shape.arrowChevrons);
  } else if (shape.type === 'blur') {
    // Blur is rendered separately via renderBlurShape before other shapes
  }

  ctx.restore();
}

/** Distance from point to shape, for hit-testing right-click delete */
export function distanceToShape(shape: Shape, px: number, py: number): number {
  if (shape.type === 'rect' || shape.type === 'blur') {
    const rx = Math.min(shape.x1, shape.x2);
    const ry = Math.min(shape.y1, shape.y2);
    const rw = Math.abs(shape.x2 - shape.x1);
    const rh = Math.abs(shape.y2 - shape.y1);
    // Distance to nearest edge
    const cx = Math.max(rx, Math.min(px, rx + rw));
    const cy = Math.max(ry, Math.min(py, ry + rh));
    const edgeDist = Math.hypot(px - cx, py - cy);
    // If inside, distance to nearest edge
    if (px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) {
      return Math.min(px - rx, rx + rw - px, py - ry, ry + rh - py);
    }
    return edgeDist;
  } else {
    // Distance from point to line segment
    const dx = shape.x2 - shape.x1;
    const dy = shape.y2 - shape.y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - shape.x1, py - shape.y1);
    const t = Math.max(0, Math.min(1, ((px - shape.x1) * dx + (py - shape.y1) * dy) / lenSq));
    const projX = shape.x1 + t * dx;
    const projY = shape.y1 + t * dy;
    return Math.hypot(px - projX, py - projY);
  }
}

export function drawImageWithBorder(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  borderColor: string,
  borderWidth: number,
  renderScale: number
): { width: number; height: number } {
  const bw = borderWidth * renderScale;
  const iw = img.width * renderScale;
  const ih = img.height * renderScale;
  const totalW = Math.round(iw + bw * 2);
  const totalH = Math.round(ih + bw * 2);

  if (borderWidth > 0) {
    ctx.fillStyle = borderColor;
    ctx.fillRect(0, 0, totalW, totalH);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, bw, bw, iw, ih);

  return { width: totalW, height: totalH };
}

// ── Watermark ──

let defaultWatermarkImg: HTMLImageElement | null = null;
let defaultWatermarkLoading = false;
const defaultWatermarkCallbacks: Array<(img: HTMLImageElement) => void> = [];

export function loadWatermark(customDataURL?: string | null): Promise<HTMLImageElement> {
  if (customDataURL) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = customDataURL;
    });
  }
  if (defaultWatermarkImg) return Promise.resolve(defaultWatermarkImg);
  return new Promise((resolve) => {
    defaultWatermarkCallbacks.push(resolve);
    if (defaultWatermarkLoading) return;
    defaultWatermarkLoading = true;
    const img = new Image();
    img.onload = () => {
      defaultWatermarkImg = img;
      for (const cb of defaultWatermarkCallbacks) cb(img);
      defaultWatermarkCallbacks.length = 0;
    };
    // Vite serves files from the renderer root
    img.src = new URL('../favicon.png', import.meta.url).href;
  });
}

const WATERMARK_PADDING = 6;
const WATERMARK_OPACITY = 0.45;

export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  wm: HTMLImageElement,
  canvasW: number,
  canvasH: number,
  scale: number,
  wmSize = 24
) {
  // Fit within wmSize box while preserving aspect ratio
  const ratio = wm.width / wm.height;
  const maxPx = wmSize * scale;
  const w = ratio >= 1 ? maxPx : maxPx * ratio;
  const h = ratio >= 1 ? maxPx / ratio : maxPx;
  const pad = WATERMARK_PADDING * scale;
  const x = canvasW - w - pad;
  const y = canvasH - h - pad;
  ctx.save();
  ctx.globalAlpha = WATERMARK_OPACITY;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(wm, x, y, w, h);
  ctx.restore();
}

// ── Simplify (text detection) ──

const GRAY_BUCKETS = ['#d0d0d0', '#a8a8a8', '#808080', '#585858'] as const;

function luminanceToGray(luminance: number): string {
  // Higher luminance (lighter background) → lighter gray; darker bg → darker gray
  if (luminance > 190) return GRAY_BUCKETS[0];
  if (luminance > 127) return GRAY_BUCKETS[1];
  if (luminance > 64) return GRAY_BUCKETS[2];
  return GRAY_BUCKETS[3];
}

export async function detectTextRegions(
  imageDataURL: string,
  onProgress?: (msg: string) => void
): Promise<Array<{ x: number; y: number; w: number; h: number; gray: string }>> {
  // Load image onto offscreen canvas to sample pixel data
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Failed to load image'));
    i.src = imageDataURL;
  });
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, c.width, c.height);

  // Run Tesseract OCR — create worker with progress logging
  onProgress?.('Loading OCR engine...');
  const worker = await Tesseract.createWorker('eng', undefined, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        onProgress?.(`Recognizing text... ${Math.round(m.progress * 100)}%`);
      } else {
        onProgress?.(m.status);
      }
    },
  });
  let page;
  try {
    const result = await worker.recognize(imageDataURL, {}, { blocks: true });
    page = result.data;
  } finally {
    await worker.terminate();
  }
  // Use line-level bounding boxes from Tesseract for more stable results
  const merged: Array<{ x: number; y: number; w: number; h: number }> = [];
  const imgW = c.width;
  const imgH = c.height;
  const CONF_THRESHOLD = 60;
  const MIN_SIZE = 8;
  const MAX_WIDTH_RATIO = 0.8;

  for (const block of page.blocks || []) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        // Check if most words in the line are confident enough
        const confidentWords = line.words.filter((w: { confidence: number }) => w.confidence >= CONF_THRESHOLD);
        if (confidentWords.length < line.words.length * 0.5) continue;

        const { x0, y0, x1, y1 } = line.bbox;
        const w = x1 - x0;
        const h = y1 - y0;
        // Filter tiny and unreasonably large detections
        if (w < MIN_SIZE || h < MIN_SIZE) continue;
        if (w > imgW * MAX_WIDTH_RATIO) continue;

        merged.push({ x: x0, y: y0, w, h });
      }
    }
  }

  // Fallback: if no lines passed, try word-level merge
  if (merged.length === 0) {
    const words: Array<{ bbox: { x0: number; y0: number; x1: number; y1: number }; confidence: number }> = [];
    for (const block of page.blocks || []) {
      for (const para of block.paragraphs) {
        for (const line of para.lines) {
          for (const word of line.words) {
            words.push(word);
          }
        }
      }
    }
    const sorted = [...words]
      .filter(w => w.confidence >= CONF_THRESHOLD && (w.bbox.x1 - w.bbox.x0) >= MIN_SIZE && (w.bbox.y1 - w.bbox.y0) >= MIN_SIZE)
      .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);

    for (const word of sorted) {
      const { x0, y0, x1, y1 } = word.bbox;
      if ((x1 - x0) > imgW * MAX_WIDTH_RATIO) continue;
      const last = merged[merged.length - 1];
      if (last) {
        const lastBottom = last.y + last.h;
        const vOverlap = Math.min(lastBottom, y1) - Math.max(last.y, y0);
        const lineHeight = Math.min(last.h, y1 - y0);
        const hGap = x0 - (last.x + last.w);
        if (vOverlap > lineHeight * 0.5 && hGap < lineHeight * 1.5) {
          const newX = Math.min(last.x, x0);
          const newY = Math.min(last.y, y0);
          last.w = Math.max(last.x + last.w, x1) - newX;
          last.h = Math.max(lastBottom, y1) - newY;
          last.x = newX;
          last.y = newY;
          continue;
        }
      }
      merged.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
  }

  if (merged.length === 0) return [];

  // Pad each rect so text is fully covered
  const pad = 4;
  for (const r of merged) {
    r.x = Math.max(0, r.x - pad);
    r.y = Math.max(0, r.y - pad);
    r.w += pad * 2;
    r.h += pad * 2;
  }

  // Sample background luminance around each rect and assign gray tone
  return merged.map((r) => {
    // Sample a thin margin around the rect
    const margin = 4;
    const sx = Math.max(0, r.x - margin);
    const sy = Math.max(0, r.y - margin);
    const ex = Math.min(c.width, r.x + r.w + margin);
    const ey = Math.min(c.height, r.y + r.h + margin);

    let totalLum = 0;
    let count = 0;
    // Sample top and bottom edges
    for (let x = sx; x < ex; x += 2) {
      for (const y of [sy, ey - 1]) {
        if (y < 0 || y >= c.height) continue;
        const idx = (y * c.width + x) * 4;
        totalLum += imgData.data[idx] * 0.299 + imgData.data[idx + 1] * 0.587 + imgData.data[idx + 2] * 0.114;
        count++;
      }
    }
    const avgLum = count > 0 ? totalLum / count : 200;
    return { ...r, gray: luminanceToGray(avgLum) };
  });
}

export async function compositeExport(
  baseDataURL: string,
  indicators: StepIndicator[],
  shapes: Shape[],
  borderColor: string,
  borderWidth: number,
  stepSize: number,
  watermarkDataURL?: string | null,
  watermarkSize = 24,
  textAnnotations: TextAnnotation[] = []
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.src = baseDataURL;
  });

  const c = document.createElement('canvas');
  c.width = img.width + borderWidth * 2;
  c.height = img.height + borderWidth * 2;
  const ctx = c.getContext('2d')!;

  drawImageWithBorder(ctx, img, borderColor, borderWidth, 1);

  // Render blur shapes first (they need underlying pixels)
  for (const s of shapes) {
    if (s.type === 'blur') {
      renderBlurShape(ctx, { ...s, x1: s.x1 + borderWidth, y1: s.y1 + borderWidth, x2: s.x2 + borderWidth, y2: s.y2 + borderWidth }, 1);
    }
  }
  for (const s of shapes) {
    if (s.type !== 'blur') {
      renderShape(ctx, { ...s, x1: s.x1 + borderWidth, y1: s.y1 + borderWidth, x2: s.x2 + borderWidth, y2: s.y2 + borderWidth }, 1);
    }
  }

  for (const ind of indicators) {
    renderStepIndicator(ctx, { ...ind, x: ind.x + borderWidth, y: ind.y + borderWidth }, 1, stepSize, ind.color);
  }

  for (const ta of textAnnotations) {
    renderTextAnnotation(ctx, { ...ta, x: ta.x + borderWidth, y: ta.y + borderWidth }, 1);
  }

  if (watermarkDataURL) {
    const wm = await loadWatermark(watermarkDataURL);
    drawWatermark(ctx, wm, c.width, c.height, 1, watermarkSize);
  }

  return c.toDataURL('image/png');
}
