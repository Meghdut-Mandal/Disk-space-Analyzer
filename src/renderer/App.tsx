import { useState, useEffect, useCallback, useMemo } from 'react'
import FolderPicker from './components/FolderPicker'
import TreemapView from './components/TreemapView'
import ControlPanel from './components/ControlPanel'
import MarkedList from './components/MarkedList'
import DeleteConfirmation from './components/DeleteConfirmation'
import Breadcrumbs from './components/Breadcrumbs'
import { DirectoryNode } from './types'

function App() {
  const [directoryData, setDirectoryData] = useState<DirectoryNode | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [viewPath, setViewPath] = useState<string | null>(null)
  const [markedPaths, setMarkedPaths] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sizeFilter, setSizeFilter] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Load marked paths from storage on mount
  useEffect(() => {
    const loadMarkedPaths = async () => {
      try {
        const saved = await window.electronAPI.getMarkedPaths()
        setMarkedPaths(new Set(saved))
      } catch (error) {
        console.error('Error loading marked paths:', error)
      }
    }
    loadMarkedPaths()
  }, [])

  // Save marked paths to storage whenever they change (but not on initial mount)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false)
      return
    }
    
    const saveMarkedPaths = async () => {
      try {
        await window.electronAPI.saveMarkedPaths(Array.from(markedPaths))
      } catch (error) {
        console.error('Error saving marked paths:', error)
      }
    }
    saveMarkedPaths()
  }, [markedPaths, isInitialLoad])

  const handleFolderSelect = useCallback(async () => {
    const path = await window.electronAPI.openFolderDialog()
    if (path) {
      console.log('Selected path:', path)
      setSelectedPath(path)
      setViewPath(path)
      setIsLoading(true)
      try {
        const data = await window.electronAPI.scanDirectory(path)
        console.log('Scanned data:', data)
        console.log('Data path:', data.path)
        console.log('Data children count:', data.children.length)
        setDirectoryData(data)
      } catch (error) {
        console.error('Error scanning directory:', error)
        alert('Failed to scan directory')
      } finally {
        setIsLoading(false)
      }
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    if (!selectedPath) return
    
    setIsLoading(true)
    try {
      const data = await window.electronAPI.scanDirectory(selectedPath)
      setDirectoryData(data)
      // Reset view path to root
      setViewPath(selectedPath)
    } catch (error) {
      console.error('Error refreshing directory:', error)
      alert('Failed to refresh directory')
    } finally {
      setIsLoading(false)
    }
  }, [selectedPath])

  const handleSelectFolderToDelete = useCallback(async () => {
    const path = await window.electronAPI.openFolderDialog()
    if (!path) return

    const confirmed = window.confirm(
      `Are you sure you want to delete the folder?\n\n${path}\n\nThis will move it to trash.`
    )
    
    if (!confirmed) return

    try {
      const result = await window.electronAPI.deleteDirectories([path])
      if (result.failed.length > 0) {
        alert(`Deletion failed:\n${result.failed.map((f) => `${f.path}: ${f.error}`).join('\n')}`)
      } else {
        // Refresh directory data if the deleted folder was within the current scan
        if (selectedPath && path.startsWith(selectedPath)) {
          await handleRefresh()
        }
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert('Failed to delete folder')
    }
  }, [selectedPath, handleRefresh])

  const toggleMark = useCallback((path: string) => {
    setMarkedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const getMarkedDirectories = useCallback((): Array<{ path: string; size: number }> => {
    if (!directoryData) return []

    const result: Array<{ path: string; size: number }> = []
    const collect = (node: DirectoryNode): void => {
      if (markedPaths.has(node.path)) {
        result.push({ path: node.path, size: node.size })
      }
      node.children.forEach(collect)
    }
    collect(directoryData)
    return result
  }, [directoryData, markedPaths])

  const handleDelete = useCallback(async () => {
    const paths = Array.from(markedPaths)
    if (paths.length === 0) return

    try {
      const result = await window.electronAPI.deleteDirectories(paths)
      if (result.failed.length > 0) {
        alert(`Some deletions failed:\n${result.failed.map((f) => `${f.path}: ${f.error}`).join('\n')}`)
      }
      setMarkedPaths(new Set())
      // Refresh directory data
      if (selectedPath) {
        setIsLoading(true)
        try {
          const data = await window.electronAPI.scanDirectory(selectedPath)
          setDirectoryData(data)
          // Reset view path to root if current view was deleted
          setViewPath(selectedPath)
        } finally {
          setIsLoading(false)
        }
      }
    } catch (error) {
      console.error('Error deleting directories:', error)
      alert('Failed to delete directories')
    }
    setShowDeleteConfirm(false)
  }, [markedPaths, selectedPath])

  const handleExport = useCallback(async () => {
    if (markedPaths.size === 0) {
      alert('No directories marked for export')
      return
    }

    if (!directoryData) return

    const markedData = getMarkedDirectories()

    try {
      const result = await window.electronAPI.exportMarkedList(markedData, 'json')
      if (result === null) {
        // User cancelled the export dialog
        return
      }
    } catch (error) {
      console.error('Error exporting:', error)
      alert('Failed to export list')
    }
  }, [markedPaths, directoryData, getMarkedDirectories])

  // Find the node corresponding to the current viewPath
  const currentViewNode = useMemo(() => {
    if (!directoryData || !viewPath) return null

    // Helper to find node by path
    const findNode = (node: DirectoryNode, targetPath: string): DirectoryNode | null => {
      // Normalize paths for comparison
      const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '') // Remove trailing slashes
      if (normalize(node.path) === normalize(targetPath)) return node

      for (const child of node.children) {
        const found = findNode(child, targetPath)
        if (found) return found
      }
      return null
    }

    const result = findNode(directoryData, viewPath)
    
    // Debug logging
    console.log('Finding node for viewPath:', viewPath)
    console.log('directoryData path:', directoryData.path)
    console.log('Result found:', !!result)
    if (result) {
      console.log('Result:', result)
    } else {
      console.log('Could not find node!')
      console.log('Normalized viewPath:', viewPath.replace(/\\/g, '/').replace(/\/+$/, ''))
      console.log('Normalized directoryData path:', directoryData.path.replace(/\\/g, '/').replace(/\/+$/, ''))
    }
    
    return result
  }, [directoryData, viewPath])

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-900">
      {/* Draggable Title Bar */}
      <div className="flex-shrink-0 bg-gradient-to-r from-gray-800 to-gray-700 text-white px-4 py-2 flex items-center justify-between" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="flex items-center gap-2 pl-16">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="font-semibold text-sm">Size Manager</span>
        </div>
        <div className="text-xs text-gray-300">
          {selectedPath && <span className="truncate max-w-md">{selectedPath}</span>}
        </div>
      </div>
      
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4 shadow-sm z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderPicker onSelect={handleFolderSelect} selectedPath={selectedPath} />
            {selectedPath && (
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
                title="Refresh current directory"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectFolderToDelete}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
            >
              Select Folder to Delete
            </button>
            <button
              onClick={handleExport}
              disabled={markedPaths.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Export Marked
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={markedPaths.size === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Delete All Marked ({markedPaths.size})
            </button>
          </div>
        </div>
        <ControlPanel
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sizeFilter={sizeFilter}
          onSizeFilterChange={setSizeFilter}
        />
        {selectedPath && viewPath && (
          <div className="mt-2">
            <Breadcrumbs path={viewPath} rootPath={selectedPath} onNavigate={setViewPath} />
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-4 bg-gray-50 flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-gray-500 animate-pulse">Scanning directory...</div>
            </div>
          ) : currentViewNode ? (
            <div className="flex-1 min-h-0">
              <TreemapView
                data={currentViewNode}
                markedPaths={markedPaths}
                onToggleMark={toggleMark}
                onDrillDown={setViewPath}
                searchQuery={searchQuery}
                sizeFilter={sizeFilter}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1 text-gray-400">
              Select a folder to begin analyzing
            </div>
          )}
        </div>

        <div className="w-80 bg-white border-l border-gray-200 overflow-auto shadow-lg z-20">
          <MarkedList markedDirectories={getMarkedDirectories()} onRemove={toggleMark} />
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteConfirmation
          markedDirectories={getMarkedDirectories()}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}

export default App

