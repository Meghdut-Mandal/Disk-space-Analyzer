interface FolderPickerProps {
  onSelect: () => void
  selectedPath: string | null
}

export default function FolderPicker({ onSelect, selectedPath }: FolderPickerProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onSelect}
        className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
      >
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

