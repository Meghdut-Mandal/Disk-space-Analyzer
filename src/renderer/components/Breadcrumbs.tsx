import React from 'react'
import { ChevronRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function Breadcrumbs() {
    const { viewPath, setViewPath, selectedPath } = useAppStore()

    if (!viewPath || !selectedPath) return null

    // Normalize paths to handle different separators
    const normalize = (p: string) => p.replace(/\\/g, '/')
    const normalizedPath = normalize(viewPath)
    const normalizedRoot = normalize(selectedPath)

    if (!normalizedPath.startsWith(normalizedRoot)) {
        return null
    }

    const relativePath = normalizedPath.slice(normalizedRoot.length)
    const parts = relativePath.split('/').filter(Boolean)

    // Determine the path separator from the original path
    const separator = viewPath.includes('\\') ? '\\' : '/'

    const items = [
        { name: selectedPath.split(/[/\\]/).pop() || selectedPath, path: selectedPath },
        ...parts.map((part, index) => {
            // Reconstruct path using original separator
            const pathParts = parts.slice(0, index + 1)
            const currentPath = selectedPath + separator + pathParts.join(separator)
            return { name: part, path: currentPath }
        }),
    ]

    return (
        <nav className="flex items-center text-sm text-gray-600 overflow-x-auto whitespace-nowrap py-2">
            {items.map((item, index) => (
                <React.Fragment key={item.path}>
                    {index > 0 && <ChevronRight className="mx-2 w-4 h-4 text-gray-400" />}
                    <button
                        onClick={() => setViewPath(item.path)}
                        className={`hover:text-blue-600 hover:underline ${index === items.length - 1 ? 'font-semibold text-gray-900 pointer-events-none' : ''
                            }`}
                    >
                        {item.name}
                    </button>
                </React.Fragment>
            ))}
        </nav>
    )
}
