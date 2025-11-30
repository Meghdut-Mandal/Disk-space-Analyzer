# Electron Directory Treemap App

## Project Structure Setup

- Initialize Electron + React project using Vite for fast builds
- Configure bun as package manager
- Setup TypeScript for type safety
- Configure Electron Forge or similar for building/packaging

## Core Dependencies

- **Electron**: Main app framework
- **React + React DOM**: UI framework
- **Recharts** or **D3.js**: Treemap visualization library (Recharts for simplicity, D3 for customization)
- **electron-store**: Persist marked directories between sessions
- **Tailwind CSS**: Modern, utility-first styling

## Backend (Electron Main Process)

Create main process handlers in [`src/main/main.ts`](src/main/main.ts):

- **IPC Handler**: `scan-directory` - recursively scan folder, calculate sizes
- **IPC Handler**: `open-folder-dialog` - native file picker dialog
- **IPC Handler**: `delete-directories` - delete marked directories with validation
- **IPC Handler**: `export-marked-list` - export to JSON/CSV file
- Use Node.js `fs` module for file operations
- Implement efficient recursive directory scanning with size calculation

## Frontend (React Renderer Process)

Create React application in [`src/renderer/`](src/renderer/):

### Main Components

1. **App.tsx**: Main layout and state management
2. **FolderPicker.tsx**: Button to trigger folder selection dialog
3. **TreemapView.tsx**: Interactive treemap visualization

    - Display directories as sized rectangles
    - Color coding by size or depth
    - Click to drill down into subdirectories
    - Visual indicator for marked items (e.g., red border, overlay)

4. **ControlPanel.tsx**: Search, filters, and action buttons
5. **MarkedList.tsx**: Sidebar showing marked directories with total size
6. **DeleteConfirmation.tsx**: Modal for bulk deletion confirmation

### State Management

- React Context or useState for:
    - Current directory data
    - Marked directories (Set of paths)
    - Selected folder path
    - Search query
    - Size filter threshold

### Features Implementation

1. **Search**: Filter visible directories by name using input field
2. **Size Filters**: Slider/dropdown to show only directories above threshold (e.g., >100MB, >1GB)
3. **Persistence**: Save/load marked directories using electron-store
4. **Export**: Export marked list with sizes to CSV or JSON file

## UI Design

- **Color Scheme**: Modern palette (e.g., grays, blues, accent colors for warnings)
- **Layout**:
    - Top: Folder picker + control panel
    - Main: Treemap visualization (fills most space)
    - Right sidebar: List of marked directories
    - Bottom: Action buttons (Export, Delete All Marked)
- **Typography**: Clean, sans-serif font (Inter or system fonts)
- **Interactions**: Hover tooltips showing full path and size, click to mark/unmark

## File Structure

```
size-manager/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron.vite.config.ts
├── src/
│   ├── main/
│   │   ├── main.ts (Electron main process)
│   │   ├── preload.ts (IPC bridge)
│   │   └── utils/
│   │       ├── scanner.ts (directory scanning logic)
│   │       └── storage.ts (persistence logic)
│   └── renderer/
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── FolderPicker.tsx
│       │   ├── TreemapView.tsx
│       │   ├── ControlPanel.tsx
│       │   ├── MarkedList.tsx
│       │   └── DeleteConfirmation.tsx
│       ├── hooks/
│       │   └── useDirectoryData.ts
│       ├── types/
│       │   └── index.ts
│       └── styles/
│           └── globals.css
└── README.md
```

## Key Technical Decisions

1. Use **Recharts Treemap** for visualization (simpler than D3, good for this use case)
2. Use **bytes** library for human-readable size formatting
3. Implement **debounced search** to avoid performance issues
4. Add **loading states** during directory scanning
5. Size calculation happens in main process (access to file system)

## Safety Features

- Confirmation dialog before deletion with list of what will be deleted
- Prevent deletion of system/protected directories
- Show total size to be freed
- Option to move to trash instead of permanent deletion (using `trash` package)