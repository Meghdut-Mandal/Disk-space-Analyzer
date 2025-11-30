import { create } from 'zustand'
import { DirectoryNode } from '../types'

interface AppState {
    // State
    directoryData: DirectoryNode | null
    selectedPath: string | null
    viewPath: string | null
    markedPaths: Set<string>
    searchQuery: string
    sizeFilter: number
    maxDepth: number
    isLoading: boolean
    showDeleteConfirm: boolean
    selectedFile: string | null
    recentDirectories: Array<{ path: string; name: string; size: number; lastScanned: Date; scanCount: number }>
    activeView: 'treemap' | 'stats'

    // Actions
    setDirectoryData: (data: DirectoryNode | null) => void
    setSelectedPath: (path: string | null) => void
    setViewPath: (path: string | null) => void
    toggleMark: (path: string) => void
    setMarkedPaths: (paths: Set<string>) => void
    setSearchQuery: (query: string) => void
    setSizeFilter: (size: number) => void
    setMaxDepth: (depth: number) => void
    setIsLoading: (loading: boolean) => void
    setShowDeleteConfirm: (show: boolean) => void
    setSelectedFile: (path: string | null) => void
    setRecentDirectories: (dirs: Array<{ path: string; name: string; size: number; lastScanned: Date; scanCount: number }>) => void
    setActiveView: (view: 'treemap' | 'stats') => void

    // Async Actions (Thunks equivalent)
    scanDirectory: (path: string) => Promise<void>
    deleteMarked: () => Promise<void>
    exportMarked: () => Promise<void>
    loadRecentDirectories: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
    // Initial State
    directoryData: null,
    selectedPath: null,
    viewPath: null,
    markedPaths: new Set(),
    searchQuery: '',
    sizeFilter: 50 * 1024 * 1024,
    maxDepth: 10,
    isLoading: false,
    showDeleteConfirm: false,
    selectedFile: null,
    recentDirectories: [],
    activeView: 'treemap',

    // Actions
    setDirectoryData: (data) => set({ directoryData: data }),
    setSelectedPath: (path) => set({ selectedPath: path }),
    setViewPath: (path) => set({ viewPath: path }),

    toggleMark: (path) => set((state) => {
        const next = new Set(state.markedPaths)
        if (next.has(path)) {
            next.delete(path)
        } else {
            next.add(path)
        }
        return { markedPaths: next }
    }),

    setMarkedPaths: (paths) => set({ markedPaths: paths }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setSizeFilter: (size) => set({ sizeFilter: size }),
    setMaxDepth: (depth) => set({ maxDepth: depth }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setShowDeleteConfirm: (show) => set({ showDeleteConfirm: show }),
    setSelectedFile: (path) => set({ selectedFile: path }),
    setRecentDirectories: (dirs) => set({ recentDirectories: dirs }),
    setActiveView: (view) => set({ activeView: view }),

    // Async Actions
    scanDirectory: async (path) => {
        const startTime = Date.now()
        console.log(`[FRONTEND] Starting scan request for: ${path}`)

        const { maxDepth, sizeFilter } = get()
        set({ isLoading: true })
        try {
            const ipcStartTime = Date.now()
            const data = await window.electronAPI.scanDirectory(path, { maxDepth, minSize: sizeFilter })
            console.log(`[FRONTEND] Received scan data in ${Date.now() - ipcStartTime}ms`)
            console.log(`[FRONTEND] Data contains ${data.children?.length || 0} top-level items`)

            const setStateStartTime = Date.now()
            set({
                directoryData: data,
                selectedPath: path,
                viewPath: path, // Reset view to root on new scan
                isLoading: false
            })
            console.log(`[FRONTEND] State updated in ${Date.now() - setStateStartTime}ms`)

            // Reload recent directories after scan
            const recentStartTime = Date.now()
            await get().loadRecentDirectories()
            console.log(`[FRONTEND] Recent directories loaded in ${Date.now() - recentStartTime}ms`)

            console.log(`[FRONTEND] Total frontend time: ${Date.now() - startTime}ms`)
        } catch (error) {
            console.error('Error scanning directory:', error)
            set({ isLoading: false })
            throw error
        }
    },

    deleteMarked: async () => {
        const { markedPaths, selectedPath, maxDepth } = get()
        const paths = Array.from(markedPaths)
        if (paths.length === 0) return

        try {
            const result = await window.electronAPI.deleteDirectories(paths)
            if (result.failed.length > 0) {
                alert(`Some deletions failed:\n${result.failed.map((f) => `${f.path}: ${f.error}`).join('\n')}`)
            }

            set({ showDeleteConfirm: false, markedPaths: new Set() })

            // Refresh directory data if we have a selected path
            if (selectedPath) {
                set({ isLoading: true })
                try {
                    const data = await window.electronAPI.scanDirectory(selectedPath, { maxDepth })
                    set({
                        directoryData: data,
                        // Reset view path to root if current view was deleted or just to be safe
                        viewPath: selectedPath,
                        isLoading: false
                    })
                } catch (error) {
                    console.error('Error refreshing directory:', error)
                    set({ isLoading: false })
                }
            }
        } catch (error) {
            console.error('Error deleting directories:', error)
            alert('Failed to delete directories')
            set({ showDeleteConfirm: false })
        }
    },

    exportMarked: async () => {
        const { markedPaths, directoryData } = get()
        if (markedPaths.size === 0) {
            alert('No directories marked for export')
            return
        }
        if (!directoryData) return

        const getMarkedDirectories = (): Array<{ path: string; size: number }> => {
            const result: Array<{ path: string; size: number }> = []
            const collect = (node: DirectoryNode): void => {
                if (markedPaths.has(node.path)) {
                    result.push({ path: node.path, size: node.size })
                }
                node.children.forEach(collect)
            }
            collect(directoryData)
            return result
        }

        const markedData = getMarkedDirectories()

        try {
            await window.electronAPI.exportMarkedList(markedData, 'json')
        } catch (error) {
            console.error('Error exporting:', error)
            alert('Failed to export list')
        }
    },

    loadRecentDirectories: async () => {
        try {
            const dirs = await window.electronAPI.getRecentDirectories()
            // Convert lastScanned from ISO string to Date object
            const dirsWithDates = dirs.map(dir => ({
                ...dir,
                lastScanned: new Date(dir.lastScanned)
            }))
            set({ recentDirectories: dirsWithDates })
        } catch (error) {
            console.error('Error loading recent directories:', error)
        }
    }
}))
