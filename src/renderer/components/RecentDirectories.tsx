import bytes from 'bytes'
import { useAppStore } from '../store/useAppStore'

export default function RecentDirectories() {
    const { recentDirectories, scanDirectory, isLoading } = useAppStore()

    const handleSelectRecent = async (path: string) => {
        try {
            await scanDirectory(path)
        } catch (error) {
            console.error('Failed to load recent directory:', error)
            alert(`Failed to load directory: ${path}\nIt may have been moved or deleted.`)
        }
    }

    const formatDate = (date: Date) => {
        const d = new Date(date)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return d.toLocaleDateString()
    }

    if (recentDirectories.length === 0) {
        return (
            <div className="text-center text-gray-400 py-8">
                <p>No recent directories</p>
                <p className="text-sm mt-2">Select a folder to get started</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Directories</h3>
            {recentDirectories.map((dir) => (
                <button
                    key={dir.path}
                    onClick={() => handleSelectRecent(dir.path)}
                    disabled={isLoading}
                    className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <div className="font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                                    {dir.name}
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1 truncate" title={dir.path}>
                                {dir.path}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                                <span className="font-medium">{bytes(dir.size)}</span>
                                <span>•</span>
                                <span>{formatDate(dir.lastScanned)}</span>
                                {dir.scanCount > 1 && (
                                    <>
                                        <span>•</span>
                                        <span>{dir.scanCount} scans</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </button>
            ))}
        </div>
    )
}
