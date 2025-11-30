import bytes from 'bytes'

interface MarkedDirectory {
  path: string
  size: number
}

interface DeleteConfirmationProps {
  markedDirectories: MarkedDirectory[]
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmation({
  markedDirectories,
  onConfirm,
  onCancel,
}: DeleteConfirmationProps) {
  const totalSize = markedDirectories.reduce((sum, dir) => sum + dir.size, 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Confirm Deletion</h2>
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
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete All
          </button>
        </div>
      </div>
    </div>
  )
}

