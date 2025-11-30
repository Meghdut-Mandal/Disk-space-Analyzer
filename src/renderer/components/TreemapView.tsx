import { useMemo, useState, useRef, useEffect } from 'react'
import * as d3 from 'd3-hierarchy'
import bytes from 'bytes'
import { DirectoryNode } from '../types'
import { useAppStore } from '../store/useAppStore'

// --- Types ---
interface TreemapItemProps {
  x: number
  y: number
  width: number
  height: number
  name: string
  path: string
  size: number
  maxSize: number
  isMarked: boolean
  hasChildren: boolean
  onToggleMark: (path: string, e: React.MouseEvent) => void
  onDrillDown: (path: string) => void
  onSelectFile: (path: string) => void
}

// --- Helper Functions ---
function getColorBySize(size: number, maxSize: number): string {
  // Create a color scale from cool (small) to warm (large)
  // Using a more intuitive color scheme: green -> yellow -> orange -> red
  const ratio = Math.min(size / maxSize, 1)
  
  // Use HSL for smooth color transitions
  // Hue: 120 (green) to 0 (red)
  const hue = 120 - (ratio * 120)
  // Saturation: 70-90% for vibrant colors
  const saturation = 70 + (ratio * 20)
  // Lightness: 50-60% for good visibility
  const lightness = 50 + (ratio * 10)
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}


// --- Components ---

const TreemapItem = ({
  x,
  y,
  width,
  height,
  name,
  path,
  size,
  maxSize,
  isMarked,
  hasChildren,
  onToggleMark,
  onDrillDown,
  onSelectFile,
}: TreemapItemProps) => {
  const [hovered, setHovered] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top')
  const itemRef = useRef<HTMLDivElement>(null)

  // Skip rendering very small items
  if (width < 2 || height < 2) return null

  const color = isMarked ? '#ef4444' : getColorBySize(size, maxSize)

  const handleClick = () => {
    onSelectFile(path)
    if (hasChildren) {
      onDrillDown(path)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onToggleMark(path, e)
  }

  // Calculate tooltip position based on item location
  useEffect(() => {
    if (hovered && itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      // Determine best position for tooltip
      const spaceTop = rect.top
      const spaceBottom = viewportHeight - rect.bottom
      const spaceLeft = rect.left
      const spaceRight = viewportWidth - rect.right
      
      // Choose position with most space
      const maxSpace = Math.max(spaceTop, spaceBottom, spaceLeft, spaceRight)
      if (maxSpace === spaceTop) setTooltipPosition('top')
      else if (maxSpace === spaceBottom) setTooltipPosition('bottom')
      else if (maxSpace === spaceLeft) setTooltipPosition('left')
      else setTooltipPosition('right')
    }
  }, [hovered])

  // Calculate if we should show text (more lenient thresholds)
  const showName = width > 8 && height > 4
  const showSize = width > 12 && height > 6

  const tooltipPositionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div
      ref={itemRef}
      className="absolute cursor-pointer transition-all duration-200 group"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`w-full h-full rounded-sm border-2 transition-all duration-200 ${
          isMarked ? 'border-white' : 'border-black/40'
        } ${hovered ? 'brightness-110 shadow-2xl z-10 border-white/60' : 'brightness-100'}`}
        style={{
          backgroundColor: color,
          boxShadow: hovered ? '0 10px 40px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <div className="w-full h-full p-1 flex flex-col items-center justify-center text-center overflow-hidden">
          {showName && (
            <div className="font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-[11px] line-clamp-2 px-0.5 leading-tight">
              {name}
            </div>
          )}
          {showSize && (
            <div className="text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] text-[9px] mt-0.5 font-mono">
              {bytes(size)}
            </div>
          )}
        </div>
      </div>

      {/* Tooltip on Hover - positioned to not cover the item */}
      {hovered && (
        <div className={`absolute z-50 pointer-events-none ${tooltipPositionClasses[tooltipPosition]}`}>
          <div className="bg-gray-900/95 text-white text-xs p-3 rounded-lg shadow-2xl backdrop-blur-sm border border-gray-700 min-w-[200px] max-w-[300px] whitespace-normal">
            <div className="font-bold mb-1 text-sm">{name}</div>
            <div className="text-gray-300 mb-1 font-mono">{bytes(size)}</div>
            <div className="text-gray-400 text-[10px] break-all mb-2">{path}</div>
            {hasChildren && <div className="text-green-400 mt-2 text-[11px]">📁 Click to explore</div>}
            <div className="text-gray-500 mt-1 text-[10px]">Right-click to mark for deletion</div>
          </div>
        </div>
      )}
    </div>
  )
}

const TreemapContainer = ({
  data,
  markedPaths,
  onToggleMark,
  onDrillDown,
  onSelectFile,
}: {
  data: DirectoryNode
  markedPaths: Set<string>
  onToggleMark: (path: string, e: React.MouseEvent) => void
  onDrillDown: (path: string) => void
  onSelectFile: (path: string) => void
}) => {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Compute Layout
  const { items, maxSize } = useMemo(() => {
    const startTime = Date.now()
    if (!data) return { items: [], maxSize: 0 }

    const hierarchy = d3.hierarchy(data)
      .sum((d) => d.size)
      .sort((a, b) => (b.value || 0) - (a.value || 0))

    const treemap = d3.treemap<DirectoryNode>()
      .size([100, 100])
      .paddingInner(0.2) // Add padding between items for better separation
      .paddingOuter(0.5)
      .round(false)

    treemap(hierarchy)
    console.log(`[TREEMAP] Computed layout in ${Date.now() - startTime}ms, ${hierarchy.descendants().length} nodes`)
    
    const root = hierarchy as d3.HierarchyRectangularNode<DirectoryNode>
    const children = root.children || []
    const max = Math.max(...children.map(item => item.value || 0))
    
    return { items: children, maxSize: max }
  }, [data])

  // Handle zoom with mouse wheel - using useEffect to add non-passive listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY * -0.001
      setZoom(prevZoom => Math.min(Math.max(0.5, prevZoom + delta), 5))
    }

    // Add listener with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Handle pan with mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  // Reset zoom and pan
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  if (items.length === 0) return null

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Zoom Controls */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 bg-black/40 p-2 rounded-lg backdrop-blur-sm border border-white/10">
        <button
          onClick={() => setZoom(Math.min(zoom + 0.2, 5))}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-sm font-semibold transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-sm font-semibold transition-colors"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-semibold transition-colors"
          title="Reset View"
        >
          ⟲
        </button>
        <div className="text-white/70 text-[10px] text-center mt-1 font-mono">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Treemap Container with Pan and Zoom */}
      <div
        ref={containerRef}
        className={`relative w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="absolute inset-0 p-4"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <div className="relative w-full h-full">
            {items.map((node) => {
              // d3 layout gives x0, y0, x1, y1 as percentages
              const x = node.x0
              const y = node.y0
              const width = node.x1 - node.x0
              const height = node.y1 - node.y0

              return (
                <TreemapItem
                  key={node.data.path}
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  name={node.data.name}
                  path={node.data.path}
                  size={node.value || 0}
                  maxSize={maxSize}
                  isMarked={markedPaths.has(node.data.path)}
                  hasChildren={!!node.children && node.children.length > 0}
                  onToggleMark={onToggleMark}
                  onDrillDown={onDrillDown}
                  onSelectFile={onSelectFile}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 text-white/60 text-xs pointer-events-none bg-black/30 px-3 py-2 rounded-lg backdrop-blur-sm">
        <div className="flex flex-col gap-1">
          <div>🖱️ Drag to pan</div>
          <div>🔍 Scroll to zoom</div>
          <div>👆 Click to explore</div>
        </div>
      </div>
    </div>
  )
}

export default function TreemapView() {
  const {
    directoryData,
    viewPath,
    markedPaths,
    toggleMark,
    setViewPath,
    searchQuery,
    sizeFilter,
    setSelectedFile
  } = useAppStore()

  // Find the node corresponding to the current viewPath
  const currentViewNode = useMemo(() => {
    const startTime = Date.now()
    if (!directoryData || !viewPath) return null

    const findNode = (node: DirectoryNode, targetPath: string): DirectoryNode | null => {
      const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '')
      if (normalize(node.path) === normalize(targetPath)) return node

      for (const child of node.children) {
        const found = findNode(child, targetPath)
        if (found) return found
      }
      return null
    }

    const result = findNode(directoryData, viewPath)
    console.log(`[TREEMAP] Found current view node in ${Date.now() - startTime}ms`)
    return result
  }, [directoryData, viewPath])

  // Filter data based on search and size
  const filteredData = useMemo(() => {
    const startTime = Date.now()
    if (!currentViewNode) return null

    // Deep copy and filter
    const filterNode = (node: DirectoryNode): DirectoryNode | null => {
      if (sizeFilter > 0 && node.size < sizeFilter) return null

      const matchesSearch = !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase())

      const filteredChildren = node.children
        .map(filterNode)
        .filter((c): c is DirectoryNode => c !== null)

      if (!matchesSearch && filteredChildren.length === 0) return null

      return {
        ...node,
        children: filteredChildren
      }
    }

    const result = filterNode(currentViewNode)
    console.log(`[TREEMAP] Filtered data in ${Date.now() - startTime}ms`)
    return result
  }, [currentViewNode, searchQuery, sizeFilter])


  if (!filteredData) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No directories match the current filters
      </div>
    )
  }

  const handleToggleMark = (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    toggleMark(path)
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <TreemapContainer
        data={filteredData}
        markedPaths={markedPaths}
        onToggleMark={handleToggleMark}
        onDrillDown={setViewPath}
        onSelectFile={setSelectedFile}
      />
      <div className="absolute top-4 right-4 text-white/80 text-xs pointer-events-none bg-black/40 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'hsl(120, 70%, 50%)' }}></div>
            <span>Small</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'hsl(60, 80%, 55%)' }}></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'hsl(0, 90%, 60%)' }}></div>
            <span>Large</span>
          </div>
        </div>
      </div>
    </div>
  )
}

