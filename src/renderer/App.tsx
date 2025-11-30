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

  // Save marked paths to storage whenever they change
  useEffect(() => {
    const saveMarkedPaths = async () => {
      try {
        await window.electronAPI.saveMarkedPaths(Array.from(markedPaths))
      } catch (error) {
        console.error('Error saving marked paths:', error)
      }
    }
    saveMarkedPaths()
  }, [markedPaths])

  const handleFolderSelect = useCallback(async () => {
    const path = await window.electronAPI.openFolderDialog()
    if (path) {
      setSelectedPath(path)
      setViewPath(path)
      setIsLoading(true)
      try {
        const data = await window.electronAPI.scanDirectory(path)
        setDirectoryData(data)
      } catch (error) {
        console.error('Error scanning directory:', error)
        alert('Failed to scan directory')
      } finally {
        setIsLoading(false)
      }
    }
  }, [])

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

    // Collect marked directory data
    const collectMarked = (node: DirectoryNode, result: Array<{ path: string; size: number }> = []): void => {
      if (markedPaths.has(node.path)) {
        result.push({ path: node.path, size: node.size })
      }
      node.children.forEach((child) => collectMarked(child, result))
    }

    const markedData: Array<{ path: string; size: number }> = []
    collectMarked(directoryData, markedData)

    try {
      await window.electronAPI.exportMarkedList(markedData, 'json')
    } catch (error) {
      console.error('Error exporting:', error)
      alert('Failed to export list')
    }
  }, [markedPaths, directoryData])

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

  // Find the node corresponding to the current viewPath
  const currentViewNode = useMemo(() => {
    if (!directoryData || !viewPath) return null

    // Helper to find node by path
    const findNode = (node: DirectoryNode, targetPath: string): DirectoryNode | null => {
      // Normalize paths for comparison
      const normalize = (p: string) => p.replace(/\\/g, '/')
      if (normalize(node.path) === normalize(targetPath)) return node

      for (const child of node.children) {
        const found = findNode(child, targetPath)
        if (found) return found
      }
      return null
    }

    return findNode(directoryData, viewPath)
  }, [directoryData, viewPath])

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-900">
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4 shadow-sm z-10">
        <div className="flex items-center justify-between mb-4">
          <FolderPicker onSelect={handleFolderSelect} selectedPath={selectedPath} />
          <div className="flex gap-2">
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
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 animate-pulse">Scanning directory...</div>
            </div>
          ) : currentViewNode ? (
            <TreemapView
              data={currentViewNode}
              markedPaths={markedPaths}
              onToggleMark={toggleMark}
              onDrillDown={setViewPath}
              searchQuery={searchQuery}
              sizeFilter={sizeFilter}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
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

