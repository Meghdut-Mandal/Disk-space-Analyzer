import { getDatabase, DirectoryHistory, UserAction } from './client'
import { join } from 'path'

export interface DirectoryHistoryEntry {
    id: number
    path: string
    name: string
    size: bigint
    lastScanned: Date
    scanCount: number
    createdAt: Date
    updatedAt: Date
}

export interface UserActionEntry {
    id: number
    type: string
    path: string | null
    metadata: string | null
    timestamp: Date
}

function getDbPath(): string {
    const { app } = require('electron')
    return join(app.getPath('userData'), 'size-manager.db')
}

/**
 * Add or update a directory in the history
 */
export async function addDirectoryHistory(
    path: string,
    name: string,
    size: number
): Promise<void> {
    await getDatabase(getDbPath())

    try {
        const existing = await DirectoryHistory.findOne({ where: { path } })

        if (existing) {
            await existing.update({
                size,
                lastScanned: new Date(),
                scanCount: existing.scanCount + 1
            })
        } else {
            await DirectoryHistory.create({
                path,
                name,
                size,
                lastScanned: new Date(),
                scanCount: 1
            })
        }
    } catch (error) {
        console.error('Error adding directory history:', error)
        throw error
    }
}

/**
 * Get recent directories, sorted by last scanned date
 */
export async function getRecentDirectories(
    limit: number = 10
): Promise<Array<{ path: string; name: string; size: number; lastScanned: string; scanCount: number }>> {
    await getDatabase(getDbPath())

    try {
        const results = await DirectoryHistory.findAll({
            order: [['lastScanned', 'DESC']],
            limit,
            raw: true // Get plain objects instead of Sequelize instances
        })

        return results.map((r: any) => {
            const mapped = {
                path: r.path,
                name: r.name,
                size: Number(r.size),
                lastScanned: new Date(r.lastScanned).toISOString(), // Serialize as ISO string
                scanCount: r.scanCount
            }
            return mapped
        })
    } catch (error) {
        console.error('Error getting recent directories:', error)
        return []
    }
}

/**
 * Log a user action
 */
export async function logAction(
    type: 'scan' | 'delete' | 'export' | 'mark' | 'unmark',
    path?: string,
    metadata?: Record<string, any>
): Promise<void> {
    await getDatabase(getDbPath())

    try {
        await UserAction.create({
            type,
            path: path || null,
            metadata: metadata ? JSON.stringify(metadata) : null,
            timestamp: new Date()
        })
    } catch (error) {
        console.error('Error logging action:', error)
    }
}

/**
 * Get recent user actions
 */
export async function getActionHistory(
    limit: number = 50
): Promise<Array<{ id: number; type: string; path: string | null; metadata: any; timestamp: Date }>> {
    await getDatabase(getDbPath())

    try {
        const results = await UserAction.findAll({
            order: [['timestamp', 'DESC']],
            limit
        })

        return results.map(r => ({
            id: r.id,
            type: r.type,
            path: r.path,
            metadata: r.metadata ? JSON.parse(r.metadata) : null,
            timestamp: r.timestamp
        }))
    } catch (error) {
        console.error('Error getting action history:', error)
        return []
    }
}
