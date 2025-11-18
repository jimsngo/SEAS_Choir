const { app, BrowserWindow } = require('electron');
const path = require('path');

function createPreviewWindow(htmlPath) {
  const previewWin = new BrowserWindow({
    width: 900,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  previewWin.loadFile(htmlPath);
}

module.exports = { createPreviewWindow };
