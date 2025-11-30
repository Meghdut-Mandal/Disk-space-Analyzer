import { spawn } from 'child_process'
import { DirectoryNode, ScanOptions } from './scanner'
import { platform } from 'os'
import { createInterface } from 'readline'

// Helper to get directory sizes using du
function getDirectorySizes(rootPath: string): Promise<Map<string, number>> {
    return new Promise((resolve) => {
        const sizes = new Map<string, number>()
        // -k for kilobyte blocks
        const child = spawn('du', ['-k', rootPath])

        const rl = createInterface({
            input: child.stdout,
            crlfDelay: Infinity
        })

        rl.on('line', (line) => {
            const parts = line.split('\t')
            if (parts.length < 2) return

            const sizeKb = parseInt(parts[0], 10)
            const path = parts[1]

            if (!isNaN(sizeKb)) {
                // Convert KB to bytes
                sizes.set(path, sizeKb * 1024)
            }
        })

        child.on('close', () => {
            resolve(sizes)
        })

        child.on('error', (err) => {
            console.error('[FAST_SCAN] du command error:', err)
            resolve(sizes) // Return what we have
        })
    })
}

function calculateDirectorySizes(node: DirectoryNode, dirSizes: Map<string, number>): number {
    if (!node.isDirectory) {
        return node.size
    }

    // If we have the real size from du, use it
    const realSize = dirSizes.get(node.path)

    // We still need to recurse to ensure children are processed if needed,
    // but we trust du for the directory size.
    // However, if we don't have du size (e.g. new dir?), fallback to sum.

    let childrenSize = 0
    for (const child of node.children) {
        childrenSize += calculateDirectorySizes(child, dirSizes)
    }

    if (realSize !== undefined) {
        node.size = realSize
    } else {
        node.size = childrenSize
    }

    return node.size
}

function buildTree(nodes: Map<string, DirectoryNode>, dirSizes: Map<string, number>, rootPath: string): DirectoryNode {
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
        // Fallback: try to find the root node if exact match failed (unlikely with find)
        // But if we have nodes, we must have a root somewhere or the rootPath is slightly different?
        // Let's just create a synthetic root if needed? No, that's dangerous.
        throw new Error('Could not find root node in find output')
    }

    if (root) {
        calculateDirectorySizes(root, dirSizes)
    }

    return root!
}

export async function scanDirectoryFast(rootPath: string, options: ScanOptions = {}): Promise<DirectoryNode> {
    if (platform() === 'win32') {
        throw new Error('Fast scan not supported on Windows yet')
    }

    const { maxDepth, minSize } = options
    const startTime = Date.now()
    console.log(`[FAST_SCAN] Starting scan for: ${rootPath}`)

    // Start du command in parallel
    const duPromise = getDirectorySizes(rootPath)

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

        // Use stat to get size in bytes, path, and file type
        cmd += ` -print0 | xargs -0 stat -f "%z\t%N\t%HT"`

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
            if (parts.length < 3) return

            const sizeVal = parseInt(parts[0], 10)
            // stat returns bytes, no need to multiply by 1024
            const size = isNaN(sizeVal) ? 0 : sizeVal
            const path = parts[1]
            const type = parts[2]
            const name = path.split('/').pop() || path

            const isDirectory = type === 'Directory'

            nodes.set(path, {
                name,
                path,
                size,
                children: [],
                isDirectory: isDirectory // Use the type from find
            })
        })

        child.stderr.on('data', (data) => {
            stderr += data.toString()
        })

        child.on('close', async (code) => {
            const cmdTime = Date.now() - startTime
            console.log(`[FAST_SCAN] Find command completed in ${cmdTime}ms (exit code: ${code})`)
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
                // Wait for du to finish
                console.log('[FAST_SCAN] Waiting for directory sizes...')
                const dirSizes = await duPromise
                console.log(`[FAST_SCAN] Got ${dirSizes.size} directory sizes`)

                const parseStartTime = Date.now()
                console.log('[FAST_SCAN] Building tree structure...')
                const root = buildTree(nodes, dirSizes, rootPath)
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
