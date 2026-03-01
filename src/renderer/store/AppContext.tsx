import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Tab, StepIndicator, Shape, TextAnnotation, AppSettings, DEFAULT_SETTINGS, ProjectFile, IPAINT_VERSION } from '../../shared/types';

export type ToolType = 'select' | 'step' | 'rect' | 'arrow' | 'crop' | 'blur' | 'text';

// Per-tab annotation snapshot for undo/redo
interface AnnotationSnapshot {
  stepIndicators: StepIndicator[];
  shapes: Shape[];
  textAnnotations: TextAnnotation[];
  nextStepNumber: number;
  drawOrder: string[];
  imageDataURL?: string; // stored only for destructive ops like crop
  thumbnail?: string;
}

interface TabHistory {
  undoStack: AnnotationSnapshot[];
  redoStack: AnnotationSnapshot[];
}

interface State {
  tabs: Tab[];
  activeTabId: string | null;
  settings: AppSettings;
  stepIndicators: Record<string, StepIndicator[]>;
  shapes: Record<string, Shape[]>;
  textAnnotations: Record<string, TextAnnotation[]>;
  drawOrder: Record<string, string[]>;
  history: Record<string, TabHistory>;
  tool: ToolType;
  stepStyle: 'decimal' | 'roman';
  nextStepNumber: Record<string, number>;
  selectedId: string | null;
  selectedKind: 'step' | 'shape' | 'text' | null;
}

type Action =
  | { type: 'ADD_TAB'; tab: Tab }
  | { type: 'REMOVE_TAB'; id: string }
  | { type: 'SET_ACTIVE_TAB'; id: string }
  | { type: 'UPDATE_TAB_IMAGE'; id: string; imageDataURL: string; thumbnail: string }
  | { type: 'RENAME_TAB'; id: string; name: string }
  | { type: 'SET_SETTINGS'; settings: Partial<AppSettings> }
  | { type: 'LOAD_SETTINGS'; settings: AppSettings }
  | { type: 'SET_TOOL'; tool: ToolType }
  | { type: 'SET_STEP_STYLE'; style: 'decimal' | 'roman' }
  | { type: 'ADD_STEP_INDICATOR'; tabId: string; indicator: StepIndicator }
  | { type: 'ADD_SHAPE'; tabId: string; shape: Shape }
  | { type: 'ADD_SHAPES'; tabId: string; shapes: Shape[] }
  | { type: 'ADD_TEXT_ANNOTATION'; tabId: string; annotation: TextAnnotation }
  | { type: 'UPDATE_TEXT_ANNOTATION'; tabId: string; id: string; changes: Partial<TextAnnotation>; skipUndo?: true }
  | { type: 'UPDATE_SHAPE'; tabId: string; id: string; changes: Partial<Shape>; skipUndo?: true }
  | { type: 'UPDATE_STEP_INDICATOR'; tabId: string; id: string; changes: Partial<StepIndicator>; skipUndo?: true }
  | { type: 'PUSH_UNDO'; tabId: string }
  | { type: 'REMOVE_ANNOTATION'; tabId: string; annotationId: string }
  | { type: 'UNDO'; tabId: string }
  | { type: 'REDO'; tabId: string }
  | { type: 'REORDER_TABS'; fromIndex: number; toIndex: number }
  | { type: 'CROP_IMAGE'; tabId: string; imageDataURL: string; thumbnail: string }
  | { type: 'COMMIT_IMAGE_CHANGE'; tabId: string; imageDataURL: string; thumbnail: string }
  | { type: 'DUPLICATE_TAB'; sourceTabId: string; newTab: Tab }
  | { type: 'SET_SELECTION'; id: string | null; kind: 'step' | 'shape' | 'text' | null }
  | { type: 'LOAD_PROJECT'; project: ProjectFile }
  | { type: 'BATCH_MOVE'; tabId: string; steps: { id: string; x: number; y: number }[]; shapes: { id: string; x1: number; y1: number; x2: number; y2: number }[]; texts: { id: string; x: number; y: number }[]; skipUndo?: true }
  | { type: 'REORDER_ANNOTATION'; tabId: string; annotationId: string; direction: 'front' | 'back' };

const MAX_HISTORY = 50;

const initialState: State = {
  tabs: [],
  activeTabId: null,
  settings: DEFAULT_SETTINGS,
  stepIndicators: {},
  shapes: {},
  textAnnotations: {},
  drawOrder: {},
  history: {},
  tool: 'select',
  stepStyle: 'decimal',
  nextStepNumber: {},
  selectedId: null,
  selectedKind: null,
};

/** Take a snapshot of current annotations for a tab */
function snapshot(state: State, tabId: string): AnnotationSnapshot {
  return {
    stepIndicators: state.stepIndicators[tabId] || [],
    shapes: state.shapes[tabId] || [],
    textAnnotations: state.textAnnotations[tabId] || [],
    nextStepNumber: state.nextStepNumber[tabId] || 1,
    drawOrder: state.drawOrder[tabId] || [],
  };
}

/** Push current state onto undo stack before a mutation, clear redo */
function pushUndo(state: State, tabId: string): Record<string, TabHistory> {
  const current = snapshot(state, tabId);
  const hist = state.history[tabId] || { undoStack: [], redoStack: [] };
  return {
    ...state.history,
    [tabId]: {
      undoStack: [...hist.undoStack.slice(-MAX_HISTORY + 1), current],
      redoStack: [], // new action clears redo
    },
  };
}

export function serializeProject(state: State): ProjectFile {
  return {
    version: IPAINT_VERSION,
    savedAt: new Date().toISOString(),
    activeTabId: state.activeTabId,
    tabs: state.tabs.map(tab => ({
      id: tab.id,
      name: tab.name,
      imageDataURL: tab.imageDataURL,
      thumbnail: tab.thumbnail,
      stepIndicators: state.stepIndicators[tab.id] || [],
      shapes: state.shapes[tab.id] || [],
      textAnnotations: state.textAnnotations[tab.id] || [],
      nextStepNumber: state.nextStepNumber[tab.id] || 1,
      drawOrder: state.drawOrder[tab.id] || [],
    })),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TAB':
      return {
        ...state,
        tabs: [...state.tabs, action.tab],
        activeTabId: action.tab.id,
        stepIndicators: { ...state.stepIndicators, [action.tab.id]: [] },
        shapes: { ...state.shapes, [action.tab.id]: [] },
        textAnnotations: { ...state.textAnnotations, [action.tab.id]: [] },
        drawOrder: { ...state.drawOrder, [action.tab.id]: [] },
        history: { ...state.history, [action.tab.id]: { undoStack: [], redoStack: [] } },
        nextStepNumber: { ...state.nextStepNumber, [action.tab.id]: 1 },
      };
    case 'REMOVE_TAB': {
      const tabs = state.tabs.filter(t => t.id !== action.id);
      const { [action.id]: _s, ...stepIndicators } = state.stepIndicators;
      const { [action.id]: _sh, ...shapes } = state.shapes;
      const { [action.id]: _ta, ...textAnnotations } = state.textAnnotations;
      const { [action.id]: _do, ...drawOrder } = state.drawOrder;
      const { [action.id]: _h, ...history } = state.history;
      const { [action.id]: _n, ...nextStepNumber } = state.nextStepNumber;
      let activeTabId = state.activeTabId;
      if (activeTabId === action.id) {
        const idx = state.tabs.findIndex(t => t.id === action.id);
        activeTabId = tabs[Math.min(idx, tabs.length - 1)]?.id ?? null;
      }
      return { ...state, tabs, activeTabId, stepIndicators, shapes, textAnnotations, drawOrder, history, nextStepNumber };
    }
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTabId: action.id, selectedId: null, selectedKind: null };
    case 'UPDATE_TAB_IMAGE':
      return {
        ...state,
        tabs: state.tabs.map(t =>
          t.id === action.id ? { ...t, imageDataURL: action.imageDataURL, thumbnail: action.thumbnail } : t
        ),
      };
    case 'RENAME_TAB':
      return {
        ...state,
        tabs: state.tabs.map(t => (t.id === action.id ? { ...t, name: action.name } : t)),
      };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case 'LOAD_SETTINGS':
      return { ...state, settings: action.settings };
    case 'SET_TOOL':
      return { ...state, tool: action.tool, selectedId: null, selectedKind: null };
    case 'SET_STEP_STYLE':
      return { ...state, stepStyle: action.style };
    case 'SET_SELECTION':
      return { ...state, selectedId: action.id, selectedKind: action.kind };

    case 'ADD_STEP_INDICATOR': {
      const history = pushUndo(state, action.tabId);
      const existing = state.stepIndicators[action.tabId] || [];
      return {
        ...state,
        history,
        stepIndicators: { ...state.stepIndicators, [action.tabId]: [...existing, action.indicator] },
        nextStepNumber: { ...state.nextStepNumber, [action.tabId]: (state.nextStepNumber[action.tabId] || 1) + 1 },
        drawOrder: { ...state.drawOrder, [action.tabId]: [...(state.drawOrder[action.tabId] || []), action.indicator.id] },
      };
    }
    case 'ADD_SHAPE': {
      const history = pushUndo(state, action.tabId);
      const existing = state.shapes[action.tabId] || [];
      return {
        ...state,
        history,
        shapes: { ...state.shapes, [action.tabId]: [...existing, action.shape] },
        drawOrder: { ...state.drawOrder, [action.tabId]: [...(state.drawOrder[action.tabId] || []), action.shape.id] },
      };
    }
    case 'ADD_SHAPES': {
      const history = pushUndo(state, action.tabId);
      const existing = state.shapes[action.tabId] || [];
      return {
        ...state,
        history,
        shapes: { ...state.shapes, [action.tabId]: [...existing, ...action.shapes] },
        drawOrder: { ...state.drawOrder, [action.tabId]: [...(state.drawOrder[action.tabId] || []), ...action.shapes.map(s => s.id)] },
      };
    }
    case 'ADD_TEXT_ANNOTATION': {
      const history = pushUndo(state, action.tabId);
      const existing = state.textAnnotations[action.tabId] || [];
      return {
        ...state,
        history,
        textAnnotations: { ...state.textAnnotations, [action.tabId]: [...existing, action.annotation] },
        drawOrder: { ...state.drawOrder, [action.tabId]: [...(state.drawOrder[action.tabId] || []), action.annotation.id] },
      };
    }
    case 'UPDATE_TEXT_ANNOTATION': {
      const history = action.skipUndo ? state.history : pushUndo(state, action.tabId);
      const texts = (state.textAnnotations[action.tabId] || []).map(t =>
        t.id === action.id ? { ...t, ...action.changes } : t
      );
      return { ...state, history, textAnnotations: { ...state.textAnnotations, [action.tabId]: texts } };
    }
    case 'UPDATE_SHAPE': {
      const history = action.skipUndo ? state.history : pushUndo(state, action.tabId);
      const shapes = (state.shapes[action.tabId] || []).map(s =>
        s.id === action.id ? { ...s, ...action.changes } : s
      );
      return { ...state, history, shapes: { ...state.shapes, [action.tabId]: shapes } };
    }
    case 'UPDATE_STEP_INDICATOR': {
      const history = action.skipUndo ? state.history : pushUndo(state, action.tabId);
      const steps = (state.stepIndicators[action.tabId] || []).map(s =>
        s.id === action.id ? { ...s, ...action.changes } : s
      );
      return { ...state, history, stepIndicators: { ...state.stepIndicators, [action.tabId]: steps } };
    }
    case 'PUSH_UNDO':
      return { ...state, history: pushUndo(state, action.tabId) };
    case 'REMOVE_ANNOTATION': {
      const history = pushUndo(state, action.tabId);
      const allSteps = state.stepIndicators[action.tabId] || [];
      const wasStep = allSteps.some(i => i.id === action.annotationId);
      const steps = allSteps.filter(i => i.id !== action.annotationId);
      const shapes = (state.shapes[action.tabId] || []).filter(s => s.id !== action.annotationId);
      const texts = (state.textAnnotations[action.tabId] || []).filter(t => t.id !== action.annotationId);
      const currentNum = state.nextStepNumber[action.tabId] || 1;
      return {
        ...state,
        history,
        stepIndicators: { ...state.stepIndicators, [action.tabId]: steps },
        shapes: { ...state.shapes, [action.tabId]: shapes },
        textAnnotations: { ...state.textAnnotations, [action.tabId]: texts },
        nextStepNumber: { ...state.nextStepNumber, [action.tabId]: wasStep ? Math.max(1, currentNum - 1) : currentNum },
        drawOrder: { ...state.drawOrder, [action.tabId]: (state.drawOrder[action.tabId] || []).filter(id => id !== action.annotationId) },
      };
    }

    case 'CROP_IMAGE': {
      // Store current image + annotations in undo so crop is reversible
      const tab = state.tabs.find(t => t.id === action.tabId);
      if (!tab) return state;
      const currentSnap = snapshot(state, action.tabId);
      const snapWithImage: AnnotationSnapshot = { ...currentSnap, imageDataURL: tab.imageDataURL, thumbnail: tab.thumbnail };
      const hist = state.history[action.tabId] || { undoStack: [], redoStack: [] };
      return {
        ...state,
        tabs: state.tabs.map(t =>
          t.id === action.tabId ? { ...t, imageDataURL: action.imageDataURL, thumbnail: action.thumbnail } : t
        ),
        stepIndicators: { ...state.stepIndicators, [action.tabId]: [] },
        shapes: { ...state.shapes, [action.tabId]: [] },
        textAnnotations: { ...state.textAnnotations, [action.tabId]: [] },
        nextStepNumber: { ...state.nextStepNumber, [action.tabId]: 1 },
        drawOrder: { ...state.drawOrder, [action.tabId]: [] },
        history: {
          ...state.history,
          [action.tabId]: {
            undoStack: [...hist.undoStack.slice(-MAX_HISTORY + 1), snapWithImage],
            redoStack: [],
          },
        },
      };
    }

    case 'COMMIT_IMAGE_CHANGE': {
      // Like CROP_IMAGE but keeps annotations intact (used for overlay commit)
      const tab = state.tabs.find(t => t.id === action.tabId);
      if (!tab) return state;
      const currentSnap = snapshot(state, action.tabId);
      const snapWithImage: AnnotationSnapshot = { ...currentSnap, imageDataURL: tab.imageDataURL, thumbnail: tab.thumbnail };
      const hist = state.history[action.tabId] || { undoStack: [], redoStack: [] };
      return {
        ...state,
        tabs: state.tabs.map(t =>
          t.id === action.tabId ? { ...t, imageDataURL: action.imageDataURL, thumbnail: action.thumbnail } : t
        ),
        history: {
          ...state.history,
          [action.tabId]: {
            undoStack: [...hist.undoStack.slice(-MAX_HISTORY + 1), snapWithImage],
            redoStack: [],
          },
        },
      };
    }

    case 'DUPLICATE_TAB': {
      const src = state.tabs.find(t => t.id === action.sourceTabId);
      if (!src) return state;
      const newId = action.newTab.id;
      return {
        ...state,
        tabs: [...state.tabs, action.newTab],
        activeTabId: newId,
        stepIndicators: { ...state.stepIndicators, [newId]: [...(state.stepIndicators[action.sourceTabId] || [])] },
        shapes: { ...state.shapes, [newId]: [...(state.shapes[action.sourceTabId] || [])] },
        textAnnotations: { ...state.textAnnotations, [newId]: [...(state.textAnnotations[action.sourceTabId] || [])] },
        drawOrder: { ...state.drawOrder, [newId]: [...(state.drawOrder[action.sourceTabId] || [])] },
        history: { ...state.history, [newId]: { undoStack: [], redoStack: [] } },
        nextStepNumber: { ...state.nextStepNumber, [newId]: state.nextStepNumber[action.sourceTabId] || 1 },
      };
    }

    case 'UNDO': {
      const hist = state.history[action.tabId];
      if (!hist || hist.undoStack.length === 0) return state;
      const tab = state.tabs.find(t => t.id === action.tabId);
      const current = snapshot(state, action.tabId);
      const prev = hist.undoStack[hist.undoStack.length - 1];
      const currentWithImage: AnnotationSnapshot = prev.imageDataURL && tab
        ? { ...current, imageDataURL: tab.imageDataURL, thumbnail: tab.thumbnail }
        : current;
      const newState: State = {
        ...state,
        stepIndicators: { ...state.stepIndicators, [action.tabId]: prev.stepIndicators },
        shapes: { ...state.shapes, [action.tabId]: prev.shapes },
        textAnnotations: { ...state.textAnnotations, [action.tabId]: prev.textAnnotations },
        nextStepNumber: { ...state.nextStepNumber, [action.tabId]: prev.nextStepNumber },
        drawOrder: { ...state.drawOrder, [action.tabId]: prev.drawOrder || [] },
        history: {
          ...state.history,
          [action.tabId]: {
            undoStack: hist.undoStack.slice(0, -1),
            redoStack: [...hist.redoStack, currentWithImage],
          },
        },
      };
      // Restore image if snapshot had one
      if (prev.imageDataURL && tab) {
        newState.tabs = newState.tabs.map(t =>
          t.id === action.tabId ? { ...t, imageDataURL: prev.imageDataURL!, thumbnail: prev.thumbnail || t.thumbnail } : t
        );
      }
      return newState;
    }
    case 'REDO': {
      const hist = state.history[action.tabId];
      if (!hist || hist.redoStack.length === 0) return state;
      const tab = state.tabs.find(t => t.id === action.tabId);
      const current = snapshot(state, action.tabId);
      const next = hist.redoStack[hist.redoStack.length - 1];
      const currentWithImage: AnnotationSnapshot = next.imageDataURL && tab
        ? { ...current, imageDataURL: tab.imageDataURL, thumbnail: tab.thumbnail }
        : current;
      const newState: State = {
        ...state,
        stepIndicators: { ...state.stepIndicators, [action.tabId]: next.stepIndicators },
        shapes: { ...state.shapes, [action.tabId]: next.shapes },
        textAnnotations: { ...state.textAnnotations, [action.tabId]: next.textAnnotations },
        nextStepNumber: { ...state.nextStepNumber, [action.tabId]: next.nextStepNumber },
        drawOrder: { ...state.drawOrder, [action.tabId]: next.drawOrder || [] },
        history: {
          ...state.history,
          [action.tabId]: {
            undoStack: [...hist.undoStack, currentWithImage],
            redoStack: hist.redoStack.slice(0, -1),
          },
        },
      };
      if (next.imageDataURL && tab) {
        newState.tabs = newState.tabs.map(t =>
          t.id === action.tabId ? { ...t, imageDataURL: next.imageDataURL!, thumbnail: next.thumbnail || t.thumbnail } : t
        );
      }
      return newState;
    }

    case 'REORDER_TABS': {
      const tabs = [...state.tabs];
      const [moved] = tabs.splice(action.fromIndex, 1);
      tabs.splice(action.toIndex, 0, moved);
      return { ...state, tabs };
    }

    case 'LOAD_PROJECT': {
      const { project } = action;
      const tabs = project.tabs.map(pt => ({
        id: pt.id, name: pt.name,
        imageDataURL: pt.imageDataURL, thumbnail: pt.thumbnail,
      }));
      const si: Record<string, StepIndicator[]> = {};
      const sh: Record<string, Shape[]> = {};
      const ta: Record<string, TextAnnotation[]> = {};
      const hist: Record<string, TabHistory> = {};
      const ns: Record<string, number> = {};
      const do_: Record<string, string[]> = {};
      for (const pt of project.tabs) {
        si[pt.id] = pt.stepIndicators;
        sh[pt.id] = pt.shapes;
        ta[pt.id] = pt.textAnnotations;
        hist[pt.id] = { undoStack: [], redoStack: [] };
        ns[pt.id] = pt.nextStepNumber;
        // backwards compat: reconstruct drawOrder from type arrays if not stored
        do_[pt.id] = pt.drawOrder || [
          ...pt.shapes.filter(s => s.type === 'blur').map(s => s.id),
          ...pt.shapes.filter(s => s.type !== 'blur').map(s => s.id),
          ...pt.stepIndicators.map(s => s.id),
          ...pt.textAnnotations.map(t => t.id),
        ];
      }
      return {
        ...state,
        tabs, activeTabId: project.activeTabId,
        stepIndicators: si, shapes: sh, textAnnotations: ta,
        drawOrder: do_, history: hist, nextStepNumber: ns,
        selectedId: null, selectedKind: null, tool: 'select',
      };
    }

    case 'BATCH_MOVE': {
      const history = action.skipUndo ? state.history : pushUndo(state, action.tabId);
      const stepsMap = new Map(action.steps.map(s => [s.id, s]));
      const shapesMap = new Map(action.shapes.map(s => [s.id, s]));
      const textsMap = new Map(action.texts.map(t => [t.id, t]));
      const steps = (state.stepIndicators[action.tabId] || []).map(s =>
        stepsMap.has(s.id) ? { ...s, ...stepsMap.get(s.id) } : s
      );
      const shapes = (state.shapes[action.tabId] || []).map(s =>
        shapesMap.has(s.id) ? { ...s, ...shapesMap.get(s.id) } : s
      );
      const texts = (state.textAnnotations[action.tabId] || []).map(t =>
        textsMap.has(t.id) ? { ...t, ...textsMap.get(t.id) } : t
      );
      return {
        ...state, history,
        stepIndicators: { ...state.stepIndicators, [action.tabId]: steps },
        shapes: { ...state.shapes, [action.tabId]: shapes },
        textAnnotations: { ...state.textAnnotations, [action.tabId]: texts },
      };
    }

    case 'REORDER_ANNOTATION': {
      const history = pushUndo(state, action.tabId);
      const arr = state.drawOrder[action.tabId] || [];
      const idx = arr.indexOf(action.annotationId);
      if (idx < 0) return { ...state, history };
      const copy = [...arr];
      const [item] = copy.splice(idx, 1);
      if (action.direction === 'front') copy.push(item);
      else copy.unshift(item);
      return {
        ...state, history,
        drawOrder: { ...state.drawOrder, [action.tabId]: copy },
      };
    }

    default:
      return state;
  }
}

const AppContext = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load settings from disk on startup
  useEffect(() => {
    window.electronAPI.loadSettings().then((saved) => {
      if (saved) {
        dispatch({ type: 'LOAD_SETTINGS', settings: { ...DEFAULT_SETTINGS, ...saved as Partial<AppSettings> } });
      }
    });
  }, []);

  // Save settings to disk whenever they change
  const settingsRef = React.useRef(state.settings);
  useEffect(() => {
    // Skip the initial render (same object ref as default)
    if (settingsRef.current === initialState.settings && state.settings === initialState.settings) {
      settingsRef.current = state.settings;
      return;
    }
    settingsRef.current = state.settings;
    window.electronAPI.saveSettings(state.settings as unknown as Record<string, unknown>);
  }, [state.settings]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}
