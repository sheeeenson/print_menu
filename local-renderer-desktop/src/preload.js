import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('printMenuRenderer', {
  start: () => ipcRenderer.invoke('renderer:start'),
  stop: () => ipcRenderer.invoke('renderer:stop'),
  health: () => ipcRenderer.invoke('renderer:health'),
  openUrl: (url) => ipcRenderer.invoke('renderer:open-url', url),
  onStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('renderer-status', listener);
    return () => ipcRenderer.removeListener('renderer-status', listener);
  },
  onLog: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('renderer-log', listener);
    return () => ipcRenderer.removeListener('renderer-log', listener);
  },
});
