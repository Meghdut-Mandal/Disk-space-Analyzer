Walkthrough - Scanning Improvements and UI Updates
I have implemented the requested improvements to the scanning functionality and the user interface.

Changes
1. Improved Scanning Logic
   .gitignore Support: The scanner now respects
   .gitignore
   files. Ignored directories (like node_modules) are calculated for size but not scanned recursively, significantly improving performance and reducing noise.
   Max Depth Configuration: Added a "Max Depth" setting to the scanner. This prevents the treemap from becoming too cluttered with deep nested structures.
2. UI Enhancements
   Colorful Treemap: Updated the
   TreemapView
   to use a more vibrant and extended color palette, making it easier to distinguish between different directories.
   Custom Content: The treemap now uses custom rendering for better visual control.
   Control Panel: Added a "Max Depth" input field to the control panel (default: 10).
   Verification Results
   Automated Checks
   npm exec tsc passed successfully, confirming no type errors were introduced.
   Manual Verification Steps
   Launch the App: Run npm run dev.
   Test Max Depth:
   Change "Max Depth" to 1.
   Scan a folder.
   Verify that only the top-level folders are shown in the treemap.
   Test .gitignore:
   Scan a project folder containing node_modules.
   Verify that node_modules appears as a single block with its total size, but you cannot drill down into it.
   Test Colors:
   Observe the treemap colors. They should be more vibrant and varied than before.