import { useMemo } from 'react'
import bytes from 'bytes'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { DirectoryNode } from '../types'

export default function DeleteConfirmation() {
  const { markedPaths, directoryData, deleteMarked, setShowDeleteConfirm } = useAppStore()

  const markedDirectories = useMemo(() => {
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

  const totalSize = markedDirectories.reduce((sum, dir) => sum + dir.size, 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-800">Confirm Deletion</h2>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            You are about to delete {markedDirectories.length} directories ({bytes(totalSize)}).
            They will be moved to trash.
          </p>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-2">
            {markedDirectories.slice(0, 20).map((dir) => (
              <div key={dir.path} className="text-sm text-gray-700 truncate" title={dir.path}>
                {dir.path}
              </div>
            ))}
            {markedDirectories.length > 20 && (
              <div className="text-sm text-gray-500">
                ... and {markedDirectories.length - 20} more
              </div>
            )}
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={deleteMarked}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete All
          </button>
        </div>
      </div>
    </div>
  )
}

