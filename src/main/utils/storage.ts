import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

const STORAGE_DIR = join(app.getPath('userData'), 'storage')
const MARKED_PATHS_FILE = join(STORAGE_DIR, 'marked-paths.json')

// Ensure storage directory exists
if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true })
}

export function getMarkedPaths(): string[] {
    try {
        if (!existsSync(MARKED_PATHS_FILE)) {
            return []
        }
        const data = readFileSync(MARKED_PATHS_FILE, 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        console.error('Error reading marked paths:', error)
        return []
    }
}

export function saveMarkedPaths(paths: string[]): void {
    try {
        writeFileSync(MARKED_PATHS_FILE, JSON.stringify(paths, null, 2), 'utf-8')
    } catch (error) {
        console.error('Error saving marked paths:', error)
    }
}
