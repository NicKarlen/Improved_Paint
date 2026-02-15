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
  borderColor: string;
  borderWidth: number;
  borderEnabled: boolean;
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
}

export const DEFAULT_SETTINGS: AppSettings = {
  borderColor: '#0ea5e9',
  borderWidth: 4,
  borderEnabled: true,
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
};
