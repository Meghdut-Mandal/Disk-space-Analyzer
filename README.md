# Size Manager

An Electron application for visualizing directory sizes using an interactive treemap view. Mark directories for deletion and manage disk space efficiently.

## Features

- **Treemap Visualization**: Interactive treemap showing directory sizes as proportional rectangles
- **Mark for Deletion**: Click on directories in the treemap to mark them for deletion
- **Search**: Filter directories by name
- **Size Filters**: Show only directories above certain size thresholds (10MB, 100MB, 500MB, 1GB)
- **Persistence**: Marked directories are saved between app sessions
- **Export**: Export marked directories list to JSON or CSV
- **Safe Deletion**: Deleted directories are moved to trash, not permanently deleted

## Installation

```bash
bun install
```

## Development

```bash
bun run dev
```

## Build

```bash
bun run build
```

## Usage

1. Click "Select Folder" to choose a directory to analyze
2. Wait for the directory scan to complete
3. The treemap will display all directories, sized by their disk usage
4. Click on any directory rectangle to mark it for deletion (red border indicates marked)
5. Use the search box to filter directories by name
6. Use the size filter dropdown to show only directories above a certain size
7. View marked directories in the right sidebar
8. Click "Export Marked" to save the list to a file
9. Click "Delete All Marked" to move all marked directories to trash

## Technology Stack

- **Electron**: Cross-platform desktop app framework
- **React**: UI framework
- **Recharts**: Treemap visualization
- **Tailwind CSS**: Styling
- **TypeScript**: Type safety
- **Vite**: Build tool
- **electron-store**: Persistent storage
- **trash**: Safe file deletion

