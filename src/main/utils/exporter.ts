import { writeFile } from 'fs/promises'

export async function exportMarkedList(
  filePath: string,
  data: Array<{ path: string; size: number }>,
  format: 'json' | 'csv'
): Promise<void> {
  let content: string

  if (format === 'json') {
    content = JSON.stringify(data, null, 2)
  } else {
    // CSV format
    const headers = 'Path,Size (bytes),Size (human readable)\n'
    const rows = data.map((item) => {
      const sizeMB = (item.size / (1024 * 1024)).toFixed(2)
      return `"${item.path}",${item.size},"${sizeMB} MB"`
    })
    content = headers + rows.join('\n')
  }

  await writeFile(filePath, content, 'utf-8')
}

