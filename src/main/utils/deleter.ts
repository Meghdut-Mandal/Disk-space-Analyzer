import { existsSync } from 'fs'
import { join } from 'path'

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
  const { default: trash } = await import('trash')

  for (const path of paths) {
    if (!existsSync(path)) {
      failed.push({ path, error: 'Path does not exist' })
      continue
    }

    // Check if path is protected or inside a protected path
    const isProtected = PROTECTED_PATHS.some(protectedPath =>
      path === protectedPath || path.startsWith(join(protectedPath, '/'))
    )

    if (isProtected) {
      failed.push({ path, error: 'Path is protected and cannot be deleted' })
      continue
    }

    try {
      // Use trash instead of permanent deletion for safety
      await trash(path)
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

