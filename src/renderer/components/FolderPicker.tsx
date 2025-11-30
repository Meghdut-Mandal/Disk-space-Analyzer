import { FolderOpen } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function FolderPicker() {
  const { selectedPath, scanDirectory } = useAppStore()

  const handleSelect = async () => {
    const path = await window.electronAPI.openFolderDialog()
    if (path) {
      scanDirectory(path)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleSelect}
        className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2"
      >
        <FolderOpen className="w-4 h-4" />
        Select Folder
      </button>
      {selectedPath && (
        <div className="text-sm text-gray-600 truncate max-w-md" title={selectedPath}>
          {selectedPath}
        </div>
      )}
    </div>
  )
}

