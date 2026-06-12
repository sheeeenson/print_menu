import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3020;
const HEALTH_URL = `http://localhost:${PORT}/health`;

let mainWindow = null;
let rendererProcess = null;
let rendererStartedByApp = false;

const getRendererDirectory = () => {
  const packagedPath = path.join(process.resourcesPath || '', 'local-renderer');
  if (app.isPackaged && existsSync(packagedPath)) return packagedPath;
  return path.resolve(__dirname, '..', '..', '..', 'local-renderer');
};

const getNpmCommand = () => (process.platform === 'win32' ? 'npm.cmd' : 'npm');

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

const startRenderer = async () => {
  const existing = await checkHealth();
  if (existing.ok) {
    appendLog('Renderer is already running on localhost:3020. Using existing instance.');
    sendToWindow('renderer-status', { state: 'running', startedByApp: false, ...existing });
    return existing;
  }

  const rendererDir = getRendererDirectory();
  if (!existsSync(path.join(rendererDir, 'server.js'))) {
    const error = `Renderer server.js not found: ${rendererDir}`;
    appendLog(error);
    sendToWindow('renderer-status', { state: 'error', error });
    return { ok: false, error };
  }

  appendLog(`Starting renderer from ${rendererDir}`);
  rendererProcess = spawn(getNpmCommand(), ['start'], {
    cwd: rendererDir,
    shell: false,
    env: {
      ...process.env,
      PORT: String(PORT),
    },
  });
  rendererStartedByApp = true;

  rendererProcess.stdout?.on('data', (chunk) => appendLog(String(chunk).trimEnd()));
  rendererProcess.stderr?.on('data', (chunk) => appendLog(String(chunk).trimEnd()));
  rendererProcess.on('exit', (code, signal) => {
    appendLog(`Renderer process exited. code=${code ?? 'null'} signal=${signal ?? 'null'}`);
    rendererProcess = null;
    rendererStartedByApp = false;
    sendToWindow('renderer-status', { state: 'stopped' });
  });

  sendToWindow('renderer-status', { state: 'starting' });
  const health = await waitForHealth();
  sendToWindow('renderer-status', {
    state: health.ok ? 'running' : 'error',
    startedByApp: true,
    ...health,
  });
  return health;
};

const stopRenderer = () => {
  if (!rendererProcess) {
    appendLog('No renderer process started by this app.');
    return { ok: true };
  }

  appendLog('Stopping renderer...');
  rendererProcess.kill(process.platform === 'win32' ? undefined : 'SIGTERM');
  rendererProcess = null;
  rendererStartedByApp = false;
  sendToWindow('renderer-status', { state: 'stopped' });
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

app.on('before-quit', () => {
  if (rendererStartedByApp && rendererProcess) stopRenderer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
