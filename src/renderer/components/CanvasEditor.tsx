import { useRef, useEffect, useCallback, useState } from 'react';
import { useAppState } from '../store/AppContext';
import { Shape, TextAnnotation } from '../../shared/types';
import {
  generateId, nextTabName, formatStepLabel, renderStepIndicator,
  renderShape, renderBlurShape, distanceToShape, drawImageWithBorder,
  drawWatermark, loadWatermark, renderTextAnnotation, measureTextAnnotation,
  createThumbnail, compositeExport, maybeApplyCanvasFrame,
} from '../utils/canvas';

interface FloatingOverlay {
  image: HTMLImageElement;
  x: number;
  y: number;
}

interface DrawingShape {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// For select/move/resize
type DragTarget =
  | { kind: 'step'; id: string; offsetX: number; offsetY: number }
  | { kind: 'shape'; id: string; handle: 'body' | 'x1y1' | 'x2y2' | 'x1y2' | 'x2y1'; offsetX: number; offsetY: number }
  | { kind: 'text'; id: string; offsetX: number; offsetY: number };

export default function CanvasEditor() {
  const { state, dispatch } = useAppState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [watermarkImg, setWatermarkImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isFitMode, setIsFitMode] = useState(true);
  const fitScaleRef = useRef(1);

  // Pan state
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollX: 0, scrollY: 0 });

  // Floating overlay state
  const [overlay, setOverlay] = useState<FloatingOverlay | null>(null);
  const overlayDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Shape drawing state
  const [drawingShape, setDrawingShape] = useState<DrawingShape | null>(null);
  const isDrawingRef = useRef(false);

  // Crop region state
  const [cropRegion, setCropRegion] = useState<DrawingShape | null>(null);

  // Text input state
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // Select/move/resize state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragTargetRef = useRef<DragTarget | null>(null);
  const isDraggingAnnotationRef = useRef(false);

  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  const indicators = activeTab ? (state.stepIndicators[activeTab.id] || []) : [];
  const shapes = activeTab ? (state.shapes[activeTab.id] || []) : [];
  const textAnnotations = activeTab ? (state.textAnnotations[activeTab.id] || []) : [];
  const { borderColor, borderWidth: rawBorderWidth, borderEnabled, stepSize, shapeColor, shapeStrokeWidth, shapeFilled, arrowChevrons, rectMode, watermarkDataURL: rawWatermarkDataURL, watermarkSize, watermarkEnabled, blurStrength, textFontSize } = state.settings;
  const borderWidth = borderEnabled ? rawBorderWidth : 0;
  const watermarkDataURL = watermarkEnabled ? rawWatermarkDataURL : null;

  useEffect(() => {
    setZoom(1);
    setIsFitMode(true);
    setOverlay(null);
    setDrawingShape(null);
    setCropRegion(null);
    setTextInput(null);
    setSelectedId(null);
  }, [state.activeTabId]);

  // Clear selection when switching tools
  useEffect(() => {
    if (state.tool !== 'select') setSelectedId(null);
  }, [state.tool]);

  // Load watermark
  useEffect(() => {
    if (watermarkDataURL) {
      loadWatermark(watermarkDataURL).then(img => { setWatermarkImg(img); });
    } else {
      setWatermarkImg(null);
    }
  }, [watermarkDataURL]);

  // Build a temporary shape for live preview while drawing
  const previewShape: Shape | null = drawingShape && (state.tool === 'rect' || state.tool === 'arrow' || state.tool === 'blur')
    ? {
        id: '_preview',
        type: state.tool as 'rect' | 'arrow' | 'blur',
        ...drawingShape,
        color: shapeColor,
        strokeWidth: shapeStrokeWidth,
        filled: shapeFilled,
        rectMode,
        arrowChevrons,
        blurStrength,
      }
    : null;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imageRef.current) return;

    const img = imageRef.current;
    const totalW = img.width + borderWidth * 2;
    const totalH = img.height + borderWidth * 2;

    const maxW = container.clientWidth - 40;
    const maxH = container.clientHeight - 40;
    const fitScale = Math.min(maxW / totalW, maxH / totalH, 1);
    fitScaleRef.current = fitScale;

    const renderScale = isFitMode ? fitScale : zoom;

    canvas.width = Math.round(totalW * renderScale);
    canvas.height = Math.round(totalH * renderScale);

    const ctx = canvas.getContext('2d')!;
    drawImageWithBorder(ctx, img, borderColor, borderWidth, renderScale);

    // Draw blur shapes first (they need underlying pixels)
    for (const s of shapes) {
      if (s.type === 'blur') {
        renderBlurShape(ctx, {
          ...s,
          x1: s.x1 + borderWidth, y1: s.y1 + borderWidth,
          x2: s.x2 + borderWidth, y2: s.y2 + borderWidth,
        }, renderScale);
      }
    }
    if (previewShape && previewShape.type === 'blur') {
      renderBlurShape(ctx, {
        ...previewShape,
        x1: previewShape.x1 + borderWidth, y1: previewShape.y1 + borderWidth,
        x2: previewShape.x2 + borderWidth, y2: previewShape.y2 + borderWidth,
      }, renderScale);
    }

    // Draw non-blur shapes
    for (const s of shapes) {
      if (s.type !== 'blur') {
        renderShape(ctx, {
          ...s,
          x1: s.x1 + borderWidth, y1: s.y1 + borderWidth,
          x2: s.x2 + borderWidth, y2: s.y2 + borderWidth,
        }, renderScale);
      }
    }
    if (previewShape && previewShape.type !== 'blur') {
      renderShape(ctx, {
        ...previewShape,
        x1: previewShape.x1 + borderWidth, y1: previewShape.y1 + borderWidth,
        x2: previewShape.x2 + borderWidth, y2: previewShape.y2 + borderWidth,
      }, renderScale);
    }

    // Draw step indicators
    for (const ind of indicators) {
      renderStepIndicator(
        ctx,
        { ...ind, x: ind.x + borderWidth, y: ind.y + borderWidth },
        renderScale,
        stepSize,
        ind.color
      );
    }

    // Draw text annotations
    for (const ta of textAnnotations) {
      renderTextAnnotation(
        ctx,
        { ...ta, x: ta.x + borderWidth, y: ta.y + borderWidth },
        renderScale
      );
    }

    // Draw watermark
    if (watermarkImg) {
      drawWatermark(ctx, watermarkImg, canvas.width, canvas.height, renderScale, watermarkSize);
    }

    // Draw floating overlay
    if (overlay) {
      const ox = (overlay.x + borderWidth) * renderScale;
      const oy = (overlay.y + borderWidth) * renderScale;
      const ow = overlay.image.width * renderScale;
      const oh = overlay.image.height * renderScale;

      ctx.drawImage(overlay.image, ox, oy, ow, oh);

      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(ox, oy, ow, oh);
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineDashOffset = 5;
      ctx.strokeRect(ox, oy, ow, oh);
      ctx.restore();
    }

    // Draw crop preview
    if (cropRegion) {
      const cx1 = (Math.min(cropRegion.x1, cropRegion.x2) + borderWidth) * renderScale;
      const cy1 = (Math.min(cropRegion.y1, cropRegion.y2) + borderWidth) * renderScale;
      const cw = Math.abs(cropRegion.x2 - cropRegion.x1) * renderScale;
      const ch = Math.abs(cropRegion.y2 - cropRegion.y1) * renderScale;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(cx1, cy1, cw, ch);
      // Redraw full image + annotations inside crop area
      drawImageWithBorder(ctx, img, borderColor, borderWidth, renderScale);
      for (const s of shapes) {
        if (s.type === 'blur') {
          renderBlurShape(ctx, { ...s, x1: s.x1 + borderWidth, y1: s.y1 + borderWidth, x2: s.x2 + borderWidth, y2: s.y2 + borderWidth }, renderScale);
        }
      }
      for (const s of shapes) {
        if (s.type !== 'blur') {
          renderShape(ctx, { ...s, x1: s.x1 + borderWidth, y1: s.y1 + borderWidth, x2: s.x2 + borderWidth, y2: s.y2 + borderWidth }, renderScale);
        }
      }
      for (const ind of indicators) {
        renderStepIndicator(ctx, { ...ind, x: ind.x + borderWidth, y: ind.y + borderWidth }, renderScale, stepSize, ind.color);
      }
      for (const ta of textAnnotations) {
        renderTextAnnotation(ctx, { ...ta, x: ta.x + borderWidth, y: ta.y + borderWidth }, renderScale);
      }
      // Re-dim outside crop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, cy1);
      ctx.fillRect(0, cy1 + ch, canvas.width, canvas.height - cy1 - ch);
      ctx.fillRect(0, cy1, cx1, ch);
      ctx.fillRect(cx1 + cw, cy1, canvas.width - cx1 - cw, ch);

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(cx1, cy1, cw, ch);
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineDashOffset = 5;
      ctx.strokeRect(cx1, cy1, cw, ch);
      ctx.restore();
    }

    // Draw selection highlight
    if (selectedId && state.tool === 'select') {
      ctx.save();
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      // Check step indicators
      for (const ind of indicators) {
        if (ind.id === selectedId) {
          const sx = (ind.x + borderWidth) * renderScale;
          const sy = (ind.y + borderWidth) * renderScale;
          const sr = (stepSize / 2 + 4) * renderScale;
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.stroke();
          // Draw handle squares
          drawHandle(ctx, sx - sr, sy, renderScale);
          drawHandle(ctx, sx + sr, sy, renderScale);
          drawHandle(ctx, sx, sy - sr, renderScale);
          drawHandle(ctx, sx, sy + sr, renderScale);
        }
      }

      // Check shapes
      for (const s of shapes) {
        if (s.id === selectedId) {
          const sx1 = (Math.min(s.x1, s.x2) + borderWidth) * renderScale;
          const sy1 = (Math.min(s.y1, s.y2) + borderWidth) * renderScale;
          const sw = Math.abs(s.x2 - s.x1) * renderScale;
          const sh = Math.abs(s.y2 - s.y1) * renderScale;

          if (s.type === 'arrow') {
            const ax1 = (s.x1 + borderWidth) * renderScale;
            const ay1 = (s.y1 + borderWidth) * renderScale;
            const ax2 = (s.x2 + borderWidth) * renderScale;
            const ay2 = (s.y2 + borderWidth) * renderScale;
            ctx.beginPath();
            ctx.moveTo(ax1, ay1);
            ctx.lineTo(ax2, ay2);
            ctx.stroke();
            drawHandle(ctx, ax1, ay1, renderScale);
            drawHandle(ctx, ax2, ay2, renderScale);
          } else {
            ctx.strokeRect(sx1 - 2, sy1 - 2, sw + 4, sh + 4);
            drawHandle(ctx, sx1, sy1, renderScale);
            drawHandle(ctx, sx1 + sw, sy1, renderScale);
            drawHandle(ctx, sx1, sy1 + sh, renderScale);
            drawHandle(ctx, sx1 + sw, sy1 + sh, renderScale);
          }
        }
      }

      // Check text annotations
      for (const ta of textAnnotations) {
        if (ta.id === selectedId) {
          const dims = measureTextAnnotation(ctx, ta.text, ta.fontSize, renderScale);
          const tx = (ta.x + borderWidth) * renderScale;
          const ty = (ta.y + borderWidth) * renderScale;
          ctx.strokeRect(tx - 2, ty - 2, dims.width + 4, dims.height + 4);
        }
      }

      ctx.restore();
    }
  }, [indicators, shapes, textAnnotations, zoom, isFitMode, borderColor, borderWidth, stepSize, watermarkSize, watermarkImg, overlay, previewShape, cropRegion, selectedId, state.tool]);

  useEffect(() => {
    if (!activeTab || !activeTab.imageDataURL) { imageRef.current = null; return; }
    const img = new Image();
    img.onload = () => { imageRef.current = img; draw(); };
    img.src = activeTab.imageDataURL;
  }, [activeTab?.imageDataURL, draw]);

  useEffect(() => {
    const observer = new ResizeObserver(() => draw());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setIsFitMode(false);
      setZoom(prev => {
        const base = prev === 1 && isFitMode ? fitScaleRef.current : prev;
        return Math.min(Math.max(base * delta, 0.1), 10);
      });
    }
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [isFitMode]);

  // Pan: middle mouse button drag
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handlePanStart(e: MouseEvent) {
      if (e.button === 1) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY, scrollX: container!.scrollLeft, scrollY: container!.scrollTop };
        e.preventDefault();
      }
    }
    function handlePanMove(e: MouseEvent) {
      if (!isPanningRef.current) return;
      container!.scrollLeft = panStartRef.current.scrollX - (e.clientX - panStartRef.current.x);
      container!.scrollTop = panStartRef.current.scrollY - (e.clientY - panStartRef.current.y);
    }
    function handlePanEnd(e: MouseEvent) {
      if (isPanningRef.current && e.button === 1) {
        isPanningRef.current = false;
      }
    }

    container.addEventListener('mousedown', handlePanStart);
    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanEnd);
    return () => {
      container.removeEventListener('mousedown', handlePanStart);
      window.removeEventListener('mousemove', handlePanMove);
      window.removeEventListener('mouseup', handlePanEnd);
    };
  }, []);

  function zoomIn() {
    setIsFitMode(false);
    setZoom(prev => Math.min((isFitMode ? fitScaleRef.current : prev) * 1.25, 10));
  }
  function zoomOut() {
    setIsFitMode(false);
    setZoom(prev => Math.max((isFitMode ? fitScaleRef.current : prev) / 1.25, 0.1));
  }
  function zoomFit() { setZoom(1); setIsFitMode(true); }

  function getEffectiveScale() { return isFitMode ? fitScaleRef.current : zoom; }
  function getZoomPercent() { return Math.round(getEffectiveScale() * 100); }

  function toImageCoords(e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scale = getEffectiveScale();
    return { x: (e.clientX - rect.left) / scale - borderWidth, y: (e.clientY - rect.top) / scale - borderWidth };
  }

  function isInsideOverlay(ix: number, iy: number): boolean {
    if (!overlay) return false;
    return ix >= overlay.x && iy >= overlay.y &&
      ix <= overlay.x + overlay.image.width && iy <= overlay.y + overlay.image.height;
  }

  function commitOverlay() {
    if (!overlay || !activeTab || !imageRef.current) return;
    const base = imageRef.current;
    const c = document.createElement('canvas');
    c.width = base.width; c.height = base.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(base, 0, 0);
    ctx.drawImage(overlay.image, overlay.x, overlay.y);
    dispatch({ type: 'UPDATE_TAB_IMAGE', id: activeTab.id, imageDataURL: c.toDataURL('image/png'), thumbnail: '' });
    setOverlay(null);
  }

  function cancelOverlay() { setOverlay(null); }

  // ── Crop helpers ──

  function applyCrop() {
    if (!cropRegion || !activeTab || !imageRef.current) return;
    const img = imageRef.current;
    const rx = Math.max(0, Math.min(cropRegion.x1, cropRegion.x2));
    const ry = Math.max(0, Math.min(cropRegion.y1, cropRegion.y2));
    const rw = Math.min(Math.abs(cropRegion.x2 - cropRegion.x1), img.width - rx);
    const rh = Math.min(Math.abs(cropRegion.y2 - cropRegion.y1), img.height - ry);
    if (rw < 2 || rh < 2) { setCropRegion(null); return; }

    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    for (const s of shapes) {
      if (s.type === 'blur') renderBlurShape(ctx, s, 1);
    }
    for (const s of shapes) {
      if (s.type !== 'blur') renderShape(ctx, s, 1);
    }
    for (const ind of indicators) {
      renderStepIndicator(ctx, ind, 1, stepSize, ind.color);
    }
    for (const ta of textAnnotations) {
      renderTextAnnotation(ctx, ta, 1);
    }

    const cropped = document.createElement('canvas');
    cropped.width = Math.round(rw);
    cropped.height = Math.round(rh);
    const cctx = cropped.getContext('2d')!;
    cctx.drawImage(c, rx, ry, rw, rh, 0, 0, rw, rh);

    const dataURL = cropped.toDataURL('image/png');
    dispatch({ type: 'CROP_IMAGE', tabId: activeTab.id, imageDataURL: dataURL, thumbnail: '' });
    setCropRegion(null);
  }

  function cancelCrop() { setCropRegion(null); }

  // ── Text input helpers ──

  function commitTextInput() {
    if (!textInput || !activeTab || !textInput.value.trim()) {
      setTextInput(null);
      return;
    }
    // Measure on a temp canvas to get dimensions
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d')!;
    const dims = measureTextAnnotation(tmpCtx, textInput.value, textFontSize, 1);

    dispatch({
      type: 'ADD_TEXT_ANNOTATION',
      tabId: activeTab.id,
      annotation: {
        id: generateId(),
        x: textInput.x,
        y: textInput.y,
        text: textInput.value,
        fontSize: textFontSize,
        color: shapeColor,
        width: dims.width,
        height: dims.height,
      },
    });
    setTextInput(null);
  }

  // ── Hit-testing for select mode ──

  function findAnnotationAt(x: number, y: number): { id: string; kind: 'step' | 'shape' | 'text'; dist: number } | null {
    let closest: { id: string; kind: 'step' | 'shape' | 'text'; dist: number } | null = null;

    // Text annotations (check first, they're on top visually)
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      for (const ta of textAnnotations) {
        const dims = measureTextAnnotation(ctx, ta.text, ta.fontSize, 1);
        if (x >= ta.x && x <= ta.x + dims.width && y >= ta.y && y <= ta.y + dims.height) {
          const dist = Math.hypot(x - (ta.x + dims.width / 2), y - (ta.y + dims.height / 2));
          if (!closest || dist < closest.dist) closest = { id: ta.id, kind: 'text', dist };
        }
      }
    }

    for (const ind of indicators) {
      const dist = Math.hypot(ind.x - x, ind.y - y);
      if (dist < stepSize && (!closest || dist < closest.dist)) closest = { id: ind.id, kind: 'step', dist };
    }

    for (const s of shapes) {
      const dist = distanceToShape(s, x, y);
      if (dist < 20 && (!closest || dist < closest.dist)) closest = { id: s.id, kind: 'shape', dist };
    }

    return closest;
  }

  function getResizeHandle(x: number, y: number, shape: Shape): 'x1y1' | 'x2y2' | 'x1y2' | 'x2y1' | 'body' {
    const handleRadius = 8;
    if (shape.type === 'arrow') {
      if (Math.hypot(x - shape.x1, y - shape.y1) < handleRadius) return 'x1y1';
      if (Math.hypot(x - shape.x2, y - shape.y2) < handleRadius) return 'x2y2';
      return 'body';
    }
    // For rect/blur: check corners
    const corners: Array<{ handle: 'x1y1' | 'x2y2' | 'x1y2' | 'x2y1'; cx: number; cy: number }> = [
      { handle: 'x1y1', cx: Math.min(shape.x1, shape.x2), cy: Math.min(shape.y1, shape.y2) },
      { handle: 'x2y2', cx: Math.max(shape.x1, shape.x2), cy: Math.max(shape.y1, shape.y2) },
      { handle: 'x1y2', cx: Math.min(shape.x1, shape.x2), cy: Math.max(shape.y1, shape.y2) },
      { handle: 'x2y1', cx: Math.max(shape.x1, shape.x2), cy: Math.min(shape.y1, shape.y2) },
    ];
    for (const c of corners) {
      if (Math.hypot(x - c.cx, y - c.cy) < handleRadius) return c.handle;
    }
    return 'body';
  }

  // ── Mouse handlers ──

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!activeTab || !canvasRef.current) return;
    if (isPanningRef.current) return;
    const { x, y } = toImageCoords(e);

    // Overlay dragging takes priority
    if (overlay && isInsideOverlay(x, y)) {
      overlayDraggingRef.current = true;
      dragOffsetRef.current = { x: x - overlay.x, y: y - overlay.y };
      e.preventDefault();
      return;
    }

    // Select mode: pick up annotation to move/resize
    if (state.tool === 'select') {
      const hit = findAnnotationAt(x, y);
      if (hit) {
        setSelectedId(hit.id);
        isDraggingAnnotationRef.current = true;

        if (hit.kind === 'step') {
          const ind = indicators.find(i => i.id === hit.id)!;
          dragTargetRef.current = { kind: 'step', id: hit.id, offsetX: x - ind.x, offsetY: y - ind.y };
        } else if (hit.kind === 'shape') {
          const shape = shapes.find(s => s.id === hit.id)!;
          const handle = getResizeHandle(x, y, shape);
          if (handle === 'body') {
            const cx = (Math.min(shape.x1, shape.x2) + Math.max(shape.x1, shape.x2)) / 2;
            const cy = (Math.min(shape.y1, shape.y2) + Math.max(shape.y1, shape.y2)) / 2;
            dragTargetRef.current = { kind: 'shape', id: hit.id, handle: 'body', offsetX: x - cx, offsetY: y - cy };
          } else {
            dragTargetRef.current = { kind: 'shape', id: hit.id, handle, offsetX: 0, offsetY: 0 };
          }
        } else if (hit.kind === 'text') {
          const ta = textAnnotations.find(t => t.id === hit.id)!;
          dragTargetRef.current = { kind: 'text', id: hit.id, offsetX: x - ta.x, offsetY: y - ta.y };
        }
        e.preventDefault();
        return;
      } else {
        setSelectedId(null);
      }
    }

    // Start drawing a shape (rect, arrow, blur)
    if (state.tool === 'rect' || state.tool === 'arrow' || state.tool === 'blur') {
      isDrawingRef.current = true;
      setDrawingShape({ x1: x, y1: y, x2: x, y2: y });
      e.preventDefault();
      return;
    }

    // Crop tool
    if (state.tool === 'crop') {
      setCropRegion({ x1: x, y1: y, x2: x, y2: y });
      const cropMove = (ev: MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scale = getEffectiveScale();
        const cx = (ev.clientX - rect.left) / scale - borderWidth;
        const cy = (ev.clientY - rect.top) / scale - borderWidth;
        setCropRegion(prev => prev ? { ...prev, x2: cx, y2: cy } : null);
      };
      const cropUp = () => {
        window.removeEventListener('mousemove', cropMove);
        window.removeEventListener('mouseup', cropUp);
        setCropRegion(prev => {
          if (!prev) return null;
          const dx = Math.abs(prev.x2 - prev.x1);
          const dy = Math.abs(prev.y2 - prev.y1);
          return (dx < 5 && dy < 5) ? null : prev;
        });
      };
      window.addEventListener('mousemove', cropMove);
      window.addEventListener('mouseup', cropUp);
      e.preventDefault();
      return;
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    // Overlay drag
    if (overlayDraggingRef.current && overlay) {
      const { x, y } = toImageCoords(e);
      setOverlay(prev => prev ? { ...prev, x: x - dragOffsetRef.current.x, y: y - dragOffsetRef.current.y } : null);
      return;
    }

    // Annotation drag/resize
    if (isDraggingAnnotationRef.current && dragTargetRef.current && activeTab) {
      const { x, y } = toImageCoords(e);
      const target = dragTargetRef.current;

      if (target.kind === 'step') {
        dispatch({
          type: 'UPDATE_STEP_INDICATOR',
          tabId: activeTab.id,
          id: target.id,
          changes: { x: x - target.offsetX, y: y - target.offsetY },
        });
      } else if (target.kind === 'text') {
        dispatch({
          type: 'UPDATE_TEXT_ANNOTATION',
          tabId: activeTab.id,
          id: target.id,
          changes: { x: x - target.offsetX, y: y - target.offsetY },
        });
      } else if (target.kind === 'shape') {
        const shape = shapes.find(s => s.id === target.id);
        if (!shape) return;

        if (target.handle === 'body') {
          const cx = (Math.min(shape.x1, shape.x2) + Math.max(shape.x1, shape.x2)) / 2;
          const cy = (Math.min(shape.y1, shape.y2) + Math.max(shape.y1, shape.y2)) / 2;
          const dx = (x - target.offsetX) - cx;
          const dy = (y - target.offsetY) - cy;
          dispatch({
            type: 'UPDATE_SHAPE',
            tabId: activeTab.id,
            id: target.id,
            changes: {
              x1: shape.x1 + dx,
              y1: shape.y1 + dy,
              x2: shape.x2 + dx,
              y2: shape.y2 + dy,
            },
          });
        } else {
          // Resize via corner handle
          const changes: Partial<Shape> = {};
          if (target.handle === 'x1y1') { changes.x1 = x; changes.y1 = y; }
          else if (target.handle === 'x2y2') { changes.x2 = x; changes.y2 = y; }
          else if (target.handle === 'x1y2') { changes.x1 = x; changes.y2 = y; }
          else if (target.handle === 'x2y1') { changes.x2 = x; changes.y1 = y; }
          dispatch({ type: 'UPDATE_SHAPE', tabId: activeTab.id, id: target.id, changes });
        }
      }
      return;
    }

    // Shape drawing
    if (isDrawingRef.current && drawingShape) {
      let { x, y } = toImageCoords(e);
      if (e.shiftKey && state.tool === 'arrow') {
        const dx = x - drawingShape.x1;
        const dy = y - drawingShape.y1;
        const len = Math.hypot(dx, dy);
        const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
        x = drawingShape.x1 + Math.cos(angle) * len;
        y = drawingShape.y1 + Math.sin(angle) * len;
      }
      setDrawingShape(prev => prev ? { ...prev, x2: x, y2: y } : null);
      return;
    }
  }

  function handleMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    // Finish overlay drag
    if (overlayDraggingRef.current) {
      overlayDraggingRef.current = false;
      return;
    }

    // Finish annotation drag
    if (isDraggingAnnotationRef.current) {
      isDraggingAnnotationRef.current = false;
      dragTargetRef.current = null;
      return;
    }

    // Finish shape drawing
    if (isDrawingRef.current && drawingShape && activeTab) {
      isDrawingRef.current = false;
      const dx = Math.abs(drawingShape.x2 - drawingShape.x1);
      const dy = Math.abs(drawingShape.y2 - drawingShape.y1);
      if (dx > 5 || dy > 5) {
        const shapeType = state.tool as 'rect' | 'arrow' | 'blur';
        dispatch({
          type: 'ADD_SHAPE',
          tabId: activeTab.id,
          shape: {
            id: generateId(),
            type: shapeType,
            ...drawingShape,
            color: shapeColor,
            strokeWidth: shapeStrokeWidth,
            filled: shapeFilled,
            rectMode,
            arrowChevrons,
            blurStrength: shapeType === 'blur' ? blurStrength : undefined,
          },
        });
      }
      setDrawingShape(null);
    }
  }

  function handleMouseLeave() {
    overlayDraggingRef.current = false;
    if (isDraggingAnnotationRef.current) {
      isDraggingAnnotationRef.current = false;
      dragTargetRef.current = null;
    }
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      setDrawingShape(null);
    }
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!activeTab || !canvasRef.current || isPanningRef.current) return;

    // Overlay: clicking outside commits
    if (overlay) {
      const { x, y } = toImageCoords(e);
      if (!isInsideOverlay(x, y)) commitOverlay();
      return;
    }

    if (state.tool === 'step') {
      const { x, y } = toImageCoords(e);
      const num = state.nextStepNumber[activeTab.id] || 1;
      const label = formatStepLabel(num, state.stepStyle);
      dispatch({
        type: 'ADD_STEP_INDICATOR',
        tabId: activeTab.id,
        indicator: { id: generateId(), x, y, label, style: state.stepStyle, color: shapeColor },
      });
    }

    // Text tool: click to place text input
    if (state.tool === 'text') {
      if (textInput) {
        commitTextInput();
      } else {
        const { x, y } = toImageCoords(e);
        setTextInput({ x, y, value: '' });
        setTimeout(() => textInputRef.current?.focus(), 0);
      }
    }
  }

  // Right-click: remove nearest annotation
  function handleContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!activeTab) return;
    const { x, y } = toImageCoords(e);

    let closest: { id: string; dist: number } | null = null;

    for (const ind of indicators) {
      const dist = Math.hypot(ind.x - x, ind.y - y);
      if (dist < 30 && (!closest || dist < closest.dist)) closest = { id: ind.id, dist };
    }
    for (const s of shapes) {
      const dist = distanceToShape(s, x, y);
      if (dist < 20 && (!closest || dist < closest.dist)) closest = { id: s.id, dist };
    }
    // Text annotations
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      for (const ta of textAnnotations) {
        const dims = measureTextAnnotation(ctx, ta.text, ta.fontSize, 1);
        if (x >= ta.x && x <= ta.x + dims.width && y >= ta.y && y <= ta.y + dims.height) {
          const dist = 0; // inside = highest priority
          if (!closest || dist < closest.dist) closest = { id: ta.id, dist };
        }
      }
    }

    if (closest) {
      if (selectedId === closest.id) setSelectedId(null);
      dispatch({ type: 'REMOVE_ANNOTATION', tabId: activeTab.id, annotationId: closest.id });
    }
  }

  // Global paste + keyboard
  useEffect(() => {
    async function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in text input
      if (textInput && e.key !== 'Escape') return;

      if (e.key === 'Enter' && overlay) { e.preventDefault(); commitOverlay(); return; }
      if (e.key === 'Escape' && overlay) { e.preventDefault(); cancelOverlay(); return; }

      if (e.key === 'Enter' && cropRegion) { e.preventDefault(); applyCrop(); return; }
      if (e.key === 'Escape' && cropRegion) { e.preventDefault(); cancelCrop(); return; }

      if (e.key === 'Escape' && textInput) { e.preventDefault(); setTextInput(null); return; }

      // ESC with no active modal → switch to Select tool
      if (e.key === 'Escape' && state.tool !== 'select') {
        e.preventDefault();
        dispatch({ type: 'SET_TOOL', tool: 'select' });
        return;
      }

      // Delete selected annotation
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && activeTab && state.tool === 'select') {
        e.preventDefault();
        dispatch({ type: 'REMOVE_ANNOTATION', tabId: activeTab.id, annotationId: selectedId });
        setSelectedId(null);
        return;
      }

      // Undo: Ctrl+Z
      if (e.ctrlKey && !e.shiftKey && e.key === 'z' && activeTab) {
        e.preventDefault();
        dispatch({ type: 'UNDO', tabId: activeTab.id });
        return;
      }
      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if (activeTab && ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y'))) {
        e.preventDefault();
        dispatch({ type: 'REDO', tabId: activeTab.id });
        return;
      }

      // Copy to clipboard: Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && e.key === 'C' && activeTab && activeTab.imageDataURL) {
        e.preventDefault();
        const indicators = state.stepIndicators[activeTab.id] || [];
        const shapes = state.shapes[activeTab.id] || [];
        const texts = state.textAnnotations[activeTab.id] || [];
        const { borderColor, borderWidth: rawBW, borderEnabled: be, stepSize, watermarkDataURL: rawWM, watermarkSize, watermarkEnabled: we } = state.settings;
        const dataURL = await compositeExport(activeTab.imageDataURL, indicators, shapes, borderColor, be ? rawBW : 0, stepSize, we ? rawWM : null, watermarkSize, texts);
        await window.electronAPI.writeClipboardImage(dataURL);
        return;
      }

      if (e.ctrlKey && e.key === 'v') {
        const dataURL = await window.electronAPI.readClipboardImage();
        if (!dataURL) return;
        if (activeTab && activeTab.imageDataURL) {
          // Overlay case — compositing onto existing image, no frame
          if (overlay) commitOverlay();
          const img = new Image();
          img.onload = () => setOverlay({ image: img, x: 0, y: 0 });
          img.src = dataURL;
        } else if (activeTab) {
          const framed = await maybeApplyCanvasFrame(dataURL, state.settings);
          dispatch({ type: 'UPDATE_TAB_IMAGE', id: activeTab.id, imageDataURL: framed, thumbnail: '' });
        } else {
          const framed = await maybeApplyCanvasFrame(dataURL, state.settings);
          dispatch({
            type: 'ADD_TAB',
            tab: { id: generateId(), name: nextTabName(state.tabs), imageDataURL: framed, thumbnail: '' },
          });
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.tool, state.settings, state.tabs.length, activeTab, overlay, cropRegion, textInput, selectedId, dispatch]);

  const cursorStyle = overlay
    ? 'move'
    : state.tool === 'select'
    ? (selectedId ? 'move' : 'default')
    : (state.tool === 'step' || state.tool === 'text') ? 'crosshair'
    : (state.tool === 'rect' || state.tool === 'arrow' || state.tool === 'blur' || state.tool === 'crop') ? 'crosshair'
    : 'default';

  if (!activeTab || !activeTab.imageDataURL) {
    return (
      <div className="canvas-wrapper">
        <div className="canvas-container" ref={containerRef}>
          <div className="canvas-inner">
            <div className="canvas-empty">
              <p>No image selected</p>
              <p>Press <kbd>Ctrl+V</kbd> to paste a screenshot</p>
              <p>or click <strong>Open</strong> / <strong>Paste</strong> in the sidebar</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate text input position in screen coordinates
  const textInputScreenPos = textInput && canvasRef.current ? (() => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = getEffectiveScale();
    const container = containerRef.current;
    const containerRect = container?.getBoundingClientRect();
    if (!containerRect) return null;
    return {
      left: rect.left - containerRect.left + (textInput.x + borderWidth) * scale,
      top: rect.top - containerRect.top + (textInput.y + borderWidth) * scale,
    };
  })() : null;

  return (
    <div className="canvas-wrapper">
      <div className="canvas-container" ref={containerRef}>
        <div className="canvas-inner">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onContextMenu={handleContextMenu}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: cursorStyle }}
          />
        </div>
        {/* Inline text input overlay */}
        {textInput && textInputScreenPos && (
          <textarea
            ref={textInputRef}
            className="canvas-text-input"
            style={{
              position: 'absolute',
              left: textInputScreenPos.left,
              top: textInputScreenPos.top,
              fontSize: textFontSize * getEffectiveScale(),
              color: '#fff',
              background: shapeColor + 'e6',
              borderRadius: 4,
              padding: '3px 6px',
              border: '2px solid #fff',
              outline: 'none',
              resize: 'none',
              minWidth: 80,
              minHeight: 24,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
              fontWeight: 600,
              lineHeight: 1.2,
              zIndex: 20,
            }}
            value={textInput.value}
            onChange={(e) => setTextInput(prev => prev ? { ...prev, value: e.target.value } : null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitTextInput();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setTextInput(null);
              }
            }}
            onBlur={commitTextInput}
            placeholder="Type text..."
            rows={1}
          />
        )}
      </div>
      {overlay && (
        <div className="overlay-actions">
          <button className="primary" onClick={commitOverlay}>Apply</button>
          <button onClick={cancelOverlay}>Cancel</button>
          <span className="overlay-hint">Drag to move &middot; Enter to apply &middot; Esc to cancel</span>
        </div>
      )}
      {cropRegion && !isDrawingRef.current && (
        <div className="overlay-actions">
          <button className="primary" onClick={applyCrop}>Apply Crop</button>
          <button onClick={cancelCrop}>Cancel</button>
          <span className="overlay-hint">Enter to apply &middot; Esc to cancel</span>
        </div>
      )}
      <div className="canvas-status">
        {imageRef.current && (
          <span className="image-dimensions">
            {imageRef.current.width + borderWidth * 2} &times; {imageRef.current.height + borderWidth * 2}px
          </span>
        )}
        <div className="zoom-controls">
          <button onClick={zoomOut} title="Zoom out">−</button>
          <button className="zoom-label" onClick={zoomFit} title="Fit to view">
            {getZoomPercent()}%
          </button>
          <button onClick={zoomIn} title="Zoom in">+</button>
        </div>
      </div>
    </div>
  );
}

/** Draw a small square handle for selection */
function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const size = 6 * scale;
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
  ctx.strokeRect(x - size / 2, y - size / 2, size, size);
  ctx.restore();
}
