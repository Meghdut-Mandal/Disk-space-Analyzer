import { Search, Filter, Layers } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const SIZE_THRESHOLDS = [
  { label: 'All', value: 0 },
  { label: '> 10 MB', value: 10 * 1024 * 1024 },
  { label: '> 50 MB', value: 50 * 1024 * 1024 },
  { label: '> 100 MB', value: 100 * 1024 * 1024 },
  { label: '> 500 MB', value: 500 * 1024 * 1024 },
  { label: '> 1 GB', value: 1024 * 1024 * 1024 },
]

export default function ControlPanel() {
  const {
    searchQuery,
    setSearchQuery,
    sizeFilter,
    setSizeFilter,
    maxDepth,
    setMaxDepth
  } = useAppStore()

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search directories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-gray-600" />
        <label className="text-sm text-gray-600">Max Depth:</label>
        <input
          type="number"
          min="1"
          max="50"
          value={maxDepth}
          onChange={(e) => setMaxDepth(Math.max(1, Math.min(50, Number(e.target.value))))}
          className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-600" />
        <label className="text-sm text-gray-600">Size filter:</label>
        <select
          value={sizeFilter}
          onChange={(e) => setSizeFilter(Number(e.target.value))}
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

