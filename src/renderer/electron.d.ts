import { DirectoryNode } from './types'

export interface ElectronAPI {
  openFolderDialog: () => Promise<string | null>
  scanDirectory: (path: string, options?: { maxDepth?: number }) => Promise<DirectoryNode>
  deleteDirectories: (
    paths: string[]
  ) => Promise<{ success: string[]; failed: Array<{ path: string; error: string }> }>
  exportMarkedList: (
    data: Array<{ path: string; size: number }>,
    format: 'json' | 'csv'
  ) => Promise<void | null>
  getMarkedPaths: () => Promise<string[]>
  saveMarkedPaths: (paths: string[]) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

