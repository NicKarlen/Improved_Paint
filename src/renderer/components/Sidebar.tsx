import { useState, useRef, useEffect } from 'react';
import { useAppState, serializeProject } from '../store/AppContext';
import { generateId, nextTabName, compositeExport } from '../utils/canvas';
import { ProjectFile, IPAINT_VERSION } from '../../shared/types';

interface ContextMenuState {
  tabId: string;
  x: number;
  y: number;
}

export default function Sidebar() {
  const { state, dispatch } = useAppState();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showBulkRename, setShowBulkRename] = useState(false);
  const [baseName, setBaseName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Dismiss context menu on click outside or Escape
  useEffect(() => {
    if (!contextMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setContextMenu(null);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [contextMenu]);

  function isGenericName(name: string) {
    return /^(Canvas|Screenshot)\s*\d*$/i.test(name);
  }

  function startRename(id: string, currentName: string) {
    setEditingId(id);
    setEditValue(currentName);
  }

  function commitRename() {
    if (editingId && editValue.trim()) {
      dispatch({ type: 'RENAME_TAB', id: editingId, name: editValue.trim() });
    }
    setEditingId(null);
  }

  async function handleOpenProject() {
    if (state.tabs.length > 0) {
      if (!window.confirm('Opening a project will close all current tabs. Continue?')) return;
    }
    setOpening(true);
    try {
      const raw = await window.electronAPI.openProject();
      if (!raw) return;
      const project: ProjectFile = JSON.parse(raw);
      if (project.version !== IPAINT_VERSION) {
        alert('Incompatible project file version.');
        return;
      }
      dispatch({ type: 'LOAD_PROJECT', project });
    } catch { alert('Could not read project file.'); }
    finally { setOpening(false); }
  }

  async function handleSaveProject() {
    if (state.tabs.length === 0) return;
    setSaving(true);
    try {
      const payload = JSON.stringify(serializeProject(state));
      const defaultName = state.tabs[0].name;
      await window.electronAPI.saveProject(payload, defaultName);
    } finally {
      setSaving(false);
    }
  }

  function addBlankTab() {
    // Auto-sequence: if all existing tabs share one meaningful base name, continue it.
    // e.g. "Setup" → adds "Setup Nr2" and renames the existing one to "Setup Nr1"
    // e.g. "Setup Nr1", "Setup Nr2" → adds "Setup Nr3"
    if (state.tabs.length > 0) {
      const bases = state.tabs.map(t => t.name.replace(/ Nr\d+$/, ''));
      const base = bases[0];
      const isGeneric = /^(Screenshot|Canvas)\s*\d*$/i.test(base);
      const allSameBase = bases.every(b => b === base);

      if (!isGeneric && allSameBase) {
        // Rename any tab that is still without a NrN suffix
        state.tabs.forEach((tab, i) => {
          if (!/ Nr\d+$/.test(tab.name)) {
            dispatch({ type: 'RENAME_TAB', id: tab.id, name: `${base} Nr${i + 1}` });
          }
        });
        // New tab gets the next number after the current highest (fallback: tab count)
        const maxNr = state.tabs.reduce((max, t) => {
          const m = t.name.match(/ Nr(\d+)$/);
          return m ? Math.max(max, parseInt(m[1])) : max;
        }, state.tabs.length);
        dispatch({
          type: 'ADD_TAB',
          tab: { id: generateId(), name: `${base} Nr${maxNr + 1}`, imageDataURL: '', thumbnail: '' },
        });
        return;
      }
    }

    dispatch({
      type: 'ADD_TAB',
      tab: { id: generateId(), name: nextTabName(state.tabs, 'Canvas'), imageDataURL: '', thumbnail: '' },
    });
  }

  function handleTabContextMenu(e: React.MouseEvent, tabId: string) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  }

  function handleDuplicate(tabId: string) {
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;
    dispatch({
      type: 'DUPLICATE_TAB',
      sourceTabId: tabId,
      newTab: { id: generateId(), name: tab.name + ' copy', imageDataURL: tab.imageDataURL, thumbnail: tab.thumbnail },
    });
    setContextMenu(null);
  }

  function openBulkRename() {
    // Pre-fill with the first tab's name, stripping any existing " NrN" suffix
    const firstName = state.tabs[0]?.name ?? '';
    setBaseName(firstName.replace(/ Nr\d+$/, ''));
    setShowBulkRename(true);
  }

  function commitBulkRename() {
    const base = baseName.trim();
    if (!base) return;
    state.tabs.forEach((tab, i) => {
      const name = state.tabs.length === 1 ? base : `${base} Nr${i + 1}`;
      dispatch({ type: 'RENAME_TAB', id: tab.id, name });
    });
    setShowBulkRename(false);
  }

  async function handleExportSingle(tabId: string) {
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab || !tab.imageDataURL) return;
    const { stepSize, watermarkDataURL: rawWM, watermarkSize, watermarkEnabled, exportFormat, exportQuality } = state.settings;
    const indicators = state.stepIndicators[tab.id] || [];
    const shapes = state.shapes[tab.id] || [];
    let dataURL = await compositeExport(tab.imageDataURL, indicators, shapes, stepSize, watermarkEnabled ? rawWM : null, watermarkSize, [], state.settings.beautifyEnabled ? state.settings : null, state.settings.canvasFrameEnabled ? state.settings : null);

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

    const extMap = { png: 'png', jpeg: 'jpg', webp: 'webp' } as const;
    const name = tab.name.replace(/\.[^.]+$/, '') + '.' + extMap[exportFormat];
    await window.electronAPI.saveFile(dataURL, name, exportFormat);
    setContextMenu(null);
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button onClick={handleOpenProject} disabled={opening} title="Open project (.ipaint)">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: -2 }}>
            <path d="M1 4.5A1.5 1.5 0 0 1 2.5 3h3l1.5 1.5H12A1.5 1.5 0 0 1 13.5 6v5A1.5 1.5 0 0 1 12 12.5H2.5A1.5 1.5 0 0 1 1 11V4.5z" />
          </svg>
          {' '}{opening ? 'Opening…' : 'Open'}
        </button>
        <button onClick={handleSaveProject} disabled={saving || state.tabs.length === 0} title="Save project (.ipaint)">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: -2 }}>
            <rect x="1" y="1" width="12" height="12" rx="1.5" />
            <path d="M4 1v4h6V1" />
            <rect x="4.5" y="7.5" width="5" height="4" rx="0.5" />
          </svg>
          {' '}{saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={openBulkRename}
          disabled={state.tabs.length === 0}
          title="Rename all tabs at once"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: -1 }}>
            <path d="M1 3.5h7" />
            <path d="M1 7h5" />
            <path d="M1 10.5h3.5" />
            <path d="M9.5 8l2-2 1.5 1.5-2 2z" />
            <path d="M11.5 6l1 1" />
            <path d="M9.5 10l0.5 0.5" />
          </svg>
          {' '}Rename
        </button>
      </div>
      <div className="tab-list">
        {state.tabs.length === 0 && (
          <div className="sidebar-empty">
            No images yet.<br />
            Paste a screenshot or open a file.
          </div>
        )}
        {state.tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab-item ${tab.id === state.activeTabId ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', id: tab.id })}
            onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
          >
            <img className="tab-thumb" src={tab.imageDataURL} alt="" />
            <div className="tab-info">
              {editingId === tab.id ? (
                <input
                  ref={inputRef}
                  className="tab-name-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <div
                    className="tab-name"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startRename(tab.id, tab.name);
                    }}
                    title="Double-click to rename"
                  >
                    {tab.name}
                  </div>
                  {isGenericName(tab.name) && (
                    <span className="tab-nudge" title="Double-click name to rename" onClick={(e) => { e.stopPropagation(); startRename(tab.id, tab.name); }}>
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8.5 1.5L10.5 3.5 5 9 2 10 3 7Z" />
                        <line x1="7" y1="3" x2="9" y2="5" />
                      </svg>
                    </span>
                  )}
                </>
              )}
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: 'REMOVE_TAB', id: tab.id });
                }}
              >
                &times;
              </button>
            </div>
          </div>
        ))}
        <button className="add-canvas-btn" onClick={addBlankTab} title="New empty tab">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="10" y1="4" x2="10" y2="16" />
            <line x1="4" y1="10" x2="16" y2="10" />
          </svg>
        </button>
      </div>

      {showBulkRename && (
        <div className="dialog-overlay" onClick={() => setShowBulkRename(false)}>
          <div className="dialog bulk-rename-dialog" onClick={e => e.stopPropagation()}>
            <h3>Rename Tabs</h3>
            <input
              className="bulk-rename-input"
              placeholder="Base name…"
              value={baseName}
              onChange={e => setBaseName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitBulkRename(); }
                if (e.key === 'Escape') setShowBulkRename(false);
              }}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            {baseName.trim() && (
              <div className="bulk-rename-preview">
                {state.tabs.slice(0, 4).map((_, i) => (
                  <span key={i} className="bulk-rename-chip">
                    {state.tabs.length === 1 ? baseName.trim() : `${baseName.trim()} Nr${i + 1}`}
                  </span>
                ))}
                {state.tabs.length > 4 && (
                  <span className="bulk-rename-chip bulk-rename-chip-more">+{state.tabs.length - 4} more</span>
                )}
              </div>
            )}
            <div className="dialog-actions">
              <button onClick={() => setShowBulkRename(false)}>Cancel</button>
              <button className="primary" onClick={commitBulkRename} disabled={!baseName.trim()}>
                Rename {state.tabs.length === 1 ? 'Tab' : `${state.tabs.length} Tabs`}
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          ref={menuRef}
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => {
            const tab = state.tabs.find(t => t.id === contextMenu.tabId);
            if (tab) startRename(tab.id, tab.name);
            setContextMenu(null);
          }}>Rename</button>
          <button onClick={() => handleDuplicate(contextMenu.tabId)}>Duplicate</button>
          <button onClick={() => handleExportSingle(contextMenu.tabId)}>Export</button>
          <div className="context-menu-divider" />
          <button className="context-menu-danger" onClick={() => {
            dispatch({ type: 'REMOVE_TAB', id: contextMenu.tabId });
            setContextMenu(null);
          }}>Close</button>
        </div>
      )}
    </div>
  );
}
