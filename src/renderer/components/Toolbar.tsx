import { useState } from 'react';
import { useAppState } from '../store/AppContext';
import { compositeExport } from '../utils/canvas';
import ExportDialog from './ExportDialog';

export default function Toolbar() {
  const { state, dispatch } = useAppState();
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copying, setCopying] = useState(false);

  const hasActiveTab = state.activeTabId !== null;
  const isShapeTool = state.tool === 'rect' || state.tool === 'arrow';
  const exportableTabs = state.tabs.filter(t => t.imageDataURL);

  const activeTab = state.tabs.find(t => t.id === state.activeTabId);

  async function handleCopyToClipboard() {
    if (!activeTab || !activeTab.imageDataURL) return;
    setCopying(true);
    try {
      const indicators = state.stepIndicators[activeTab.id] || [];
      const shapes = state.shapes[activeTab.id] || [];
      const texts = state.textAnnotations[activeTab.id] || [];
      const { borderColor, borderWidth, stepSize, watermarkDataURL, watermarkSize } = state.settings;
      const dataURL = await compositeExport(activeTab.imageDataURL, indicators, shapes, borderColor, borderWidth, stepSize, watermarkDataURL, watermarkSize, texts);
      await window.electronAPI.writeClipboardImage(dataURL);
    } finally {
      setCopying(false);
    }
  }

  async function handleExportAll() {
    if (exportableTabs.length === 0) return;
    setExporting(true);
    try {
      const { borderColor, borderWidth, stepSize, watermarkDataURL, watermarkSize, exportFormat, exportQuality } = state.settings;
      const extMap = { png: 'png', jpeg: 'jpg', webp: 'webp' } as const;
      const ext = extMap[exportFormat];

      const files: { name: string; dataURL: string }[] = [];
      for (const tab of exportableTabs) {
        const indicators = state.stepIndicators[tab.id] || [];
        const shapes = state.shapes[tab.id] || [];
        const texts = state.textAnnotations[tab.id] || [];
        let dataURL = await compositeExport(tab.imageDataURL, indicators, shapes, borderColor, borderWidth, stepSize, watermarkDataURL, watermarkSize, texts);

        if (exportFormat !== 'png') {
          const img = new Image();
          await new Promise<void>(r => { img.onload = () => r(); img.src = dataURL; });
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          const ctx = c.getContext('2d')!;
          if (exportFormat === 'jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
          ctx.drawImage(img, 0, 0);
          dataURL = c.toDataURL(`image/${exportFormat}`, exportQuality);
        }

        const name = tab.name.replace(/\.[^.]+$/, '') + '.' + ext;
        files.push({ name, dataURL });
      }
      await window.electronAPI.saveFiles(files);
    } finally {
      setExporting(false);
    }
  }

  const tabId = state.activeTabId;
  const hist = tabId ? state.history[tabId] : null;
  const canUndo = !!hist && hist.undoStack.length > 0;
  const canRedo = !!hist && hist.redoStack.length > 0;

  return (
    <div className="toolbar">
      {/* Undo / Redo */}
      <div className="toolbar-group">
        <button
          onClick={() => tabId && dispatch({ type: 'UNDO', tabId })}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="undo-redo-btn"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 5.5h6.5a3.5 3.5 0 0 1 0 7H8" />
            <path d="M5.5 3L3 5.5 5.5 8" />
          </svg>
        </button>
        <button
          onClick={() => tabId && dispatch({ type: 'REDO', tabId })}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          className="undo-redo-btn"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5.5H5.5a3.5 3.5 0 0 0 0 7H7" />
            <path d="M9.5 3L12 5.5 9.5 8" />
          </svg>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Tool buttons */}
      <div className="toolbar-group">
        <button
          className={state.tool === 'select' ? 'tool-active' : ''}
          onClick={() => dispatch({ type: 'SET_TOOL', tool: 'select' })}
          title="Select / Move (V)"
        >
          Select
        </button>
        <button
          className={state.tool === 'step' ? 'tool-active' : ''}
          onClick={() => dispatch({ type: 'SET_TOOL', tool: 'step' })}
          disabled={!hasActiveTab}
          title="Step Indicator"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="6" fill="currentColor" opacity="0.2" />
            <circle cx="7" cy="7" r="6" />
            <text x="7" y="7.5" textAnchor="middle" dominantBaseline="middle" fill="currentColor" stroke="none" fontSize="8" fontWeight="bold">1</text>
          </svg>
          {' '}Step
        </button>
        <button
          className={state.tool === 'text' ? 'tool-active' : ''}
          onClick={() => dispatch({ type: 'SET_TOOL', tool: 'text' })}
          disabled={!hasActiveTab}
          title="Text Annotation"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 3h8" />
            <path d="M7 3v9" />
            <path d="M5 12h4" />
          </svg>
          {' '}Text
        </button>
        <button
          className={state.tool === 'rect' ? 'tool-active' : ''}
          onClick={() => dispatch({ type: 'SET_TOOL', tool: 'rect' })}
          disabled={!hasActiveTab}
          title="Rectangle"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="2" width="12" height="10" rx="1.5" />
          </svg>
          {' '}Rect
        </button>
        <button
          className={state.tool === 'arrow' ? 'tool-active' : ''}
          onClick={() => dispatch({ type: 'SET_TOOL', tool: 'arrow' })}
          disabled={!hasActiveTab}
          title="Arrow"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" stroke="currentColor" strokeWidth="0.5">
            <line x1="1" y1="13" x2="10" y2="4" strokeWidth="1.5" fill="none" />
            <polygon points="13,1 6.5,3.5 10.5,7.5" />
          </svg>
          {' '}Arrow
        </button>
        <button
          className={state.tool === 'blur' ? 'tool-active' : ''}
          onClick={() => dispatch({ type: 'SET_TOOL', tool: 'blur' })}
          disabled={!hasActiveTab}
          title="Blur / Pixelate"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="5" height="5" fill="currentColor" opacity="0.3" />
            <rect x="8" y="1" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="1" y="8" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="8" y="8" width="5" height="5" fill="currentColor" opacity="0.3" />
          </svg>
          {' '}Blur
        </button>
        <button
          className={state.tool === 'crop' ? 'tool-active' : ''}
          onClick={() => dispatch({ type: 'SET_TOOL', tool: 'crop' })}
          disabled={!hasActiveTab}
          title="Crop"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3.5 0v10.5H14" />
            <path d="M10.5 14V3.5H0" />
          </svg>
          {' '}Crop
        </button>
      </div>

      {/* Step tool options */}
      {state.tool === 'step' && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-group">
            <label>Style:</label>
            <select
              value={state.stepStyle}
              onChange={(e) => dispatch({ type: 'SET_STEP_STYLE', style: e.target.value as 'decimal' | 'roman' })}
            >
              <option value="decimal">1. 2. 3.</option>
              <option value="roman">I. II. III.</option>
            </select>
          </div>
          <div className="toolbar-group">
            <label>
              Size:
              <input
                type="range"
                min={16}
                max={80}
                value={state.settings.stepSize}
                onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { stepSize: Number(e.target.value) } })}
              />
              <span style={{ minWidth: 28, textAlign: 'right' }}>{state.settings.stepSize}</span>
            </label>
          </div>
        </>
      )}

      {/* Text tool options */}
      {state.tool === 'text' && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-group">
            <label>
              Color:
              <input
                type="color"
                value={state.settings.shapeColor}
                onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { shapeColor: e.target.value } })}
              />
            </label>
          </div>
          <div className="toolbar-group">
            <label>
              Size:
              <input
                type="range"
                min={10}
                max={48}
                value={state.settings.textFontSize}
                onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { textFontSize: Number(e.target.value) } })}
              />
              <span style={{ minWidth: 28, textAlign: 'right' }}>{state.settings.textFontSize}</span>
            </label>
          </div>
        </>
      )}

      {/* Shape tool options */}
      {isShapeTool && (
        <>
          <div className="toolbar-divider" />
          {state.tool === 'rect' && (
            <div className="toolbar-group">
              <label>Mode:</label>
              <select
                value={state.settings.rectMode}
                onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { rectMode: e.target.value as 'normal' | 'blackout' | 'whiteout' } })}
              >
                <option value="normal">Normal</option>
                <option value="blackout">Blackout</option>
                <option value="whiteout">Whiteout</option>
              </select>
            </div>
          )}
          {(state.tool === 'arrow' || (state.tool === 'rect' && state.settings.rectMode === 'normal')) && (
            <div className="toolbar-group">
              <label>
                Color:
                <input
                  type="color"
                  value={state.settings.shapeColor}
                  onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { shapeColor: e.target.value } })}
                />
              </label>
            </div>
          )}
          <div className="toolbar-group">
            <label>
              Stroke:
              <input
                type="range"
                min={1}
                max={12}
                value={state.settings.shapeStrokeWidth}
                onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { shapeStrokeWidth: Number(e.target.value) } })}
              />
              <span style={{ minWidth: 20, textAlign: 'right' }}>{state.settings.shapeStrokeWidth}</span>
            </label>
          </div>
          {state.tool === 'rect' && state.settings.rectMode === 'normal' && (
            <div className="toolbar-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={state.settings.shapeFilled}
                  onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { shapeFilled: e.target.checked } })}
                />
                Fill
              </label>
            </div>
          )}
          {state.tool === 'arrow' && (
            <div className="toolbar-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={state.settings.arrowChevrons}
                  onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { arrowChevrons: e.target.checked } })}
                />
                Chevrons
              </label>
            </div>
          )}
        </>
      )}

      {/* Blur tool options */}
      {state.tool === 'blur' && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-group">
            <label>
              Strength:
              <input
                type="range"
                min={2}
                max={20}
                value={state.settings.blurStrength}
                onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { blurStrength: Number(e.target.value) } })}
              />
              <span style={{ minWidth: 20, textAlign: 'right' }}>{state.settings.blurStrength}</span>
            </label>
          </div>
        </>
      )}

      {/* Brand color swatches */}
      {(isShapeTool || state.tool === 'step' || state.tool === 'text') && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-group">
            {state.settings.companyColors.map((color, i) => (
              <button
                key={i}
                className={`color-swatch${state.settings.shapeColor === color ? ' swatch-active' : ''}`}
                style={{ background: color }}
                onClick={() => dispatch({ type: 'SET_SETTINGS', settings: { shapeColor: color } })}
                title={`Brand color ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}

      <div style={{ flex: 1 }} />

      {/* Copy to Clipboard */}
      <button
        onClick={handleCopyToClipboard}
        disabled={!activeTab?.imageDataURL || copying}
        title="Copy to clipboard (Ctrl+Shift+C)"
      >
        {copying ? 'Copied!' : (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: -2 }}>
              <rect x="4" y="4" width="9" height="9" rx="1.5" />
              <path d="M10 4V2.5A1.5 1.5 0 0 0 8.5 1H2.5A1.5 1.5 0 0 0 1 2.5v6A1.5 1.5 0 0 0 2.5 10H4" />
            </svg>
            {' '}Copy
          </>
        )}
      </button>

      <button
        className="primary"
        onClick={() => setShowExport(true)}
        disabled={!hasActiveTab}
      >
        Export
      </button>
      <button
        onClick={handleExportAll}
        disabled={exportableTabs.length === 0 || exporting}
        title="Export all images to a folder"
      >
        {exporting ? 'Exporting...' : 'Export All'}
      </button>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </div>
  );
}
