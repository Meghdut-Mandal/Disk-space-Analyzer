import { readdir, stat } from 'fs/promises'
import { join } from 'path'

export interface DirectoryNode {
  name: string
  path: string
  size: number
  children: DirectoryNode[]
  isDirectory: boolean
}

export async function scanDirectory(rootPath: string, maxDepth: number = 50): Promise<DirectoryNode> {
  async function scanRecursive(path: string, name: string, depth: number): Promise<DirectoryNode> {
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

    // Prevent excessive recursion depth
    if (depth >= maxDepth) {
      console.warn(`Max depth ${maxDepth} reached at ${path}`)
      return {
        name,
        path,
        size: 0,
        children: [],
        isDirectory: true,
      }
    }

    try {
      const entries = await readdir(path)
      
      for (const entry of entries) {
        const entryPath = join(path, entry)
        try {
          const child = await scanRecursive(entryPath, entry, depth + 1)
          children.push(child)
          totalSize += child.size
        } catch (error) {
          // Skip files/directories we can't access (permissions, symlinks, etc.)
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
  return await scanRecursive(rootPath, rootName, 0)
}

