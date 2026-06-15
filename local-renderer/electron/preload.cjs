const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('printMenuRenderer', {
  getStatus: () => ipcRenderer.invoke('renderer:get-status'),
  openUrl: () => ipcRenderer.invoke('renderer:open-url'),
  openHealth: () => ipcRenderer.invoke('renderer:open-health'),
});
