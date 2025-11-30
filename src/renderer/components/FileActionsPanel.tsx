import { useMemo } from 'react'
import bytes from 'bytes'
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
        setShowDeleteConfirm,
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
                                <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
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
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Marked for Deletion
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
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
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export Marked
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={markedPaths.size === 0}
                                    className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Marked ({markedPaths.size})
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
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                                >
                                    Export List
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                                >
                                    Delete All ({markedDirectories.length})
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
        </div>
    )
}
