import { readdir, stat, readFile } from 'fs/promises'
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

// Helper to calculate size of a directory recursively without building the tree
async function getDirSize(path: string): Promise<number> {
  let total = 0
  try {
    const stats = await stat(path)
    if (!stats.isDirectory()) {
      return stats.size
    }

    const entries = await readdir(path)
    for (const entry of entries) {
      const entryPath = join(path, entry)
      try {
        total += await getDirSize(entryPath)
      } catch (error) {
        // Ignore errors for individual files
      }
    }
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

    // Check if this directory is ignored relative to root
    const relativePath = relative(rootPath, path)
    if (relativePath && ig.ignores(relativePath)) {
      // If ignored, just calculate size without recursion into children for the tree
      const size = await getDirSize(path)
      return {
        name,
        path,
        size,
        children: [],
        isDirectory: true,
      }
    }

    const children: DirectoryNode[] = []
    let totalSize = 0

    // Prevent excessive recursion depth
    if (depth >= maxDepth) {
      // If max depth reached, calculate size but don't show children
      const size = await getDirSize(path)
      return {
        name,
        path,
        size,
        children: [],
        isDirectory: true,
      }
    }

    try {
      // Check for local .gitignore in this directory (optional, but good for nested repos)
      // For simplicity, we'll stick to root .gitignore for now as per common behavior, 
      // or we could add to a local ignore instance. 
      // Given the requirement "scaning folder which has a gitgnore file", 
      // it implies the root of the scan might have it.
      // If we encounter a nested .gitignore, we should probably respect it too, 
      // but that complicates the `ig` instance scoping. 
      // Let's stick to the root .gitignore for the main scan context, 
      // or check if the current directory has one and create a new scope?
      // For now, let's just use the root one.

      const entries = await readdir(path)

      for (const entry of entries) {
        const entryPath = join(path, entry)

        // Check if file/dir is ignored
        const entryRelativePath = relative(rootPath, entryPath)
        if (entryRelativePath && ig.ignores(entryRelativePath)) {
          // If it's a directory, we might want to show it as a block but not recurse?
          // The user said: "get the size of the ignored folder no need to go recursively into the ignored folders."
          // So we should include it in the tree as a leaf node with its size.
          try {
            const entryStats = await stat(entryPath)
            if (entryStats.isDirectory()) {
              const size = await getDirSize(entryPath)
              children.push({
                name: entry,
                path: entryPath,
                size,
                children: [],
                isDirectory: true
              })
              totalSize += size
            } else {
              // Ignored file, maybe skip? or include? 
              // Usually ignored files are not interesting. 
              // But if we want "size of ignored folder", we probably mean the folder itself.
              // If it's a file, let's skip it to reduce noise.
            }
          } catch (e) { }
          continue
        }

        try {
          const child = await scanRecursive(entryPath, entry, depth + 1)
          children.push(child)
          totalSize += child.size
        } catch (error) {
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

