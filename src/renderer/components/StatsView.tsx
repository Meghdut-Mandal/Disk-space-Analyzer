import { useMemo } from 'react'
import { PieChart as PieChartIcon, FileBarChart } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import bytes from 'bytes'
import { useAppStore } from '../store/useAppStore'
import { DirectoryNode } from '../types'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57']

const StatsView = () => {
    const { directoryData } = useAppStore()

    const { extensionData, largestFiles } = useMemo(() => {
        if (!directoryData) return { extensionData: [], largestFiles: [] }

        const extMap = new Map<string, number>()
        const files: Array<{ path: string; name: string; size: number }> = []

        const traverse = (node: DirectoryNode) => {
            if (!node.isDirectory) {
                // Extension stats
                const ext = node.name.includes('.') ? `.${node.name.split('.').pop()?.toLowerCase()}` : 'No Extension'
                extMap.set(ext, (extMap.get(ext) || 0) + node.size)

                // Largest files
                files.push({ path: node.path, name: node.name, size: node.size })
            }
            node.children.forEach(traverse)
        }

        traverse(directoryData)

        // Format extension data for chart
        const extData = Array.from(extMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10) // Top 10 extensions

        // Sort largest files
        const topFiles = files
            .sort((a, b) => b.size - a.size)
            .slice(0, 50)

        return { extensionData: extData, largestFiles: topFiles }
    }, [directoryData])

    if (!directoryData) return null

    return (
        <div className="h-full overflow-auto p-6 bg-gray-50">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* File Type Breakdown */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                        <PieChartIcon className="w-5 h-5 text-gray-700" />
                        <h3 className="text-lg font-semibold text-gray-800">File Type Breakdown</h3>
                    </div>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={extensionData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={120}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {extensionData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => bytes(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Largest Files List */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[466px]">
                    <div className="flex items-center gap-2 mb-4">
                        <FileBarChart className="w-5 h-5 text-gray-700" />
                        <h3 className="text-lg font-semibold text-gray-800">Top 50 Largest Files</h3>
                    </div>
                    <div className="overflow-auto flex-1 pr-2">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">Name</th>
                                    <th className="px-4 py-3 rounded-tr-lg text-right">Size</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {largestFiles.map((file, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[200px]" title={file.path}>
                                            {file.name}
                                            <div className="text-xs text-gray-400 font-normal truncate">{file.path}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                                            {bytes(file.size)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default StatsView
