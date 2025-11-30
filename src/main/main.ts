import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { scanDirectory } from './utils/scanner'
import { deleteDirectories } from './utils/deleter'
import { exportMarkedList } from './utils/exporter'
import { getMarkedPaths, saveMarkedPaths } from './utils/storage'
import { getRecentDirectories, addDirectoryHistory, logAction } from './db/services'

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

ipcMain.handle('scan-directory', async (_, path: string, options: any = {}) => {
  if (!existsSync(path)) {
    throw new Error('Directory does not exist')
  }
  const result = await scanDirectory(path, options)

  // Save to database
  try {
    const pathParts = path.split(/[/\\]/)
    const name = pathParts[pathParts.length - 1] || path
    await addDirectoryHistory(path, name, result.size)
    await logAction('scan', path)
  } catch (error) {
    console.error('Error saving scan to database:', error)
  }

  return result
})

ipcMain.handle('delete-directories', async (_, paths: string[]) => {
  const result = await deleteDirectories(paths)

  // Log delete action
  try {
    await logAction('delete', undefined, { paths, count: paths.length })
  } catch (error) {
    console.error('Error logging delete action:', error)
  }

  return result
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

  const exportResult = await exportMarkedList(result.filePath, data, format)

  // Log export action
  try {
    await logAction('export', result.filePath, { format, count: data.length })
  } catch (error) {
    console.error('Error logging export action:', error)
  }

  return exportResult
})

ipcMain.handle('get-marked-paths', async () => {
  return getMarkedPaths()
})

ipcMain.handle('save-marked-paths', async (_, paths: string[]) => {
  saveMarkedPaths(paths)
})

ipcMain.handle('get-recent-directories', async () => {
  try {
    return await getRecentDirectories(10)
  } catch (error) {
    console.error('Error getting recent directories:', error)
    return []
  }
})

ipcMain.handle('log-action', async (_, type: string, path?: string, metadata?: any) => {
  try {
    await logAction(type as any, path, metadata)
  } catch (error) {
    console.error('Error logging action:', error)
  }
})

