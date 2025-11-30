import { useMemo } from 'react'
import bytes from 'bytes'
import { Trash2, ArrowLeft, X, AlertTriangle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { DirectoryNode } from '../types'

export default function DeletePage() {
    const { markedPaths, directoryData, deleteMarked, setActiveView, toggleMark } = useAppStore()

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

    if (markedDirectories.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p className="text-lg mb-4">No files marked for deletion</p>
                <button
                    onClick={() => setActiveView('treemap')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Treemap
                </button>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setActiveView('treemap')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                        title="Back to Treemap"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-600" />
                            Review Deletion
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Review items before permanently deleting them
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right mr-4">
                        <div className="text-sm text-gray-500">Total Size to Free</div>
                        <div className="text-xl font-bold text-red-600">{bytes(totalSize)}</div>
                    </div>
                    <button
                        onClick={deleteMarked}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm transition-all flex items-center gap-2 font-semibold"
                    >
                        <Trash2 className="w-5 h-5" />
                        Delete All ({markedDirectories.length})
                    </button>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 flex items-center gap-3 text-yellow-800 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <p>Warning: These files will be moved to the trash. This action can usually be undone, but please review carefully.</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-8">Path</div>
                        <div className="col-span-3 text-right">Size</div>
                        <div className="col-span-1 text-center">Action</div>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {markedDirectories.map((dir) => (
                            <div key={dir.path} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 transition-colors group">
                                <div className="col-span-8 font-mono text-sm text-gray-700 truncate" title={dir.path}>
                                    {dir.path}
                                </div>
                                <div className="col-span-3 text-right text-sm font-medium text-gray-900">
                                    {bytes(dir.size)}
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    <button
                                        onClick={() => toggleMark(dir.path)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remove from list"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
