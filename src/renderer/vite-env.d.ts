/// <reference types="vite/client" />

interface ElectronAPI {
  readClipboardImage: () => Promise<string | null>;
  writeClipboardImage: (dataURL: string) => Promise<boolean>;
  openFile: () => Promise<{ dataURL: string; name: string } | null>;
  saveFile: (dataURL: string, defaultName: string, format?: string) => Promise<string | null>;
  saveFiles: (files: { name: string; dataURL: string }[]) => Promise<string | null>;
  loadSettings: () => Promise<Record<string, unknown> | null>;
  saveSettings: (settings: Record<string, unknown>) => Promise<void>;
  saveProjectToFolder: (folderPath: string, payload: string, fileName: string) => Promise<void>;
  openProject: () => Promise<string | null>;
  saveProject: (payload: string, defaultName: string) => Promise<boolean>;
  openFolder: (folderPath: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
