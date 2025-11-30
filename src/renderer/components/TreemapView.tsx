import { useMemo } from 'react'
import { Treemap, Tooltip, ResponsiveContainer } from 'recharts'
import { DirectoryNode, TreemapData } from '../types'
import bytes from 'bytes'

interface TreemapViewProps {
  data: DirectoryNode
  markedPaths: Set<string>
  onToggleMark: (path: string) => void
  onDrillDown: (path: string) => void
  searchQuery: string
  sizeFilter: number
}

function convertToTreemapData(
  node: DirectoryNode,
  markedPaths: Set<string>,
  searchQuery: string,
  sizeFilter: number
): TreemapData | null {
  // Filter by search query
  if (searchQuery && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
    // Check if any children match
    const matchingChildren = node.children
      .map((child) => convertToTreemapData(child, markedPaths, searchQuery, sizeFilter))
      .filter((child): child is TreemapData => child !== null)

    if (matchingChildren.length === 0) {
      return null
    }

    return {
      name: node.name,
      path: node.path,
      size: node.size,
      children: matchingChildren,
      fill: markedPaths.has(node.path) ? '#ef4444' : '#3b82f6',
    }
  }

  // Filter by size
  if (sizeFilter > 0 && node.size < sizeFilter) {
    return null
  }

  const children = node.children
    .map((child) => convertToTreemapData(child, markedPaths, searchQuery, sizeFilter))
    .filter((child): child is TreemapData => child !== null)

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
  // Modern, vibrant palette
  const colors = [
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#6366f1', // indigo-500
    '#06b6d4', // cyan-500
    '#f43f5e', // rose-500
  ]
  return colors[depth % colors.length]
}

const CustomContent = (props: any) => {
  const { x, y, width, height, payload, markedPaths, onToggleMark, onDrillDown } = props

  if (width < 5 || height < 5 || !payload) {
    return null
  }

  const isMarked = markedPaths.has(payload.path)
  const fontSize = Math.min(width / 8, height / 4, 14)
  const isDirectory = payload.children && payload.children.length > 0

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.fill}
        stroke={isMarked ? '#dc2626' : '#ffffff'}
        strokeWidth={isMarked ? 3 : 1}
        opacity={0.9}
        onClick={(e) => {
          e.stopPropagation()
          if (isDirectory) {
            onDrillDown(payload.path)
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
            onToggleMark(payload.path)
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
            {payload.name}
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
            {bytes(payload.size)}
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

export default function TreemapView({
  data,
  markedPaths,
  onToggleMark,
  onDrillDown,
  searchQuery,
  sizeFilter,
}: TreemapViewProps) {
  const treemapData = useMemo(() => {
    const converted = convertToTreemapData(data, markedPaths, searchQuery, sizeFilter)
    if (!converted) return []
    // If the root has children, we want to show them. If not, show the root itself.
    return converted.children && converted.children.length > 0 ? converted.children : [converted]
  }, [data, markedPaths, searchQuery, sizeFilter])

  if (treemapData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No directories match the current filters
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={treemapData}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#fff"
          content={
            <CustomContent
              markedPaths={markedPaths}
              onToggleMark={onToggleMark}
              onDrillDown={onDrillDown}
            />
          }
          animationDuration={400}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  )
}

