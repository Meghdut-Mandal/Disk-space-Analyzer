import { contextBridge, ipcRenderer } from 'electron'

export interface DirectoryNode {
  name: string
  path: string
  size: number
  children: DirectoryNode[]
  isDirectory: boolean
}

contextBridge.exposeInMainWorld('electronAPI', {
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  scanDirectory: (path: string, options?: { maxDepth?: number }) => ipcRenderer.invoke('scan-directory', path, options),
  deleteDirectories: (paths: string[]) => ipcRenderer.invoke('delete-directories', paths),
  exportMarkedList: (data: Array<{ path: string; size: number }>, format: 'json' | 'csv') =>
    ipcRenderer.invoke('export-marked-list', data, format),
  getMarkedPaths: () => ipcRenderer.invoke('get-marked-paths'),
  saveMarkedPaths: (paths: string[]) => ipcRenderer.invoke('save-marked-paths', paths),
  getRecentDirectories: () => ipcRenderer.invoke('get-recent-directories'),
  logAction: (type: string, path?: string, metadata?: any) => ipcRenderer.invoke('log-action', type, path, metadata),
})

