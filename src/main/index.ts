import { app, BrowserWindow, ipcMain, dialog, clipboard, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 2000,
    height: 1200,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Dev mode: load from Vite dev server; Prod: load built files
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// ── Settings persistence ──
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

ipcMain.handle('settings:load', () => {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch { /* ignore corrupt file */ }
  return null;
});

ipcMain.handle('settings:save', (_event, settings: Record<string, unknown>) => {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
});

// IPC: Save multiple files to a chosen directory
ipcMain.handle('dialog:save-files', async (_event, files: { name: string; dataURL: string }[]) => {
  if (!mainWindow || files.length === 0) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Choose folder to export all images',
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const dir = result.filePaths[0];
  for (const file of files) {
    const base64 = file.dataURL.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(path.join(dir, file.name), Buffer.from(base64, 'base64'));
  }
  return dir;
});

ipcMain.handle('project:save-to-folder', async (_event, folderPath: string, payload: string, fileName: string) => {
  const ipaintsDir = path.join(folderPath, 'ipaints');
  if (!fs.existsSync(ipaintsDir)) fs.mkdirSync(ipaintsDir);
  const safeName = fileName.replace(/\.[^.]+$/, '').replace(/\s+(nr\s*)?\d+\s*$/i, '').replace(/[<>:"/\\|?*]/g, '_') || 'project';
  fs.writeFileSync(path.join(ipaintsDir, `${safeName}.ipaint`), payload, 'utf-8');
});

ipcMain.handle('project:open', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Project',
    filters: [{ name: 'Improved Paint Project', extensions: ['ipaint'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  try { return fs.readFileSync(result.filePaths[0], 'utf-8'); }
  catch { return null; }
});

ipcMain.handle('project:save', async (_event, payload: string, defaultName: string) => {
  if (!mainWindow) return false;
  const safeName = defaultName.replace(/\.[^.]+$/, '').replace(/\s+(nr\s*)?\d+\s*$/i, '').replace(/[<>:"/\\|?*]/g, '_') || 'project';
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Project',
    defaultPath: `${safeName}.ipaint`,
    filters: [{ name: 'Improved Paint Project', extensions: ['ipaint'] }],
  });
  if (result.canceled || !result.filePath) return false;
  fs.writeFileSync(result.filePath, payload, 'utf-8');
  return true;
});

// IPC: Read clipboard image
ipcMain.handle('clipboard:read-image', () => {
  const img = clipboard.readImage();
  if (img.isEmpty()) return null;
  return img.toDataURL();
});

// IPC: Write image to clipboard
ipcMain.handle('clipboard:write-image', (_event, dataURL: string) => {
  const base64 = dataURL.replace(/^data:image\/\w+;base64,/, '');
  const img = nativeImage.createFromBuffer(Buffer.from(base64, 'base64'));
  clipboard.writeImage(img);
  return true;
});

// IPC: Open file dialog
ipcMain.handle('dialog:open-file', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'webp'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  const dataURL = `data:${mime};base64,${buffer.toString('base64')}`;
  return { dataURL, name: path.basename(filePath) };
});

// IPC: Save file dialog
ipcMain.handle('dialog:save-file', async (_event, dataURL: string, defaultName: string, format?: string) => {
  if (!mainWindow) return false;
  const allFilters = [
    { name: 'PNG', extensions: ['png'] },
    { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
    { name: 'WebP', extensions: ['webp'] },
  ];
  // Put the selected format first so Windows pre-selects it
  const filterOrder = format === 'jpeg' ? [1, 0, 2]
    : format === 'webp' ? [2, 0, 1]
    : [0, 1, 2];
  const filters = filterOrder.map(i => allFilters[i]);
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters,
  });
  if (result.canceled || !result.filePath) return null;
  const base64 = dataURL.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(result.filePath, Buffer.from(base64, 'base64'));
  return result.filePath;
});
