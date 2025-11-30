import { spawn } from 'child_process'
import { DirectoryNode } from './scanner'
import { platform } from 'os'
import { createInterface } from 'readline'

function buildTree(nodes: Map<string, DirectoryNode>, rootPath: string): DirectoryNode {
    const treeStartTime = Date.now()
    let root: DirectoryNode | null = null
    let processedCount = 0
    const totalNodes = nodes.size

    console.log(`[TREE] Building tree from ${totalNodes} nodes`)

    // Build tree structure
    for (const [path, node] of nodes) {
        processedCount++
        
        // Log progress for large directories
        if (processedCount % 10000 === 0) {
            console.log(`[TREE] Processed ${processedCount}/${totalNodes} nodes (${((processedCount/totalNodes)*100).toFixed(1)}%)`)
        }

        if (path === rootPath) {
            root = node
            node.isDirectory = true
            continue
        }

        // Find parent path
        const lastSlashIndex = path.lastIndexOf('/')
        if (lastSlashIndex === -1) continue

        const parentPath = path.substring(0, lastSlashIndex)
        const parent = nodes.get(parentPath)
        
        if (parent) {
            parent.children.push(node)
            parent.isDirectory = true
        }
    }
    
    console.log(`[TREE] Tree building completed in ${Date.now() - treeStartTime}ms`)

    if (!root) {
        root = nodes.get(rootPath) || null
    }

    if (!root && nodes.size > 0) {
        throw new Error('Could not find root node in du output')
    }

    return root!
}

export async function scanDirectoryFast(rootPath: string): Promise<DirectoryNode> {
    if (platform() === 'win32') {
        throw new Error('Fast scan not supported on Windows yet')
    }

    const startTime = Date.now()
    console.log(`[FAST_SCAN] Starting du command for: ${rootPath}`)

    return new Promise((resolve, reject) => {
        const du = spawn('du', ['-ak', rootPath])

        let stderr = ''
        let lineCount = 0
        let lastLogTime = Date.now()
        
        // Use streaming parser instead of accumulating in memory
        const nodes = new Map<string, DirectoryNode>()
        const rl = createInterface({
            input: du.stdout,
            crlfDelay: Infinity
        })

        rl.on('line', (line) => {
            lineCount++
            
            // Log progress every second instead of every N chunks
            const now = Date.now()
            if (now - lastLogTime > 1000) {
                console.log(`[FAST_SCAN] Processed ${lineCount} entries, ${nodes.size} nodes created`)
                lastLogTime = now
            }

            // Parse line immediately
            const parts = line.split('\t')
            if (parts.length < 2) return

            const sizeVal = parseInt(parts[0], 10)
            const size = isNaN(sizeVal) ? 0 : sizeVal * 1024
            const path = parts.slice(1).join('\t')
            const name = path.split('/').pop() || path

            nodes.set(path, {
                name,
                path,
                size,
                children: [],
                isDirectory: false
            })
        })

        du.stderr.on('data', (data) => {
            stderr += data.toString()
        })

        du.on('close', (code) => {
            const duTime = Date.now() - startTime
            console.log(`[FAST_SCAN] du command completed in ${duTime}ms (exit code: ${code})`)
            console.log(`[FAST_SCAN] Processed ${lineCount} lines, created ${nodes.size} nodes`)
            
            if (code !== 0) {
                console.warn('du command finished with non-zero exit code:', code)
                console.warn('stderr:', stderr)
                if (nodes.size === 0) {
                    reject(new Error(`du command failed: ${stderr}`))
                    return
                }
            }

            try {
                const parseStartTime = Date.now()
                console.log('[FAST_SCAN] Building tree structure...')
                const root = buildTree(nodes, rootPath)
                console.log(`[FAST_SCAN] Tree building completed in ${Date.now() - parseStartTime}ms`)
                console.log(`[FAST_SCAN] Total fast scan time: ${Date.now() - startTime}ms`)
                resolve(root)
            } catch (err) {
                console.error('[FAST_SCAN] Error building tree:', err)
                reject(err)
            }
        })

        du.on('error', (err) => {
            console.error('[FAST_SCAN] du command error:', err)
            reject(err)
        })
    })
}
