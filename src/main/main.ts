import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { scanDirectory } from './utils/scanner'
import { deleteDirectories } from './utils/deleter'
import { exportMarkedList } from './utils/exporter'
import { getMarkedPaths, saveMarkedPaths } from './utils/storage'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 10, y: 10 },
  })

  // In development, use the Vite dev server URL
  // In production, load the built HTML file
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || (isDev ? 'http://localhost:5173' : null)

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers
ipcMain.handle('open-folder-dialog', async () => {
  if (!mainWindow) {
    throw new Error('Main window not available')
  }
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })

  if (result.canceled) {
    return null
  }

  return result.filePaths[0]
})

ipcMain.handle('scan-directory', async (_, path: string) => {
  if (!existsSync(path)) {
    throw new Error('Directory does not exist')
  }
  return await scanDirectory(path)
})

ipcMain.handle('delete-directories', async (_, paths: string[]) => {
  return await deleteDirectories(paths)
})

ipcMain.handle('export-marked-list', async (_, data: Array<{ path: string; size: number }>, format: 'json' | 'csv') => {
  if (!mainWindow) {
    throw new Error('Main window not available')
  }
  
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `marked-directories.${format}`,
    filters: [
      { name: format === 'json' ? 'JSON' : 'CSV', extensions: [format] },
    ],
  })

  if (result.canceled || !result.filePath) {
    return null
  }

  return await exportMarkedList(result.filePath, data, format)
})

ipcMain.handle('get-marked-paths', async () => {
  return getMarkedPaths()
})

ipcMain.handle('save-marked-paths', async (_, paths: string[]) => {
  saveMarkedPaths(paths)
})

