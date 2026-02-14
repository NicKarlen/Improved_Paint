import { useState } from 'react';
import { useAppState } from '../store/AppContext';
import { compositeExport } from '../utils/canvas';

interface Props {
  onClose: () => void;
}

export default function ExportDialog({ onClose }: Props) {
  const { state, dispatch } = useAppState();
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>(state.settings.exportFormat);
  const [quality, setQuality] = useState(state.settings.exportQuality);

  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  if (!activeTab) return null;

  async function handleExport() {
    if (!activeTab) return;
    const indicators = state.stepIndicators[activeTab.id] || [];
    const shapes = state.shapes[activeTab.id] || [];
    const texts = state.textAnnotations[activeTab.id] || [];
    const { borderColor, borderWidth, stepSize, watermarkDataURL, watermarkSize } = state.settings;
    const finalDataURL = await compositeExport(activeTab.imageDataURL, indicators, shapes, borderColor, borderWidth, stepSize, watermarkDataURL, watermarkSize, texts);

    let exportURL = finalDataURL;
    if (format !== 'png') {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = finalDataURL;
      });
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      if (format === 'jpeg') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
      }
      ctx.drawImage(img, 0, 0);
      exportURL = c.toDataURL(`image/${format}`, quality);
    }

    // Persist chosen format & quality for next time
    dispatch({ type: 'SET_SETTINGS', settings: { exportFormat: format, exportQuality: quality } });

    const extMap = { png: 'png', jpeg: 'jpg', webp: 'webp' } as const;
    const name = activeTab.name.replace(/\.[^.]+$/, '') + '.' + extMap[format];
    await window.electronAPI.saveFile(exportURL, name, format);
    onClose();
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Export Image</h3>
        <div className="dialog-row">
          <label>Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value as 'png' | 'jpeg' | 'webp')}>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
        </div>
        {(format === 'jpeg' || format === 'webp') && (
          <div className="dialog-row">
            <label>Quality</label>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
            />
            <span>{Math.round(quality * 100)}%</span>
          </div>
        )}
        <div className="dialog-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleExport}>Save</button>
        </div>
      </div>
    </div>
  );
}
