import { useMemo } from 'react'
import bytes from 'bytes'
import { useAppStore } from '../store/useAppStore'
import { DirectoryNode } from '../types'

export default function MarkedList() {
  const { markedPaths, toggleMark, directoryData } = useAppStore()

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
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">Marked for Deletion</h2>
        <div className="text-sm text-gray-600 mt-1">
          {markedDirectories.length} directories • {bytes(totalSize)}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {markedDirectories.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">No directories marked</div>
        ) : (
          <div className="space-y-2">
            {markedDirectories.map((dir) => (
              <div
                key={dir.path}
                className="p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate" title={dir.path}>
                      {dir.path.split(/[/\\]/).pop()}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 truncate" title={dir.path}>
                      {dir.path}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{bytes(dir.size)}</div>
                  </div>
                  <button
                    onClick={() => toggleMark(dir.path)}
                    className="flex-shrink-0 text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

