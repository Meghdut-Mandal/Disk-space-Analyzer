import { readdir, stat } from 'fs/promises'
import { join } from 'path'

export interface DirectoryNode {
  name: string
  path: string
  size: number
  children: DirectoryNode[]
  isDirectory: boolean
}

export async function scanDirectory(rootPath: string): Promise<DirectoryNode> {
  async function scanRecursive(path: string, name: string): Promise<DirectoryNode> {
    const stats = await stat(path)
    
    if (!stats.isDirectory()) {
      return {
        name,
        path,
        size: stats.size,
        children: [],
        isDirectory: false,
      }
    }

    const children: DirectoryNode[] = []
    let totalSize = 0

    try {
      const entries = await readdir(path)
      
      for (const entry of entries) {
        const entryPath = join(path, entry)
        try {
          const child = await scanRecursive(entryPath, entry)
          children.push(child)
          totalSize += child.size
        } catch (error) {
          // Skip files/directories we can't access
          console.error(`Error scanning ${entryPath}:`, error)
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${path}:`, error)
    }

    return {
      name,
      path,
      size: totalSize,
      children,
      isDirectory: true,
    }
  }

  const rootName = rootPath.split(/[/\\]/).pop() || rootPath
  return await scanRecursive(rootPath, rootName)
}

