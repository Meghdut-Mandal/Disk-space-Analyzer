import { DirectoryNode } from './types'

export interface ElectronAPI {
  openFolderDialog: () => Promise<string | null>
  scanDirectory: (path: string, options?: { maxDepth?: number; minSize?: number }) => Promise<DirectoryNode>
  deleteDirectories: (
    paths: string[]
  ) => Promise<{ success: string[]; failed: Array<{ path: string; error: string }> }>
  exportMarkedList: (
    data: Array<{ path: string; size: number }>,
    format: 'json' | 'csv'
  ) => Promise<void | null>
  getMarkedPaths: () => Promise<string[]>
  saveMarkedPaths: (paths: string[]) => Promise<void>
  getRecentDirectories: () => Promise<Array<{ path: string; name: string; size: number; lastScanned: string; scanCount: number }>>
  logAction: (type: string, path?: string, metadata?: any) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    _treemapDebugCount?: number
  }
}

