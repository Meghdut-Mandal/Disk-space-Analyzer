import { useEffect, useState } from 'react'
import FolderPicker from './components/FolderPicker'
import TreemapView from './components/TreemapView'
import ControlPanel from './components/ControlPanel'
import FileActionsPanel from './components/FileActionsPanel'
import DeleteConfirmation from './components/DeleteConfirmation'
import Breadcrumbs from './components/Breadcrumbs'
import RecentDirectories from './components/RecentDirectories'
import { useAppStore } from './store/useAppStore'

function App() {
  const {
    directoryData,
    selectedPath,
    viewPath,
    markedPaths,
    isLoading,
    showDeleteConfirm,
    setMarkedPaths,
    scanDirectory,
    setShowDeleteConfirm,
    exportMarked,
    loadRecentDirectories
  } = useAppStore()

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

    // Load recent directories
    loadRecentDirectories()
  }, [setMarkedPaths, loadRecentDirectories])

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

  const handleRefresh = async () => {
    if (selectedPath) {
      await scanDirectory(selectedPath)
    }
  }

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
            <FolderPicker />
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
        </div>
        <ControlPanel />
        {selectedPath && viewPath && (
          <div className="mt-2">
            <Breadcrumbs />
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-4 bg-gray-50 flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-gray-500 animate-pulse">Scanning directory...</div>
            </div>
          ) : directoryData ? (
            <div className="flex-1 min-h-0">
              <TreemapView />
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1">
              <div className="max-w-2xl w-full">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-700 mb-2">Welcome to Size Manager</h2>
                  <p className="text-gray-500">Select a folder to analyze disk usage</p>
                </div>
                <RecentDirectories />
              </div>
            </div>
          )}
        </div>

        <div className="w-80 bg-white border-l border-gray-200 overflow-auto shadow-lg z-20">
          <FileActionsPanel />
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteConfirmation />
      )}
    </div>
  )
}

export default App

