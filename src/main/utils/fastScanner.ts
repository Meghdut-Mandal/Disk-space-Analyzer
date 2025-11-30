import { spawn } from 'child_process'
import { DirectoryNode } from './scanner'
import { platform } from 'os'

export async function scanDirectoryFast(rootPath: string): Promise<DirectoryNode> {
    if (platform() === 'win32') {
        throw new Error('Fast scan not supported on Windows yet')
    }

    return new Promise((resolve, reject) => {
        const du = spawn('du', ['-ak', rootPath])

        let stdout = ''
        let stderr = ''

        du.stdout.on('data', (data) => {
            stdout += data.toString()
        })

        du.stderr.on('data', (data) => {
            stderr += data.toString()
        })

        du.on('close', (code) => {
            if (code !== 0) {
                console.warn('du command finished with non-zero exit code:', code)
                console.warn('stderr:', stderr)
                // We might still have partial output, but for now let's reject or try to parse what we have?
                // Usually du might fail on some permission denied files but still output others.
                // If stdout is empty, reject.
                if (!stdout) {
                    reject(new Error(`du command failed: ${stderr}`))
                    return
                }
            }

            try {
                const root = parseDuOutput(stdout, rootPath)
                resolve(root)
            } catch (err) {
                reject(err)
            }
        })

        du.on('error', (err) => {
            reject(err)
        })
    })
}

function parseDuOutput(output: string, rootPath: string): DirectoryNode {
    const lines = output.trim().split('\n')
    const nodes = new Map<string, DirectoryNode>()

    // First pass: Create all nodes
    for (const line of lines) {
        const parts = line.split('\t')
        if (parts.length < 2) continue

        const sizeVal = parseInt(parts[0], 10)
        // du -k returns kilobytes. Convert to bytes.
        const size = isNaN(sizeVal) ? 0 : sizeVal * 1024
        const path = parts.slice(1).join('\t') // Handle paths with tabs? Unlikely but possible.

        const name = path.split('/').pop() || path

        // We don't know if it is a directory or file just from du -a output easily without checking children
        // But we can infer: if it appears as a parent of another node, it is a directory.
        // Actually, du output doesn't explicitly say "dir" or "file".
        // However, we can assume everything is a file initially, and mark as directory if we add children to it.
        // Wait, that might be tricky.
        // Alternative: use `fs.lstat` for everything? No, that defeats the purpose.
        // `du` output includes the directory itself.
        // If I have a path `/a/b`, and `/a`, then `/a` is a directory.
        // But what if `/a/b` is the only file?
        // `du` lists directories too.

        // Let's assume everything is a node. We will link them up.
        // If a node ends up having children, it is a directory.
        // If it has no children, it might be a file or an empty directory.
        // Does it matter? The UI treats them similarly, but `isDirectory` flag is useful.
        // We can check if the size matches the sum of children? No, `du` size includes metadata.

        // Better approach:
        // We can't easily distinguish empty dir vs file from `du` output alone.
        // But maybe we can assume if it's not a leaf in our tree construction, it's a dir.
        // For leaves, we might default to file?
        // Or we can do a quick check?
        // Actually, `du` usually outputs directories last if doing DFS?
        // No, `du -a` order is not guaranteed to be children first or last strictly across implementations, but usually it is.

        // Let's just build the tree based on paths.
        nodes.set(path, {
            name,
            path,
            size,
            children: [],
            isDirectory: false // Will update later
        })
    }

    let root: DirectoryNode | null = null

    // Second pass: Build tree
    // We need to sort keys? No, just iterate.
    // For each node, find its parent.

    for (const [path, node] of nodes) {
        if (path === rootPath) {
            root = node
            node.isDirectory = true // Root is always a directory (unless we scanned a single file)
            continue
        }

        // Find parent path
        // /a/b/c -> parent /a/b
        const lastSlashIndex = path.lastIndexOf('/')
        if (lastSlashIndex === -1) continue // Should not happen for absolute paths

        const parentPath = path.substring(0, lastSlashIndex)

        // If parentPath is shorter than rootPath, it's outside our scan (should not happen if du was run on rootPath)
        if (!parentPath.startsWith(rootPath) && parentPath !== rootPath && path !== rootPath) {
            // This might happen if rootPath is like /a/b and we have /a/b/c. Parent is /a/b.
            // If rootPath is /a/b, parent /a/b is valid.
            // If path is /a/b, we handled it above.
        }

        const parent = nodes.get(parentPath)
        if (parent) {
            parent.children.push(node)
            parent.isDirectory = true
        } else {
            // Parent not found?
            // Maybe the path logic is tricky if rootPath has trailing slash or not.
            // Ensure rootPath doesn't have trailing slash for consistency.
        }
    }

    if (!root) {
        // Fallback if root path didn't match exactly (e.g. symlinks or normalization issues)
        // Try to find the node with the rootPath
        root = nodes.get(rootPath) || null
    }

    if (!root && nodes.size > 0) {
        // If we still don't have root, maybe return the first node?
        // Or create a dummy root?
        // Let's throw error or return empty.
        throw new Error('Could not find root node in du output')
    }

    return root!
}
