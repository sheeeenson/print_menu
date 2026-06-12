import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3020;
const HEALTH_URL = `http://localhost:${PORT}/health`;

let mainWindow = null;
let rendererImportPromise = null;
let rendererStartedByApp = false;

const getRendererDirectory = () => {
  const packagedPath = path.join(process.resourcesPath || '', 'local-renderer');
  if (app.isPackaged && existsSync(packagedPath)) return packagedPath;
  return path.resolve(__dirname, '..', '..', '..', 'local-renderer');
};

const sendToWindow = (channel, payload) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel, payload);
};

const appendLog = (message) => {
  sendToWindow('renderer-log', `${new Date().toLocaleTimeString()} ${message}`);
};

const checkHealth = async () => {
  try {
    const response = await fetch(HEALTH_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const health = await response.json();
    return { ok: true, url: HEALTH_URL, health };
  } catch (error) {
    return { ok: false, url: HEALTH_URL, error: error instanceof Error ? error.message : String(error) };
  }
};

const waitForHealth = async ({ timeoutMs = 30000 } = {}) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await checkHealth();
    if (result.ok) return result;
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  return checkHealth();
};

const startEmbeddedRenderer = async () => {
  if (rendererImportPromise) return rendererImportPromise;

  const rendererDir = getRendererDirectory();
  const serverPath = path.join(rendererDir, 'server.js');
  if (!existsSync(serverPath)) {
    throw new Error(`Renderer server.js not found: ${rendererDir}`);
  }

  process.env.PORT = process.env.PORT || String(PORT);
  process.env.RENDER_SCALE = process.env.RENDER_SCALE || '1';

  appendLog(`Starting embedded renderer from ${rendererDir}`);
  rendererImportPromise = import(pathToFileURL(serverPath).href);
  await rendererImportPromise;
  rendererStartedByApp = true;
  return rendererImportPromise;
};

const startRenderer = async () => {
  const existing = await checkHealth();
  if (existing.ok) {
    appendLog('Renderer is already running on localhost:3020. Using existing instance.');
    sendToWindow('renderer-status', { state: 'running', startedByApp: false, ...existing });
    return existing;
  }

  try {
    sendToWindow('renderer-status', { state: 'starting' });
    await startEmbeddedRenderer();
    const health = await waitForHealth();
    sendToWindow('renderer-status', {
      state: health.ok ? 'running' : 'error',
      startedByApp: true,
      ...health,
    });
    return health;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendLog(message);
    sendToWindow('renderer-status', { state: 'error', error: message });
    return { ok: false, error: message };
  }
};

const stopRenderer = () => {
  if (!rendererStartedByApp) {
    appendLog('No renderer process started by this app.');
    return { ok: true };
  }

  appendLog('Embedded renderer will stop when the app closes.');
  sendToWindow('renderer-status', { state: 'running', startedByApp: true });
  return { ok: true };
};

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 560,
    minWidth: 620,
    minHeight: 460,
    title: 'Print Menu Renderer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await mainWindow.loadFile(path.join(__dirname, 'renderer.html'));
  startRenderer();
};

app.whenReady().then(() => {
  ipcMain.handle('renderer:start', startRenderer);
  ipcMain.handle('renderer:stop', stopRenderer);
  ipcMain.handle('renderer:health', checkHealth);
  ipcMain.handle('renderer:open-url', async (_event, url) => shell.openExternal(url));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
