import { useState, useRef, useEffect } from 'react';
import { useAppState, serializeProject } from '../store/AppContext';
import { compositeExport, detectTextRegions, generateId } from '../utils/canvas';
import ExportDialog from './ExportDialog';

export default function Toolbar() {
  const { state, dispatch } = useAppState();
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copying, setCopying] = useState(false);
  const [simplifying, setSimplifying] = useState(false);
  const [simplifyStatus, setSimplifyStatus] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [menuOpen]);

  const hasActiveTab = state.activeTabId !== null;
  const isShapeTool = state.tool === 'rect' || state.tool === 'arrow';
  const exportableTabs = state.tabs.filter(t => t.imageDataURL);

  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  const tabId = state.activeTabId;

  // Look up selected element
  const selectedId = state.selectedId;
  const selectedKind = state.selectedKind;
  const selectedStep = selectedKind === 'step' && tabId
    ? (state.stepIndicators[tabId] || []).find(s => s.id === selectedId) : null;
  const selectedShape = selectedKind === 'shape' && tabId
    ? (state.shapes[tabId] || []).find(s => s.id === selectedId) : null;
  const selectedText = selectedKind === 'text' && tabId
    ? (state.textAnnotations[tabId] || []).find(t => t.id === selectedId) : null;
  const hasSelection = state.tool === 'select' && (selectedStep || selectedShape || selectedText);

  async function handleCopyToClipboard() {
    if (!activeTab || !activeTab.imageDataURL) return;
    setCopying(true);
    try {
      const indicators = state.stepIndicators[activeTab.id] || [];
      const shapes = state.shapes[activeTab.id] || [];
      const texts = state.textAnnotations[activeTab.id] || [];
      const { stepSize, watermarkDataURL: rawWM, watermarkSize, watermarkEnabled } = state.settings;
      const dataURL = await compositeExport(activeTab.imageDataURL, indicators, shapes, stepSize, watermarkEnabled ? rawWM : null, watermarkSize, texts, state.settings.beautifyEnabled ? state.settings : null, state.settings.canvasFrameEnabled ? state.settings : null);
      await window.electronAPI.writeClipboardImage(dataURL);
    } finally {
      setCopying(false);
    }
  }

  async function handleSimplify() {
    if (!activeTab || !activeTab.imageDataURL) return;
    setSimplifying(true);
    setSimplifyStatus('Starting...');
    try {
      const regions = await detectTextRegions(activeTab.imageDataURL, setSimplifyStatus);
      if (regions.length === 0) {
        setSimplifyStatus('No text found');
        setTimeout(() => setSimplifyStatus(''), 2000);
        return;
      }
      const shapes = regions.map((r) => ({
        id: generateId(),
        type: 'rect' as const,
        x1: r.x,
        y1: r.y,
        x2: r.x + r.w,
        y2: r.y + r.h,
        color: r.gray,
        strokeWidth: 0,
        filled: true,
        rectMode: 'normal' as const,
        arrowChevrons: false,
      }));
      dispatch({ type: 'ADD_SHAPES', tabId: activeTab.id, shapes });
      dispatch({ type: 'SET_TOOL', tool: 'select' });
    } catch (err) {
      console.error('Simplify failed:', err);
      setSimplifyStatus('Failed');
      setTimeout(() => setSimplifyStatus(''), 3000);
    } finally {
      setSimplifying(false);
      setSimplifyStatus('');
    }
  }

  async function handleExportAll() {
    if (exportableTabs.length === 0) return;
    setExporting(true);
    try {
      const { stepSize, watermarkDataURL: rawWM2, watermarkSize, watermarkEnabled: we, exportFormat, exportQuality } = state.settings;
      const watermarkDataURL = we ? rawWM2 : null;
      const extMap = { png: 'png', jpeg: 'jpg', webp: 'webp' } as const;
      const ext = extMap[exportFormat];

      const files: { name: string; dataURL: string }[] = [];
      for (const tab of exportableTabs) {
        const indicators = state.stepIndicators[tab.id] || [];
        const shapes = state.shapes[tab.id] || [];
        const texts = state.textAnnotations[tab.id] || [];
        let dataURL = await compositeExport(tab.imageDataURL, indicators, shapes, stepSize, watermarkDataURL, watermarkSize, texts, state.settings.beautifyEnabled ? state.settings : null, state.settings.canvasFrameEnabled ? state.settings : null);

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
      const exportFolder = await window.electronAPI.saveFiles(files);
      if (exportFolder && state.tabs.length > 0) {
        const payload = JSON.stringify(serializeProject(state));
        const firstName = state.tabs[0].name;
        await window.electronAPI.saveProjectToFolder(exportFolder, payload, firstName);
      }
    } finally {
      setExporting(false);
    }
  }

  const hist = tabId ? state.history[tabId] : null;
  const canUndo = !!hist && hist.undoStack.length > 0;
  const canRedo = !!hist && hist.redoStack.length > 0;

  const hasOptions = state.tool === 'step' || state.tool === 'text' || isShapeTool || state.tool === 'blur' || simplifying || !!simplifyStatus || hasSelection;

  return (
    <div className="toolbar-outer">
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
          {/* More menu (Blur + Simplify) */}
          <div className="toolbar-menu-wrapper" ref={menuRef}>
            <button
              className={state.tool === 'blur' ? 'tool-active' : ''}
              onClick={() => setMenuOpen(o => !o)}
              title="More tools"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <circle cx="7" cy="2.5" r="1.5" />
                <circle cx="7" cy="7" r="1.5" />
                <circle cx="7" cy="11.5" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="toolbar-menu">
                <button
                  onClick={() => { dispatch({ type: 'SET_TOOL', tool: 'blur' }); setMenuOpen(false); }}
                  disabled={!hasActiveTab}
                >
                  Blur
                </button>
                <button
                  onClick={() => { handleSimplify(); setMenuOpen(false); }}
                  disabled={!activeTab?.imageDataURL || simplifying}
                >
                  Simplify
                </button>
              </div>
            )}
          </div>
        </div>

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
      </div>

      {/* Options bar — second row, only when a tool has settings */}
      {hasOptions && (
        <div className="toolbar-options">
          {/* Step tool options */}
          {state.tool === 'step' && (
            <>
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
          )}

          {/* Simplify status */}
          {(simplifying || simplifyStatus) && (
            <div className="toolbar-group">
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{simplifyStatus || 'Simplifying...'}</span>
            </div>
          )}

          {/* Selected step indicator properties */}
          {selectedStep && tabId && (
            <>
              <div className="toolbar-group">
                <label>
                  Color:
                  <input
                    type="color"
                    value={selectedStep.color}
                    onChange={(e) => dispatch({ type: 'UPDATE_STEP_INDICATOR', tabId, id: selectedStep.id, changes: { color: e.target.value } })}
                  />
                </label>
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

          {/* Selected shape properties */}
          {selectedShape && tabId && (
            <>
              {selectedShape.type === 'rect' && (
                <div className="toolbar-group">
                  <label>Mode:</label>
                  <select
                    value={selectedShape.rectMode}
                    onChange={(e) => dispatch({ type: 'UPDATE_SHAPE', tabId, id: selectedShape.id, changes: { rectMode: e.target.value as 'normal' | 'blackout' | 'whiteout' } })}
                  >
                    <option value="normal">Normal</option>
                    <option value="blackout">Blackout</option>
                    <option value="whiteout">Whiteout</option>
                  </select>
                </div>
              )}
              {selectedShape.type === 'blur' && (
                <div className="toolbar-group">
                  <label>
                    Strength:
                    <input
                      type="range"
                      min={2}
                      max={20}
                      value={selectedShape.blurStrength ?? 8}
                      onChange={(e) => dispatch({ type: 'UPDATE_SHAPE', tabId, id: selectedShape.id, changes: { blurStrength: Number(e.target.value) } })}
                    />
                    <span style={{ minWidth: 20, textAlign: 'right' }}>{selectedShape.blurStrength ?? 8}</span>
                  </label>
                </div>
              )}
              {(selectedShape.type === 'arrow' || (selectedShape.type === 'rect' && selectedShape.rectMode === 'normal')) && (
                <div className="toolbar-group">
                  <label>
                    Color:
                    <input
                      type="color"
                      value={selectedShape.color}
                      onChange={(e) => dispatch({ type: 'UPDATE_SHAPE', tabId, id: selectedShape.id, changes: { color: e.target.value } })}
                    />
                  </label>
                </div>
              )}
              {selectedShape.type !== 'blur' && (
                <div className="toolbar-group">
                  <label>
                    Stroke:
                    <input
                      type="range"
                      min={1}
                      max={12}
                      value={selectedShape.strokeWidth}
                      onChange={(e) => dispatch({ type: 'UPDATE_SHAPE', tabId, id: selectedShape.id, changes: { strokeWidth: Number(e.target.value) } })}
                    />
                    <span style={{ minWidth: 20, textAlign: 'right' }}>{selectedShape.strokeWidth}</span>
                  </label>
                </div>
              )}
              {selectedShape.type === 'rect' && selectedShape.rectMode === 'normal' && (
                <div className="toolbar-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedShape.filled}
                      onChange={(e) => dispatch({ type: 'UPDATE_SHAPE', tabId, id: selectedShape.id, changes: { filled: e.target.checked } })}
                    />
                    Fill
                  </label>
                </div>
              )}
              {selectedShape.type === 'arrow' && (
                <div className="toolbar-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedShape.arrowChevrons}
                      onChange={(e) => dispatch({ type: 'UPDATE_SHAPE', tabId, id: selectedShape.id, changes: { arrowChevrons: e.target.checked } })}
                    />
                    Chevrons
                  </label>
                </div>
              )}
            </>
          )}

          {/* Selected text annotation properties */}
          {selectedText && tabId && (
            <>
              <div className="toolbar-group">
                <label>
                  Color:
                  <input
                    type="color"
                    value={selectedText.color}
                    onChange={(e) => dispatch({ type: 'UPDATE_TEXT_ANNOTATION', tabId, id: selectedText.id, changes: { color: e.target.value } })}
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
                    value={selectedText.fontSize}
                    onChange={(e) => dispatch({ type: 'UPDATE_TEXT_ANNOTATION', tabId, id: selectedText.id, changes: { fontSize: Number(e.target.value) } })}
                  />
                  <span style={{ minWidth: 28, textAlign: 'right' }}>{selectedText.fontSize}</span>
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

          {/* Brand color swatches for selected elements */}
          {hasSelection && (
            <>
              <div className="toolbar-divider" />
              <div className="toolbar-group">
                {state.settings.companyColors.map((color, i) => {
                  const currentColor = selectedStep?.color ?? selectedShape?.color ?? selectedText?.color ?? '';
                  return (
                    <button
                      key={i}
                      className={`color-swatch${currentColor === color ? ' swatch-active' : ''}`}
                      style={{ background: color }}
                      onClick={() => {
                        if (selectedStep && tabId) dispatch({ type: 'UPDATE_STEP_INDICATOR', tabId, id: selectedStep.id, changes: { color } });
                        if (selectedShape && tabId) dispatch({ type: 'UPDATE_SHAPE', tabId, id: selectedShape.id, changes: { color } });
                        if (selectedText && tabId) dispatch({ type: 'UPDATE_TEXT_ANNOTATION', tabId, id: selectedText.id, changes: { color } });
                      }}
                      title={`Brand color ${i + 1}`}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </div>
  );
}
