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
  // Using a more intuitive color scheme with better contrast
  const ratio = Math.min(size / maxSize, 1)
  
  // Use HSL for smooth color transitions
  // Hue: 200 (blue) -> 120 (green) -> 60 (yellow) -> 30 (orange) -> 0 (red)
  let hue: number
  if (ratio < 0.25) {
    // Small files: Blue to Cyan
    hue = 200 - (ratio / 0.25) * 20 // 200 -> 180
  } else if (ratio < 0.5) {
    // Medium-small: Cyan to Green
    hue = 180 - ((ratio - 0.25) / 0.25) * 60 // 180 -> 120
  } else if (ratio < 0.75) {
    // Medium-large: Green to Yellow
    hue = 120 - ((ratio - 0.5) / 0.25) * 60 // 120 -> 60
  } else {
    // Large files: Yellow to Red
    hue = 60 - ((ratio - 0.75) / 0.25) * 60 // 60 -> 0
  }
  
  // Higher saturation for more vibrant colors
  const saturation = 75 + (ratio * 15)
  // Better lightness range for readability
  const lightness = 45 + (ratio * 15)
  
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
  const [showName, setShowName] = useState(false)
  const [showSize, setShowSize] = useState(false)

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

  // Use ResizeObserver to track actual pixel dimensions and update text visibility
  useEffect(() => {
    if (!itemRef.current) return

    const updateVisibility = () => {
      if (itemRef.current) {
        const rect = itemRef.current.getBoundingClientRect()
        const pixelWidth = rect.width
        const pixelHeight = rect.height
        
        // Update text visibility based on actual pixel dimensions
        // Optimized thresholds for better readability
        setShowName(pixelWidth > 35 && pixelHeight > 18)
        setShowSize(pixelWidth > 50 && pixelHeight > 28)
      }
    }

    // Initial check
    updateVisibility()

    // Watch for size changes (zoom, pan, etc)
    const resizeObserver = new ResizeObserver(updateVisibility)
    resizeObserver.observe(itemRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

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
        className={`w-full h-full rounded-sm transition-all duration-200 ${
          isMarked ? 'border-[3px] border-red-400 ring-2 ring-red-400/50' : 'border border-black/30'
        } ${hovered ? 'brightness-110 shadow-2xl z-10 ring-2 ring-white/40 scale-[1.02]' : 'brightness-100 shadow-md'}`}
        style={{
          backgroundColor: color,
          boxShadow: hovered 
            ? '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.2) inset' 
            : '0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset',
        }}
      >
        <div className="w-full h-full p-1.5 flex flex-col items-center justify-center text-center overflow-hidden">
          {showName && (
            <div className="font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] text-xs line-clamp-2 px-1 leading-tight tracking-wide">
              {name}
            </div>
          )}
          {showSize && (
            <div className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-[10px] mt-1 font-mono font-semibold bg-black/20 px-1.5 py-0.5 rounded backdrop-blur-sm">
              {bytes(size)}
            </div>
          )}
        </div>
      </div>

      {/* Tooltip on Hover - positioned to not cover the item */}
      {hovered && (
        <div className={`absolute z-50 pointer-events-none ${tooltipPositionClasses[tooltipPosition]}`}>
          <div className="bg-gray-900/98 text-white text-xs p-3.5 rounded-xl shadow-2xl backdrop-blur-md border border-gray-600/50 min-w-[220px] max-w-[320px] whitespace-normal animate-in fade-in duration-200">
            <div className="font-bold mb-2 text-sm text-white">{name}</div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400 font-mono font-semibold">{bytes(size)}</span>
              <span className="text-gray-500 text-[10px]">•</span>
              <span className="text-gray-400 text-[10px]">{((size / maxSize) * 100).toFixed(1)}% of current view</span>
            </div>
            <div className="text-gray-400 text-[10px] break-all font-mono bg-black/30 px-2 py-1.5 rounded mb-2">{path}</div>
            {hasChildren && (
              <div className="flex items-center gap-1.5 text-emerald-400 mt-2.5 text-[11px] bg-emerald-500/10 px-2 py-1 rounded">
                <span>📁</span>
                <span className="font-medium">Click to explore directory</span>
              </div>
            )}
            <div className="text-gray-500 mt-2 text-[10px] border-t border-gray-700/50 pt-2">
              Right-click to mark for deletion
            </div>
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
      .paddingInner(0.15) // Reduced padding for better space utilization
      .paddingOuter(0.3)  // Reduced outer padding
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
      <div className="absolute top-3 left-3 z-50 flex flex-col gap-1.5 bg-gray-900/90 p-2 rounded-xl backdrop-blur-md border border-gray-700/50 shadow-2xl">
        <button
          onClick={() => setZoom(Math.min(zoom + 0.2, 5))}
          className="w-9 h-9 bg-gradient-to-br from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 text-white rounded-lg text-base font-bold transition-all hover:scale-105 active:scale-95 border border-blue-500/30"
          title="Zoom In (Scroll Up)"
        >
          +
        </button>
        <button
          onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
          className="w-9 h-9 bg-gradient-to-br from-purple-500/20 to-purple-600/20 hover:from-purple-500/30 hover:to-purple-600/30 text-white rounded-lg text-base font-bold transition-all hover:scale-105 active:scale-95 border border-purple-500/30"
          title="Zoom Out (Scroll Down)"
        >
          −
        </button>
        <div className="h-px bg-gray-700/50 my-0.5"></div>
        <button
          onClick={handleReset}
          className="w-9 h-9 bg-gradient-to-br from-gray-500/20 to-gray-600/20 hover:from-gray-500/30 hover:to-gray-600/30 text-white rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95 border border-gray-500/30"
          title="Reset View"
        >
          ⟲
        </button>
        <div className="text-white/80 text-[11px] text-center mt-0.5 font-mono font-semibold bg-black/30 px-1.5 py-1 rounded">
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
          className="absolute inset-0 p-6"
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
      <div className="absolute bottom-3 left-3 text-white/70 text-xs pointer-events-none bg-gray-900/90 px-3.5 py-2.5 rounded-xl backdrop-blur-md border border-gray-700/50 shadow-2xl">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-blue-400">🖱️</span>
            <span className="font-medium">Drag to pan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-400">🔍</span>
            <span className="font-medium">Scroll to zoom</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">👆</span>
            <span className="font-medium">Click to explore</span>
          </div>
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
    <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <TreemapContainer
        data={filteredData}
        markedPaths={markedPaths}
        onToggleMark={handleToggleMark}
        onDrillDown={setViewPath}
        onSelectFile={setSelectedFile}
      />
      {/* Color Legend - Improved positioning and design */}
      <div className="absolute top-3 right-3 text-white/90 text-xs pointer-events-none bg-gray-900/90 px-4 py-2.5 rounded-xl backdrop-blur-md border border-gray-700/50 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: 'hsl(190, 75%, 45%)' }}></div>
            <span className="font-medium">Small</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: 'hsl(90, 82%, 52%)' }}></div>
            <span className="font-medium">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: 'hsl(15, 87%, 55%)' }}></div>
            <span className="font-medium">Large</span>
          </div>
        </div>
      </div>
    </div>
  )
}

