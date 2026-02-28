export interface Tab {
  id: string;
  name: string;
  imageDataURL: string;
  thumbnail: string;
}

export interface StepIndicator {
  id: string;
  x: number;
  y: number;
  label: string;
  style: 'decimal' | 'roman';
  color: string;
}

export interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  width: number;  // auto-calculated from text, but stored for hit-testing/resize
  height: number;
}

export type ShapeType = 'rect' | 'arrow' | 'blur';
export type RectMode = 'normal' | 'blackout' | 'whiteout';

export interface Shape {
  id: string;
  type: ShapeType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
  filled: boolean;
  rectMode: RectMode;
  arrowChevrons: boolean;
  blurStrength?: number;
}

export interface AppSettings {
  stepSize: number;
  shapeColor: string;
  shapeStrokeWidth: number;
  shapeFilled: boolean;
  arrowChevrons: boolean;
  rectMode: RectMode;
  exportFormat: 'png' | 'jpeg' | 'webp';
  exportQuality: number;
  companyColors: [string, string, string];
  watermarkDataURL: string | null;
  watermarkSize: number;
  watermarkEnabled: boolean;
  blurStrength: number;
  textFontSize: number;
  canvasFrameEnabled: boolean;
  canvasFrameWidth: number;
  canvasFrameHeight: number;
  canvasFrameBgColor: string;
  beautifyEnabled: boolean;
  beautifyPadding: number;
  beautifyCornerRadius: number;
  beautifyShadow: number;
  beautifyBgType: 'solid' | 'gradient';
  beautifyBgColor1: string;
  beautifyBgColor2: string;
  beautifyGradientAngle: number;
  beautifyOuterRadius: number;
  profiles: [ProfileSettings | null, ProfileSettings | null];
}

export type ProfileSettings = Pick<AppSettings,
  | 'companyColors'
  | 'beautifyEnabled' | 'beautifyBgType' | 'beautifyBgColor1' | 'beautifyBgColor2'
  | 'beautifyGradientAngle' | 'beautifyPadding' | 'beautifyCornerRadius'
  | 'beautifyShadow' | 'beautifyOuterRadius'
  | 'canvasFrameEnabled' | 'canvasFrameWidth' | 'canvasFrameHeight' | 'canvasFrameBgColor'
  | 'watermarkEnabled' | 'watermarkDataURL' | 'watermarkSize'
>;

export const IPAINT_VERSION = 1;

export interface ProjectTab {
  id: string;
  name: string;
  imageDataURL: string;
  thumbnail: string;
  stepIndicators: StepIndicator[];
  shapes: Shape[];
  textAnnotations: TextAnnotation[];
  nextStepNumber: number;
  drawOrder?: string[]; // render order across all annotation types; optional for backwards compat
}

export interface ProjectFile {
  version: number;
  savedAt: string;
  activeTabId: string | null;
  tabs: ProjectTab[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  stepSize: 28,
  shapeColor: '#ef4444',
  shapeStrokeWidth: 3,
  shapeFilled: false,
  arrowChevrons: true,
  rectMode: 'normal' as RectMode,
  exportFormat: 'png',
  exportQuality: 0.92,
  companyColors: ['#0ea5e9', '#ef4444', '#22c55e'],
  watermarkDataURL: null,
  watermarkSize: 24,
  watermarkEnabled: true,
  blurStrength: 8,
  textFontSize: 16,
  canvasFrameEnabled: false,
  canvasFrameWidth: 1200,
  canvasFrameHeight: 800,
  canvasFrameBgColor: '#ffffff',
  beautifyEnabled: false,
  beautifyPadding: 60,
  beautifyCornerRadius: 12,
  beautifyShadow: 30,
  beautifyBgType: 'gradient',
  beautifyBgColor1: '#667eea',
  beautifyBgColor2: '#764ba2',
  beautifyGradientAngle: 135,
  beautifyOuterRadius: 0,
  profiles: [null, null],
};
