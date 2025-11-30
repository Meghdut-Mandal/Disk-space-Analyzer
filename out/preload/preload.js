"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  openFolderDialog: () => electron.ipcRenderer.invoke("open-folder-dialog"),
  scanDirectory: (path) => electron.ipcRenderer.invoke("scan-directory", path),
  deleteDirectories: (paths) => electron.ipcRenderer.invoke("delete-directories", paths),
  exportMarkedList: (data, format) => electron.ipcRenderer.invoke("export-marked-list", data, format),
  getMarkedPaths: () => electron.ipcRenderer.invoke("get-marked-paths"),
  saveMarkedPaths: (paths) => electron.ipcRenderer.invoke("save-marked-paths", paths)
});
