import { existsSync } from 'fs'

export async function deleteDirectories(paths: string[]): Promise<{ success: string[]; failed: Array<{ path: string; error: string }> }> {
  const success: string[] = []
  const failed: Array<{ path: string; error: string }> = []

  const PROTECTED_PATHS = [
    '/',
    '/System',
    '/usr',
    '/bin',
    '/sbin',
    '/var',
    '/etc',
    '/dev',
    '/proc',
    '/sys',
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\Program Files (x86)',
  ]

  // Dynamic import for ESM module
  const { shell } = require('electron')

  for (const path of paths) {
    if (!existsSync(path)) {
      failed.push({ path, error: 'Path does not exist' })
      continue
    }

    // Check if path is protected or inside a protected path
    const isProtected = PROTECTED_PATHS.some(protectedPath => {
      // Normalize paths for comparison
      const normalizedPath = path.replace(/\\/g, '/')
      const normalizedProtected = protectedPath.replace(/\\/g, '/')
      return normalizedPath === normalizedProtected ||
        normalizedPath.startsWith(normalizedProtected + '/')
    })

    if (isProtected) {
      failed.push({ path, error: 'Path is protected and cannot be deleted' })
      continue
    }

    try {
      // Use electron shell.trashItem instead of trash package
      await shell.trashItem(path)
      success.push(path)
    } catch (error) {
      failed.push({
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return { success, failed }
}

