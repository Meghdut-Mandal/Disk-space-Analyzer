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
    scanStatus: 'idle' | 'scanning' | 'processing'
    selectedFile: string | null
    recentDirectories: Array<{ path: string; name: string; size: number; lastScanned: Date; scanCount: number }>
    activeView: 'treemap' | 'stats' | 'delete'

    // Actions
    setDirectoryData: (data: DirectoryNode | null) => void
    setSelectedPath: (path: string | null) => void
    setViewPath: (path: string | null) => void
    toggleMark: (path: string) => void
    setMarkedPaths: (paths: Set<string>) => void
    setSearchQuery: (query: string) => void
    setSizeFilter: (size: number) => void
    setMaxDepth: (depth: number) => void
    setScanStatus: (status: 'idle' | 'scanning' | 'processing') => void
    setSelectedFile: (path: string | null) => void
    setRecentDirectories: (dirs: Array<{ path: string; name: string; size: number; lastScanned: Date; scanCount: number }>) => void
    setActiveView: (view: 'treemap' | 'stats' | 'delete') => void

    // Async Actions (Thunks equivalent)
    scanDirectory: (path: string) => Promise<void>
    deleteMarked: () => Promise<void>
    exportMarked: () => Promise<void>
    loadRecentDirectories: () => Promise<void>
}

/**
 * Removes deleted paths from the directory tree and recalculates sizes.
 * This is much faster than rescanning the entire directory.
 * 
 * @param node - The current directory node
 * @param deletedPaths - Set of paths that were successfully deleted
 * @returns Updated node with deleted paths removed and sizes recalculated, or null if this node was deleted
 */
function removeDeletedPathsFromTree(
    node: DirectoryNode,
    deletedPaths: Set<string>
): DirectoryNode | null {
    // If this node itself was deleted, return null
    if (deletedPaths.has(node.path)) {
        return null
    }

    // If this is a file (no children), return as-is
    if (!node.isDirectory || node.children.length === 0) {
        return node
    }

    // Recursively process children and filter out deleted ones
    const updatedChildren: DirectoryNode[] = []
    let newSize = 0

    for (const child of node.children) {
        const updatedChild = removeDeletedPathsFromTree(child, deletedPaths)
        if (updatedChild !== null) {
            updatedChildren.push(updatedChild)
            newSize += updatedChild.size
        }
    }

    // Return updated node with new children and recalculated size
    return {
        ...node,
        children: updatedChildren,
        size: node.isDirectory ? newSize : node.size
    }
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
    scanStatus: 'idle',
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
    setScanStatus: (status) => set({ scanStatus: status }),
    setSelectedFile: (path) => set({ selectedFile: path }),
    setRecentDirectories: (dirs) => set({ recentDirectories: dirs }),
    setActiveView: (view) => set({ activeView: view }),

    // Async Actions
    scanDirectory: async (path) => {
        const startTime = Date.now()
        console.log(`[FRONTEND] Starting scan request for: ${path}`)

        const { maxDepth, sizeFilter } = get()
        set({ scanStatus: 'scanning' })
        try {
            const ipcStartTime = Date.now()
            const data = await window.electronAPI.scanDirectory(path, { maxDepth, minSize: sizeFilter })
            console.log(`[FRONTEND] Received scan data in ${Date.now() - ipcStartTime}ms`)
            console.log(`[FRONTEND] Data contains ${data.children?.length || 0} top-level items`)

            set({ scanStatus: 'processing' })
            // Small delay to let UI update and show processing state
            await new Promise(resolve => setTimeout(resolve, 100))

            const setStateStartTime = Date.now()
            set({
                directoryData: data,
                selectedPath: path,
                viewPath: path, // Reset view to root on new scan
                scanStatus: 'idle'
            })
            console.log(`[FRONTEND] State updated in ${Date.now() - setStateStartTime}ms`)

            // Reload recent directories after scan
            const recentStartTime = Date.now()
            await get().loadRecentDirectories()
            console.log(`[FRONTEND] Recent directories loaded in ${Date.now() - recentStartTime}ms`)

            console.log(`[FRONTEND] Total frontend time: ${Date.now() - startTime}ms`)
        } catch (error) {
            console.error('Error scanning directory:', error)
            set({ scanStatus: 'idle' })
            throw error
        }
    },

    deleteMarked: async () => {
        const { markedPaths, selectedPath, directoryData, viewPath } = get()
        const paths = Array.from(markedPaths)
        if (paths.length === 0) return

        try {
            const deleteStartTime = Date.now()
            const result = await window.electronAPI.deleteDirectories(paths)
            console.log(`[FRONTEND] File deletion completed in ${Date.now() - deleteStartTime}ms`)

            if (result.failed.length > 0) {
                alert(`Some deletions failed:\n${result.failed.map((f) => `${f.path}: ${f.error}`).join('\n')}`)
            }

            // Get successfully deleted paths
            const successfullyDeleted = new Set(
                paths.filter(p => !result.failed.some(f => f.path === p))
            )

            set({ activeView: 'treemap', markedPaths: new Set() })

            // Update directory data in memory instead of rescanning
            if (directoryData && successfullyDeleted.size > 0) {
                const updateStartTime = Date.now()
                const updatedData = removeDeletedPathsFromTree(directoryData, successfullyDeleted)
                console.log(`[FRONTEND] Tree updated in memory in ${Date.now() - updateStartTime}ms (no rescan needed!)`)

                // Check if current viewPath was deleted, if so reset to root
                const newViewPath = successfullyDeleted.has(viewPath || '') ? selectedPath : viewPath

                set({
                    directoryData: updatedData,
                    viewPath: newViewPath
                })
            }
        } catch (error) {
            console.error('Error deleting directories:', error)
            alert('Failed to delete directories')
            set({ activeView: 'treemap' })
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
