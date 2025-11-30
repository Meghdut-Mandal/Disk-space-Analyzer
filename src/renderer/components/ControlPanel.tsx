interface ControlPanelProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  sizeFilter: number
  onSizeFilterChange: (size: number) => void
  maxDepth: number
  onMaxDepthChange: (depth: number) => void
}

const SIZE_THRESHOLDS = [
  { label: 'All', value: 0 },
  { label: '> 10 MB', value: 10 * 1024 * 1024 },
  { label: '> 100 MB', value: 100 * 1024 * 1024 },
  { label: '> 500 MB', value: 500 * 1024 * 1024 },
  { label: '> 1 GB', value: 1024 * 1024 * 1024 },
]

export default function ControlPanel({
  searchQuery,
  onSearchChange,
  sizeFilter,
  onSizeFilterChange,
  maxDepth,
  onMaxDepthChange,
}: ControlPanelProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search directories..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Max Depth:</label>
        <input
          type="number"
          min="1"
          max="50"
          value={maxDepth}
          onChange={(e) => onMaxDepthChange(Math.max(1, Math.min(50, Number(e.target.value))))}
          className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Size filter:</label>
        <select
          value={sizeFilter}
          onChange={(e) => onSizeFilterChange(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SIZE_THRESHOLDS.map((threshold) => (
            <option key={threshold.value} value={threshold.value}>
              {threshold.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

