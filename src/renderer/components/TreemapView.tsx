import { useMemo } from 'react'
import { Treemap, Tooltip, ResponsiveContainer } from 'recharts'
import { DirectoryNode, TreemapData } from '../types'
import bytes from 'bytes'
import { useAppStore } from '../store/useAppStore'

function convertToTreemapData(
  node: DirectoryNode,
  markedPaths: Set<string>,
  searchQuery: string,
  sizeFilter: number
): TreemapData | null {
  // Filter by size first (more efficient)
  if (sizeFilter > 0 && node.size < sizeFilter) {
    return null
  }

  // Filter by search query
  const matchesSearch = !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase())

  // Process children
  const children = node.children
    .map((child) => convertToTreemapData(child, markedPaths, searchQuery, sizeFilter))
    .filter((child): child is TreemapData => child !== null)

  // If node doesn't match search but has matching children, include it
  if (!matchesSearch && children.length === 0) {
    return null
  }

  const fill = markedPaths.has(node.path) ? '#ef4444' : getColorByDepth(node.path)

  return {
    name: node.name,
    path: node.path,
    size: node.size,
    children: children.length > 0 ? children : undefined,
    fill,
  }
}

function getColorByDepth(path: string): string {
  const depth = path.split(/[/\\]/).length
  // Vibrant, extended palette
  const colors = [
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#6366f1', // indigo-500
    '#06b6d4', // cyan-500
    '#f43f5e', // rose-500
    '#84cc16', // lime-500
    '#d946ef', // fuchsia-500
    '#0ea5e9', // sky-500
    '#14b8a6', // teal-500
    '#eab308', // yellow-500
    '#f97316', // orange-500
  ]
  return colors[depth % colors.length]
}

const CustomContent = (props: any) => {
  // Recharts Treemap passes data properties directly on props
  // For root node (depth 0), skip rendering as it's just a container
  // For actual data items, the properties are on props directly
  const { x, y, width, height, depth, markedPaths, onToggleMark, onDrillDown } = props

  // Get data properties - they might be on props directly or in payload
  const dataItem = props.payload || props
  const { name, path, size, fill, children } = dataItem

  // Skip root container node (depth 0) - it doesn't have data properties
  // Also skip if we don't have the required data properties
  if (depth === 0 || width < 5 || height < 5 || !name || size === undefined) {
    return null
  }

  const isMarked = markedPaths.has(path)
  const fontSize = Math.min(width / 8, height / 4, 14)
  const isDirectory = children && children.length > 0

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill || '#8884d8'}
        stroke={isMarked ? '#dc2626' : '#ffffff'}
        strokeWidth={isMarked ? 3 : 1}
        opacity={0.9}
        onClick={(e) => {
          e.stopPropagation()
          if (isDirectory) {
            onDrillDown(path)
          }
        }}
        style={{ cursor: isDirectory ? 'pointer' : 'default' }}
        className="transition-opacity hover:opacity-100"
      />

      {/* Mark Button (Top Right) */}
      {width > 20 && height > 20 && (
        <g
          onClick={(e) => {
            e.stopPropagation()
            onToggleMark(path)
          }}
          style={{ cursor: 'pointer' }}
        >
          <circle cx={x + width - 12} cy={y + 12} r={8} fill="white" opacity={0.8} />
          {isMarked ? (
            <path d={`M${x + width - 16} ${y + 12} L${x + width - 13} ${y + 15} L${x + width - 8} ${y + 9}`} stroke="#dc2626" strokeWidth="2" fill="none" />
          ) : (
            <circle cx={x + width - 12} cy={y + 12} r={6} stroke="#6b7280" strokeWidth="1" fill="none" />
          )}
        </g>
      )}

      {width > 60 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - fontSize / 2}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={fontSize}
            fontWeight="bold"
            pointerEvents="none"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + fontSize / 2}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={fontSize * 0.7}
            pointerEvents="none"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            {bytes(size)}
          </text>
        </>
      )}
    </g>
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl p-3 z-50">
        <div className="font-semibold text-gray-800">{data.name}</div>
        <div className="text-xs text-gray-500 mt-1 break-all max-w-md font-mono">{data.path}</div>
        <div className="text-sm text-blue-600 mt-1 font-bold">{bytes(data.size)}</div>
        {data.children && (
          <div className="text-xs text-gray-400 mt-1">Click to drill down</div>
        )}
      </div>
    )
  }
  return null
}

export default function TreemapView() {
  const {
    directoryData,
    viewPath,
    markedPaths,
    toggleMark,
    setViewPath,
    searchQuery,
    sizeFilter
  } = useAppStore()

  // Find the node corresponding to the current viewPath
  const currentViewNode = useMemo(() => {
    if (!directoryData || !viewPath) return null

    // Helper to find node by path
    const findNode = (node: DirectoryNode, targetPath: string): DirectoryNode | null => {
      // Normalize paths for comparison
      const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '') // Remove trailing slashes
      if (normalize(node.path) === normalize(targetPath)) return node

      for (const child of node.children) {
        const found = findNode(child, targetPath)
        if (found) return found
      }
      return null
    }

    return findNode(directoryData, viewPath)
  }, [directoryData, viewPath])

  const treemapData = useMemo(() => {
    if (!currentViewNode) return null
    const converted = convertToTreemapData(currentViewNode, markedPaths, searchQuery, sizeFilter)
    return converted
  }, [currentViewNode, markedPaths, searchQuery, sizeFilter])

  if (!treemapData) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No directories match the current filters
      </div>
    )
  }

  // Recharts Treemap works best with a flat array of top-level items
  // For nested structures, we need to flatten to show only the current level
  // Remove nested children to show only top-level items
  const flattenChildren = (items: TreemapData[]): TreemapData[] => {
    return items.map(item => ({
      ...item,
      children: undefined // Remove nested children for flat visualization
    }))
  }

  const treemapItems = treemapData.children && treemapData.children.length > 0
    ? flattenChildren(treemapData.children)
    : [treemapData]

  // Create a wrapper component that captures the props from TreemapView scope
  const CustomContentWrapper = (props: any) => {
    return CustomContent({
      ...props,
      markedPaths,
      onToggleMark: toggleMark,
      onDrillDown: setViewPath,
    })
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={treemapItems}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#fff"
          fill="#8884d8"
          animationDuration={400}
          content={<CustomContentWrapper />}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  )
}

