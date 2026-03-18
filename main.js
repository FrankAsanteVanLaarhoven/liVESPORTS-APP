const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'icon.png')
  });

  // Force all external links to open in the user's default native browser (Chrome/Safari)
  // Prevents the horrible bug where the dashboard duplicates itself into a child window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Violently clear the Electron cache before loading so updates are instant
  win.webContents.session.clearCache().then(() => {
     win.webContents.session.clearStorageData().then(() => {
         win.loadFile('index.html');
     });
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
