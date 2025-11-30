import { readdir, lstat, readFile } from 'fs/promises'
import { join, relative } from 'path'
import ignore from 'ignore'

export interface DirectoryNode {
  name: string
  path: string
  size: number
  children: DirectoryNode[]
  isDirectory: boolean
}

export interface ScanOptions {
  maxDepth?: number
}

const CONCURRENCY_LIMIT = 50

class ConcurrencyLimiter {
  private active = 0
  private queue: (() => void)[] = []

  constructor(private limit: number) { }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>(resolve => this.queue.push(resolve))
    }
    this.active++
    try {
      return await fn()
    } finally {
      this.active--
      if (this.queue.length > 0) {
        const next = this.queue.shift()
        next?.()
      }
    }
  }
}

const limiter = new ConcurrencyLimiter(CONCURRENCY_LIMIT)

// Helper to calculate size of a directory recursively without building the tree
async function getDirSize(path: string): Promise<number> {
  let total = 0
  try {
    // Use withFileTypes to avoid separate lstat calls
    const entries = await limiter.run(() => readdir(path, { withFileTypes: true }))

    const promises = entries.map(async (entry) => {
      const entryPath = join(path, entry.name)
      if (entry.isSymbolicLink()) return 0

      if (entry.isDirectory()) {
        return await getDirSize(entryPath)
      } else if (entry.isFile()) {
        // We still need lstat for size, but only for files
        try {
          const stats = await limiter.run(() => lstat(entryPath))
          return stats.size
        } catch {
          return 0
        }
      }
      return 0
    })

    const sizes = await Promise.all(promises)
    total = sizes.reduce((acc, size) => acc + size, 0)

  } catch (error) {
    // Ignore errors
  }
  return total
}

export async function scanDirectory(rootPath: string, options: ScanOptions = {}): Promise<DirectoryNode> {
  const maxDepth = options.maxDepth ?? 10

  // Initialize ignore instance
  const ig = ignore()

  // Try to load root .gitignore if it exists
  try {
    const gitignorePath = join(rootPath, '.gitignore')
    const gitignoreContent = await readFile(gitignorePath, 'utf-8')
    ig.add(gitignoreContent)
  } catch (error) {
    // No .gitignore or error reading it, proceed without it
  }

  async function scanRecursive(path: string, name: string, depth: number): Promise<DirectoryNode> {
    // Initial check for root path
    let isDir = false
    let isSymLink = false
    let size = 0

    try {
      const stats = await limiter.run(() => lstat(path))
      isDir = stats.isDirectory()
      isSymLink = stats.isSymbolicLink()
      size = stats.isFile() ? stats.size : 0
    } catch (e) {
      // If we can't stat the root/current path, return empty node
      return {
        name,
        path,
        size: 0,
        children: [],
        isDirectory: false,
      }
    }

    if (isSymLink) {
      return {
        name,
        path,
        size: 0,
        children: [],
        isDirectory: false,
      }
    }

    if (!isDir) {
      return {
        name,
        path,
        size,
        children: [],
        isDirectory: false,
      }
    }

    // Check if this directory is ignored relative to root
    const relativePath = relative(rootPath, path)
    if (relativePath && ig.ignores(relativePath)) {
      const dirSize = await getDirSize(path)
      return {
        name,
        path,
        size: dirSize,
        children: [],
        isDirectory: true,
      }
    }

    const children: DirectoryNode[] = []
    let totalSize = 0

    // Prevent excessive recursion depth
    if (depth >= maxDepth) {
      const dirSize = await getDirSize(path)
      return {
        name,
        path,
        size: dirSize,
        children: [],
        isDirectory: true,
      }
    }

    try {
      const entries = await limiter.run(() => readdir(path, { withFileTypes: true }))

      const promises = entries.map(async (entry) => {
        const entryPath = join(path, entry.name)
        const entryRelativePath = relative(rootPath, entryPath)

        // Check ignore
        if (entryRelativePath && ig.ignores(entryRelativePath)) {
          if (entry.isSymbolicLink()) return null

          if (entry.isDirectory()) {
            const size = await getDirSize(entryPath)
            return {
              name: entry.name,
              path: entryPath,
              size,
              children: [],
              isDirectory: true
            } as DirectoryNode
          }
          return null
        }

        if (entry.isSymbolicLink()) return null

        if (entry.isDirectory()) {
          return await scanRecursive(entryPath, entry.name, depth + 1)
        } else {
          // It's a file
          try {
            const stats = await limiter.run(() => lstat(entryPath))
            return {
              name: entry.name,
              path: entryPath,
              size: stats.size,
              children: [],
              isDirectory: false
            } as DirectoryNode
          } catch {
            return null
          }
        }
      })

      const results = await Promise.all(promises)

      for (const result of results) {
        if (result) {
          children.push(result)
          totalSize += result.size
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

export { scanDirectoryFast } from './fastScanner'

