import { useMemo } from 'react'
import bytes from 'bytes'
import { Folder, Check, Plus, Download, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { DirectoryNode } from '../types'
import RecentDirectories from './RecentDirectories'

export default function FileActionsPanel() {
    const {
        selectedFile,
        markedPaths,
        directoryData,
        toggleMark,
        exportMarked,
        setActiveView,
        recentDirectories
    } = useAppStore()

    // Get marked directories with their metadata
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

    const totalMarkedSize = markedDirectories.reduce((sum, dir) => sum + dir.size, 0)

    // Find selected file details
    const selectedFileDetails = useMemo(() => {
        if (!selectedFile || !directoryData) return null

        const findNode = (node: DirectoryNode, targetPath: string): DirectoryNode | null => {
            if (node.path === targetPath) return node
            for (const child of node.children) {
                const found = findNode(child, targetPath)
                if (found) return found
            }
            return null
        }

        return findNode(directoryData, selectedFile)
    }, [selectedFile, directoryData])

    const isSelectedMarked = selectedFile ? markedPaths.has(selectedFile) : false

    // Show file details when a file is selected
    if (selectedFile && selectedFileDetails) {
        return (
            <div className="h-full flex flex-col bg-white">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">File Details</h2>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    <div className="space-y-4">
                        {/* File Info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <Folder className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-800 break-words">
                                        {selectedFileDetails.name}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1 break-all font-mono">
                                        {selectedFileDetails.path}
                                    </div>
                                    <div className="text-sm text-blue-700 font-bold mt-2">
                                        {bytes(selectedFileDetails.size)}
                                    </div>
                                    {selectedFileDetails.children.length > 0 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            {selectedFileDetails.children.length} items
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Mark/Unmark Button */}
                        <button
                            onClick={() => toggleMark(selectedFile)}
                            className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${isSelectedMarked
                                ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400 hover:bg-yellow-200'
                                : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200'
                                }`}
                        >
                            {isSelectedMarked ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Check className="w-5 h-5" />
                                    Marked for Deletion
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <Plus className="w-5 h-5" />
                                    Mark for Deletion
                                </div>
                            )}
                        </button>

                        {/* Action Buttons - Only show if file is marked */}
                        {isSelectedMarked && (
                            <div className="space-y-2 pt-2 border-t border-gray-200">
                                <button
                                    onClick={exportMarked}
                                    disabled={markedPaths.size === 0}
                                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    <Download className="w-5 h-5" />
                                    Export Marked
                                </button>
                                <button
                                    onClick={() => setActiveView('delete')}
                                    disabled={markedPaths.size === 0}
                                    className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    Review & Delete ({markedPaths.size})
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Default view: Show recent directories and marked items summary
    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800">Quick Access</h2>
            </div>

            <div className="flex-1 overflow-auto p-4">
                {/* Recent Directories */}
                {recentDirectories.length > 0 && (
                    <div className="mb-6">
                        <RecentDirectories />
                    </div>
                )}

                {/* Marked Items Summary */}
                {markedDirectories.length > 0 && (
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Marked for Deletion</h3>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="text-sm text-gray-700 mb-2">
                                {markedDirectories.length} {markedDirectories.length === 1 ? 'directory' : 'directories'}
                            </div>
                            <div className="text-lg font-bold text-red-700 mb-4">
                                {bytes(totalMarkedSize)}
                            </div>
                            <div className="space-y-2">
                                <button
                                    onClick={exportMarked}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Export List
                                </button>
                            </div>
                        </div>

                        {/* Marked Items List */}
                        <div className="mt-4 space-y-2 max-h-64 overflow-auto">
                            {markedDirectories.map((dir) => (
                                <div
                                    key={dir.path}
                                    className="p-2 bg-red-50 border border-red-100 rounded text-xs"
                                >
                                    <div className="font-medium text-gray-800 truncate" title={dir.path}>
                                        {dir.path.split(/[/\\]/).pop()}
                                    </div>
                                    <div className="text-gray-600">{bytes(dir.size)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {recentDirectories.length === 0 && markedDirectories.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                        <p>No recent activity</p>
                        <p className="text-sm mt-2">Select a folder to get started</p>
                    </div>
                )}
            </div>

            {/* Persistent Footer Action */}
            {markedDirectories.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={() => setActiveView('delete')}
                        className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm transition-all font-bold text-sm flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-5 h-5" />
                        Review & Delete ({markedDirectories.length})
                    </button>
                </div>
            )}
        </div>
    )
}
