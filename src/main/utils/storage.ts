import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

let STORAGE_DIR: string | null = null
let MARKED_PATHS_FILE: string | null = null

function getStoragePaths() {
    if (!STORAGE_DIR) {
        STORAGE_DIR = join(app.getPath('userData'), 'storage')
        MARKED_PATHS_FILE = join(STORAGE_DIR, 'marked-paths.json')

        // Ensure storage directory exists
        if (!existsSync(STORAGE_DIR)) {
            mkdirSync(STORAGE_DIR, { recursive: true })
        }
    }
    return { storageDir: STORAGE_DIR, markedPathsFile: MARKED_PATHS_FILE! }
}

export function getMarkedPaths(): string[] {
    try {
        const { markedPathsFile } = getStoragePaths()
        if (!existsSync(markedPathsFile)) {
            return []
        }
        const data = readFileSync(markedPathsFile, 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        console.error('Error reading marked paths:', error)
        return []
    }
}

export function saveMarkedPaths(paths: string[]): void {
    try {
        const { markedPathsFile } = getStoragePaths()
        writeFileSync(markedPathsFile, JSON.stringify(paths, null, 2), 'utf-8')
    } catch (error) {
        console.error('Error saving marked paths:', error)
    }
}
