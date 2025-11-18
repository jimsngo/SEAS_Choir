const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runScript: (script) => ipcRenderer.invoke('run-script', script),
  gitPush: () => ipcRenderer.invoke('git-push'),
  getCurrentFiles: () => ipcRenderer.invoke('get-current-files'),
  getCantors: () => ipcRenderer.invoke('get-cantors'),
  getMyData: () => ipcRenderer.invoke('get-mydata'),
  getMyDataJson: () => ipcRenderer.invoke('get-mydata-json'),
  getMomentsListJson: () => ipcRenderer.invoke('get-moments-list-json'),
  selectFile: (filters) => ipcRenderer.invoke('select-file', { filters }),
  setMyData: (mydata) => ipcRenderer.invoke('set-mydata', mydata),
  copyFiles: (moment, files) => ipcRenderer.invoke('copy-files', { moment, files }),
  copyMp3ToMp3s: (mp3Path) => ipcRenderer.invoke('copy-mp3-to-mp3s', { mp3Path }),
  updateMyData: (name, cantor) => ipcRenderer.invoke('update-mydata', { name, cantor }),
  previewHtml: (htmlPath) => ipcRenderer.invoke('preview-html', { htmlPath })
});
