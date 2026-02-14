import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  readClipboardImage: () => ipcRenderer.invoke('clipboard:read-image'),
  writeClipboardImage: (dataURL: string) => ipcRenderer.invoke('clipboard:write-image', dataURL),
  openFile: () => ipcRenderer.invoke('dialog:open-file'),
  saveFile: (dataURL: string, defaultName: string, format?: string) =>
    ipcRenderer.invoke('dialog:save-file', dataURL, defaultName, format),
  saveFiles: (files: { name: string; dataURL: string }[]) =>
    ipcRenderer.invoke('dialog:save-files', files),
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:save', settings),
});
