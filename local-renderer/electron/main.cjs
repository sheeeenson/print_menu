const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { existsSync } = require('node:fs');

const PORT = process.env.PORT || '3020';
const RENDERER_URL = `http://localhost:${PORT}`;
const ROOT_DIR = path.resolve(__dirname, '..');

let mainWindow;
let serverStarted = false;
let serverStartError = '';

function configureRuntimeEnvironment() {
  process.env.PORT = PORT;
  process.env.RENDER_SCALE = process.env.RENDER_SCALE || '1';

  const packagedResources = process.resourcesPath || ROOT_DIR;
  const packagedFfmpeg = process.platform === 'win32'
    ? path.join(packagedResources, 'bin', 'ffmpeg.exe')
    : path.join(packagedResources, 'bin', 'ffmpeg');
  const localFfmpeg = process.platform === 'win32'
    ? path.join(ROOT_DIR, 'bin', 'ffmpeg.exe')
    : path.join(ROOT_DIR, 'bin', 'ffmpeg');

  if (!process.env.FFMPEG_PATH) {
    if (existsSync(packagedFfmpeg)) process.env.FFMPEG_PATH = packagedFfmpeg;
    else if (existsSync(localFfmpeg)) process.env.FFMPEG_PATH = localFfmpeg;
  }

  const packagedBrowsers = path.join(packagedResources, '.playwright');
  const localBrowsers = path.join(ROOT_DIR, '.playwright');
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
    if (existsSync(packagedBrowsers)) process.env.PLAYWRIGHT_BROWSERS_PATH = packagedBrowsers;
    else if (existsSync(localBrowsers)) process.env.PLAYWRIGHT_BROWSERS_PATH = localBrowsers;
  }
}

async function startRendererServer() {
  if (serverStarted || serverStartError) return;
  configureRuntimeEnvironment();
  try {
    const serverPath = path.join(ROOT_DIR, 'server.js');
    await import(pathToFileURL(serverPath).href);
    serverStarted = true;
  } catch (error) {
    serverStartError = error instanceof Error ? error.message : String(error);
    console.error('Could not start Print Menu Renderer server:', error);
  }
}

async function getHealth() {
  try {
    const response = await fetch(`${RENDERER_URL}/health`, { cache: 'no-store' });
    const body = await response.json();
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: {
        error: error instanceof Error ? error.message : String(error),
        serverStartError,
      },
    };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 680,
    height: 520,
    minWidth: 560,
    minHeight: 420,
    title: 'Print Menu Renderer',
    backgroundColor: '#171922',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('renderer:get-status', async () => {
  const health = await getHealth();
  return {
    url: RENDERER_URL,
    serverStarted,
    serverStartError,
    health,
    ffmpegPath: process.env.FFMPEG_PATH || '',
    playwrightBrowsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH || '',
  };
});

ipcMain.handle('renderer:open-url', async () => {
  await shell.openExternal(RENDERER_URL);
  return true;
});

ipcMain.handle('renderer:open-health', async () => {
  await shell.openExternal(`${RENDERER_URL}/health`);
  return true;
});

app.whenReady().then(async () => {
  await startRendererServer();
  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
