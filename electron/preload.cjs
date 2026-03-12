const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopAPI', {
  getRuntimeInfo: () => ipcRenderer.invoke('desktop:get-runtime-info'),
  getLicenseStatus: () => ipcRenderer.invoke('desktop:get-license-status'),
  importLicense: () => ipcRenderer.invoke('desktop:import-license'),
  getOfflinePackageInfo: () => ipcRenderer.invoke('desktop:get-offline-package-info'),
})
