import { spawn } from 'child_process'
import { DirectoryNode, ScanOptions } from './scanner'
import { platform } from 'os'
import { createInterface } from 'readline'

function calculateDirectorySizes(node: DirectoryNode): number {
    if (!node.isDirectory) {
        return node.size
    }
    let total = 0
    for (const child of node.children) {
        total += calculateDirectorySizes(child)
    }
    node.size = total
    return total
}

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
            console.log(`[TREE] Processed ${processedCount}/${totalNodes} nodes (${((processedCount / totalNodes) * 100).toFixed(1)}%)`)
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
        // If we can't find the exact root node, try to find a node that matches the root path logic
        // or just return the first node? No, that's risky.
        // But with find, if we filter, the root might be there.
        // If find output includes rootPath, it should be fine.
        // If find output does NOT include rootPath (e.g. filtered out?), then we have a problem.
        // But we always include directories in find command: -type d
        // So root directory should be present.
        throw new Error('Could not find root node in find output')
    }

    if (root) {
        calculateDirectorySizes(root)
    }

    return root!
}

export async function scanDirectoryFast(rootPath: string, options: ScanOptions = {}): Promise<DirectoryNode> {
    if (platform() === 'win32') {
        throw new Error('Fast scan not supported on Windows yet')
    }

    const { maxDepth, minSize } = options
    const startTime = Date.now()
    console.log(`[FAST_SCAN] Starting find command for: ${rootPath}`)

    return new Promise((resolve, reject) => {
        // Construct find command
        // find "path" -maxdepth N \( -type d -o \( -type f -size +Sc \) \) -print0 | xargs -0 stat -f "%z\t%N"

        let cmd = `find "${rootPath}"`

        if (maxDepth !== undefined) {
            cmd += ` -maxdepth ${maxDepth}`
        }

        // Filter: Directories OR (Files AND Size > minSize)
        if (minSize !== undefined) {
            cmd += ` \\( -type d -o \\( -type f -size +${minSize}c \\) \\)`
        }

        // Use stat to get size in bytes and path
        cmd += ` -print0 | xargs -0 stat -f "%z\t%N"`

        console.log(`[FAST_SCAN] Command: ${cmd}`)

        const child = spawn('sh', ['-c', cmd])

        let stderr = ''
        let lineCount = 0
        let lastLogTime = Date.now()

        // Use streaming parser instead of accumulating in memory
        const nodes = new Map<string, DirectoryNode>()
        const rl = createInterface({
            input: child.stdout,
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
            // stat returns bytes, no need to multiply by 1024
            const size = isNaN(sizeVal) ? 0 : sizeVal
            const path = parts.slice(1).join('\t')
            const name = path.split('/').pop() || path

            nodes.set(path, {
                name,
                path,
                size,
                children: [],
                isDirectory: false // Will be updated in buildTree
            })
        })

        child.stderr.on('data', (data) => {
            stderr += data.toString()
        })

        child.on('close', (code) => {
            const cmdTime = Date.now() - startTime
            console.log(`[FAST_SCAN] Command completed in ${cmdTime}ms (exit code: ${code})`)
            console.log(`[FAST_SCAN] Processed ${lineCount} lines, created ${nodes.size} nodes`)

            if (code !== 0) {
                console.warn('Command finished with non-zero exit code:', code)
                console.warn('stderr:', stderr)
                if (nodes.size === 0) {
                    reject(new Error(`Command failed: ${stderr}`))
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

        child.on('error', (err) => {
            console.error('[FAST_SCAN] Command error:', err)
            reject(err)
        })
    })
}
