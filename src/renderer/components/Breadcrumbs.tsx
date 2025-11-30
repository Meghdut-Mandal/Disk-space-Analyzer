import React from 'react'

interface BreadcrumbsProps {
    path: string
    onNavigate: (path: string) => void
    rootPath: string
}

export default function Breadcrumbs({ path, onNavigate, rootPath }: BreadcrumbsProps) {
    // Normalize paths to handle different separators
    const normalize = (p: string) => p.replace(/\\/g, '/')
    const normalizedPath = normalize(path)
    const normalizedRoot = normalize(rootPath)

    if (!normalizedPath.startsWith(normalizedRoot)) {
        return null
    }

    const relativePath = normalizedPath.slice(normalizedRoot.length)
    const parts = relativePath.split('/').filter(Boolean)

    // Determine the path separator from the original path
    const separator = path.includes('\\') ? '\\' : '/'

    const items = [
        { name: rootPath.split(/[/\\]/).pop() || rootPath, path: rootPath },
        ...parts.map((part, index) => {
            // Reconstruct path using original separator
            const pathParts = parts.slice(0, index + 1)
            const currentPath = rootPath + separator + pathParts.join(separator)
            return { name: part, path: currentPath }
        }),
    ]

    return (
        <nav className="flex items-center text-sm text-gray-600 overflow-x-auto whitespace-nowrap py-2">
            {items.map((item, index) => (
                <React.Fragment key={item.path}>
                    {index > 0 && <span className="mx-2 text-gray-400">/</span>}
                    <button
                        onClick={() => onNavigate(item.path)}
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
