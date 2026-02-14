/// <reference types="vite/client" />

interface ElectronAPI {
  readClipboardImage: () => Promise<string | null>;
  writeClipboardImage: (dataURL: string) => Promise<boolean>;
  openFile: () => Promise<{ dataURL: string; name: string } | null>;
  saveFile: (dataURL: string, defaultName: string, format?: string) => Promise<boolean>;
  saveFiles: (files: { name: string; dataURL: string }[]) => Promise<boolean>;
  loadSettings: () => Promise<Record<string, unknown> | null>;
  saveSettings: (settings: Record<string, unknown>) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
