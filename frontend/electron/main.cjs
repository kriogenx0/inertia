const { app, BrowserWindow } = require('electron')
const path = require('path')

// Kept alongside main.cjs (rather than referencing src/assets/logo.png)
// so it's present both in dev (running from the repo) and in the packaged
// app (package.json only bundles dist/**/* and electron/**/*).
const iconPath = path.join(__dirname, 'icon.png')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hiddenInset',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (process.env.ELECTRON_DEV_SERVER_URL) {
    win.loadURL(process.env.ELECTRON_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.webContents.openDevTools()
}

app.whenReady().then(() => {
  // BrowserWindow's `icon` option isn't used for the Dock icon on macOS in
  // dev mode (only the packaged app's .icns is) — app.dock.setIcon covers it.
  if (process.platform === 'darwin') {
    app.dock.setIcon(iconPath)
  }

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
