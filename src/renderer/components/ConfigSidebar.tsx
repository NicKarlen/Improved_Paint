import { useRef } from 'react';
import { useAppState } from '../store/AppContext';

export default function ConfigSidebar() {
  const { state, dispatch } = useAppState();
  const { settings } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setSettings(patch: Parameters<typeof dispatch>[0] extends { type: 'SET_SETTINGS'; settings: infer S } ? S : never) {
    dispatch({ type: 'SET_SETTINGS', settings: patch });
  }

  function handleColorChange(index: number, color: string) {
    const next: [string, string, string] = [...settings.companyColors] as [string, string, string];
    next[index] = color;
    setSettings({ companyColors: next });
  }

  async function handleWatermarkUpload() {
    const filePath = await window.electronAPI.openFile();
    if (!filePath) return;
    // Read the file as data URL via canvas
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      setSettings({ watermarkDataURL: c.toDataURL('image/png') });
    };
    img.src = filePath;
  }

  function handleResetWatermark() {
    setSettings({ watermarkDataURL: null });
  }

  return (
    <div className="config-sidebar">
      <div className="config-section">
        <h4 className="config-heading">Brand Colors</h4>
        <div className="config-colors">
          {settings.companyColors.map((color, i) => (
            <label key={i} className="config-color-row">
              <span>Color {i + 1}</span>
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(i, e.target.value)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="config-section">
        <h4 className="config-heading">Border</h4>
        <label className="config-row">
          <span>Color</span>
          <input
            type="color"
            value={settings.borderColor}
            onChange={(e) => setSettings({ borderColor: e.target.value })}
          />
        </label>
        <label className="config-row">
          <span>Width</span>
          <div className="config-row-input">
            <input
              type="number"
              min={0}
              max={50}
              value={settings.borderWidth}
              onChange={(e) => setSettings({ borderWidth: Number(e.target.value) })}
            />
            <span className="config-unit">px</span>
          </div>
        </label>
      </div>

      <div className="config-section">
        <h4 className="config-heading">Watermark</h4>
        <div className="config-watermark-preview">
          {settings.watermarkDataURL ? (
            <img src={settings.watermarkDataURL} alt="watermark" className="config-wm-thumb" />
          ) : (
            <span className="config-wm-default">Default</span>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              setSettings({ watermarkDataURL: reader.result as string });
            };
            reader.readAsDataURL(file);
            e.target.value = '';
          }}
        />
        <div className="config-wm-actions">
          <button onClick={() => fileInputRef.current?.click()}>Upload</button>
          <button onClick={handleResetWatermark} disabled={!settings.watermarkDataURL}>Reset</button>
        </div>
        <label className="config-row">
          <span>Size</span>
          <input
            type="range"
            min={12}
            max={80}
            value={settings.watermarkSize}
            onChange={(e) => setSettings({ watermarkSize: Number(e.target.value) })}
          />
          <span className="config-slider-value">{settings.watermarkSize}</span>
        </label>
      </div>
    </div>
  );
}
