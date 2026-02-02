import { useState, useMemo } from 'react'
import { Search, Filter, Layers, Regex, CheckSquare, XSquare } from 'lucide-react'
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
    setMaxDepth,
    directoryData,
    getMatchingPaths,
    markByRegex,
    unmarkByRegex,
  } = useAppStore()

  const [regexPattern, setRegexPattern] = useState('')
  const [regexMode, setRegexMode] = useState<'name' | 'path'>('name')
  const [regexError, setRegexError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<string | null>(null)

  // Preview matching count
  const matchCount = useMemo(() => {
    if (!regexPattern || !directoryData) return 0
    const result = getMatchingPaths(regexPattern, regexMode)
    if (result.error) return 0
    return result.paths.length
  }, [regexPattern, regexMode, directoryData, getMatchingPaths])

  const handleSelectMatching = () => {
    if (!regexPattern) return
    const result = markByRegex(regexPattern, regexMode)
    if (result.error) {
      setRegexError(result.error)
      setLastResult(null)
    } else {
      setRegexError(null)
      setLastResult(`Marked ${result.matched} folders`)
    }
  }

  const handleDeselectMatching = () => {
    if (!regexPattern) return
    const result = unmarkByRegex(regexPattern, regexMode)
    if (result.error) {
      setRegexError(result.error)
      setLastResult(null)
    } else {
      setRegexError(null)
      setLastResult(`Unmarked ${result.matched} folders`)
    }
  }

  return (
    <div className="space-y-3">
      {/* Main controls row */}
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

      {/* Regex selection row */}
      {directoryData && (
        <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <Regex className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Enter regex pattern (e.g., node_modules|\.git)"
              value={regexPattern}
              onChange={(e) => {
                setRegexPattern(e.target.value)
                setRegexError(null)
                setLastResult(null)
              }}
              className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${regexError ? 'border-red-400 bg-red-50' : 'border-purple-300'
                }`}
            />
          </div>
          <select
            value={regexMode}
            onChange={(e) => setRegexMode(e.target.value as 'name' | 'path')}
            className="px-2 py-1.5 text-sm border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="name">Name</option>
            <option value="path">Path</option>
          </select>
          <button
            onClick={handleSelectMatching}
            disabled={!regexPattern || matchCount === 0}
            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            title="Mark all matching folders"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Select
          </button>
          <button
            onClick={handleDeselectMatching}
            disabled={!regexPattern}
            className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            title="Unmark all matching folders"
          >
            <XSquare className="w-3.5 h-3.5" />
            Deselect
          </button>
          {regexPattern && !regexError && (
            <span className="text-sm text-purple-700 font-medium whitespace-nowrap">
              {matchCount} matches
            </span>
          )}
          {regexError && (
            <span className="text-sm text-red-600 truncate max-w-xs" title={regexError}>
              {regexError}
            </span>
          )}
          {lastResult && !regexError && (
            <span className="text-sm text-green-600 font-medium">
              {lastResult}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

