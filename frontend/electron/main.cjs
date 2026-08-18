const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

// Electron's built-in default macOS menu (used automatically whenever
// Menu.setApplicationMenu is never called) binds Cmd+W to a native
// "Close Window" accelerator via the Window menu's `role: 'close'` item.
// That fires at the native menu layer, not through the page's DOM, so a
// renderer-side keydown handler's preventDefault() can't stop it — Cmd+W
// closes the whole window regardless. This template is Electron's own
// documented "reconstruct the mac default" example, minus that one Close
// item, so Cmd+W is left free for the renderer to use for closing the
// active tab instead, while Cmd+C/V/X/Z/A, Cmd+Q, Cmd+M, etc. still work.
function buildAppMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ]
  return Menu.buildFromTemplate(template)
}

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
    Menu.setApplicationMenu(buildAppMenu())
  }

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
