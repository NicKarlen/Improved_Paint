import { useRef } from 'react';
import { useAppState } from '../store/AppContext';
import { AppSettings, ProfileSettings } from '../../shared/types';

const PROFILE_KEYS: (keyof ProfileSettings)[] = [
  'companyColors',
  'beautifyEnabled', 'beautifyBgType', 'beautifyBgColor1', 'beautifyBgColor2',
  'beautifyGradientAngle', 'beautifyPadding', 'beautifyCornerRadius',
  'beautifyShadow', 'beautifyOuterRadius',
  'canvasFrameEnabled', 'canvasFrameWidth', 'canvasFrameHeight', 'canvasFrameBgColor',
  'watermarkEnabled', 'watermarkDataURL', 'watermarkSize',
];

export default function ConfigSidebar() {
  const { state, dispatch } = useAppState();
  const { settings } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setSettings(patch: Partial<AppSettings>) {
    dispatch({ type: 'SET_SETTINGS', settings: patch });
  }

  function saveProfile(index: 0 | 1) {
    const snap = Object.fromEntries(
      PROFILE_KEYS.map(k => [k, settings[k]])
    ) as ProfileSettings;
    const next: [ProfileSettings | null, ProfileSettings | null] = [...settings.profiles] as any;
    next[index] = snap;
    setSettings({ profiles: next });
  }

  function loadProfile(index: 0 | 1) {
    const p = settings.profiles[index];
    if (!p) return;
    setSettings(p);
  }

  function handleColorChange(index: number, color: string) {
    const next: [string, string, string] = [...settings.companyColors] as [string, string, string];
    next[index] = color;
    setSettings({ companyColors: next });
  }

  function handleResetWatermark() {
    setSettings({ watermarkDataURL: null });
  }

  const companyMode = settings.beautifyEnabled && settings.canvasFrameEnabled && settings.watermarkEnabled;

  return (
    <div className="config-sidebar">
      <div className="config-section">
        <label className="config-heading config-heading-toggle">
          <input
            type="checkbox"
            checked={companyMode}
            onChange={(e) => setSettings({
              beautifyEnabled: e.target.checked,
              canvasFrameEnabled: e.target.checked,
              watermarkEnabled: e.target.checked,
            })}
          />
          Company Mode
        </label>
        <div className="config-profiles">
          {([0, 1] as const).map(i => (
            <div className="config-profile-slot" key={i}>
              <button
                className="config-profile-load"
                disabled={!settings.profiles[i]}
                onClick={() => loadProfile(i)}
                title={settings.profiles[i] ? `Load Profile ${i + 1}` : `Profile ${i + 1} — empty`}
              >
                P{i + 1}
              </button>
              <button
                className="config-profile-save"
                onClick={() => saveProfile(i)}
                title={`Save current settings to Profile ${i + 1}`}
              >
                ⊙
              </button>
            </div>
          ))}
        </div>
      </div>

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
        <label className="config-heading config-heading-toggle">
          <input
            type="checkbox"
            checked={settings.beautifyEnabled}
            onChange={(e) => setSettings({ beautifyEnabled: e.target.checked })}
          />
          Beautify
        </label>
        <div className="config-row">
          <span>Background</span>
          <select
            value={settings.beautifyBgType}
            onChange={(e) => setSettings({ beautifyBgType: e.target.value as 'solid' | 'gradient' })}
            style={{ width: 80 }}
          >
            <option value="gradient">Gradient</option>
            <option value="solid">Solid</option>
          </select>
        </div>
        <label className="config-row">
          <span>Color 1</span>
          <input
            type="color"
            value={settings.beautifyBgColor1}
            onChange={(e) => setSettings({ beautifyBgColor1: e.target.value })}
          />
        </label>
        {settings.beautifyBgType === 'gradient' && (
          <>
            <label className="config-row">
              <span>Color 2</span>
              <input
                type="color"
                value={settings.beautifyBgColor2}
                onChange={(e) => setSettings({ beautifyBgColor2: e.target.value })}
              />
            </label>
            <label className="config-row">
              <span>Angle</span>
              <input
                type="range"
                min={0}
                max={360}
                value={settings.beautifyGradientAngle}
                onChange={(e) => setSettings({ beautifyGradientAngle: Number(e.target.value) })}
              />
              <span className="config-slider-value">{settings.beautifyGradientAngle}&deg;</span>
            </label>
          </>
        )}
        <label className="config-row">
          <span>Padding</span>
          <input
            type="range"
            min={0}
            max={150}
            value={settings.beautifyPadding}
            onChange={(e) => setSettings({ beautifyPadding: Number(e.target.value) })}
          />
          <span className="config-slider-value">{settings.beautifyPadding}</span>
        </label>
        <label className="config-row">
          <span>Radius</span>
          <input
            type="range"
            min={0}
            max={40}
            value={settings.beautifyCornerRadius}
            onChange={(e) => setSettings({ beautifyCornerRadius: Number(e.target.value) })}
          />
          <span className="config-slider-value">{settings.beautifyCornerRadius}</span>
        </label>
        <label className="config-row">
          <span>Shadow</span>
          <input
            type="range"
            min={0}
            max={50}
            value={settings.beautifyShadow}
            onChange={(e) => setSettings({ beautifyShadow: Number(e.target.value) })}
          />
          <span className="config-slider-value">{settings.beautifyShadow}</span>
        </label>
        <label className="config-row">
          <span>Outer R.</span>
          <input
            type="range"
            min={0}
            max={40}
            value={settings.beautifyOuterRadius}
            onChange={(e) => setSettings({ beautifyOuterRadius: Number(e.target.value) })}
          />
          <span className="config-slider-value">{settings.beautifyOuterRadius}</span>
        </label>
      </div>

      <div className="config-section">
        <label className="config-heading config-heading-toggle">
          <input
            type="checkbox"
            checked={settings.canvasFrameEnabled}
            onChange={(e) => setSettings({ canvasFrameEnabled: e.target.checked })}
          />
          Canvas Frame
        </label>
        <label className="config-row">
          <span>Width</span>
          <div className="config-row-input">
            <input
              className="wide"
              type="number"
              min={100}
              max={4000}
              step={50}
              value={settings.canvasFrameWidth}
              onChange={(e) => setSettings({ canvasFrameWidth: Number(e.target.value) })}
            />
            <span className="config-unit">px</span>
          </div>
        </label>
        <label className="config-row">
          <span>Height</span>
          <div className="config-row-input">
            <input
              className="wide"
              type="number"
              min={100}
              max={4000}
              step={50}
              value={settings.canvasFrameHeight}
              onChange={(e) => setSettings({ canvasFrameHeight: Number(e.target.value) })}
            />
            <span className="config-unit">px</span>
          </div>
        </label>
        <label className="config-row">
          <span>Background</span>
          <input
            type="color"
            value={settings.canvasFrameBgColor}
            onChange={(e) => setSettings({ canvasFrameBgColor: e.target.value })}
          />
        </label>
      </div>

      <div className="config-section">
        <label className="config-heading config-heading-toggle">
          <input
            type="checkbox"
            checked={settings.watermarkEnabled}
            onChange={(e) => setSettings({ watermarkEnabled: e.target.checked })}
          />
          Watermark
        </label>
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
