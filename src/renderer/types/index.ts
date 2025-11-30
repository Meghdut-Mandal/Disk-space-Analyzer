export interface DirectoryNode {
  name: string
  path: string
  size: number
  children: DirectoryNode[]
  isDirectory: boolean
}

export interface TreemapData {
  name: string
  path: string
  size: number
  children?: TreemapData[]
  fill?: string
}

