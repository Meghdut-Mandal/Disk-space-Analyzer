"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const promises = require("fs/promises");
async function scanDirectory(rootPath) {
  async function scanRecursive(path$1, name) {
    const stats = await promises.stat(path$1);
    if (!stats.isDirectory()) {
      return {
        name,
        path: path$1,
        size: stats.size,
        children: [],
        isDirectory: false
      };
    }
    const children = [];
    let totalSize = 0;
    try {
      const entries = await promises.readdir(path$1);
      for (const entry of entries) {
        const entryPath = path.join(path$1, entry);
        try {
          const child = await scanRecursive(entryPath, entry);
          children.push(child);
          totalSize += child.size;
        } catch (error) {
          console.error(`Error scanning ${entryPath}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${path$1}:`, error);
    }
    return {
      name,
      path: path$1,
      size: totalSize,
      children,
      isDirectory: true
    };
  }
  const rootName = rootPath.split(/[/\\]/).pop() || rootPath;
  return await scanRecursive(rootPath, rootName);
}
async function deleteDirectories(paths) {
  const success = [];
  const failed = [];
  const PROTECTED_PATHS = [
    "/",
    "/System",
    "/usr",
    "/bin",
    "/sbin",
    "/var",
    "/etc",
    "/dev",
    "/proc",
    "/sys",
    "C:\\Windows",
    "C:\\Program Files",
    "C:\\Program Files (x86)"
  ];
  const { default: trash } = await import("trash");
  for (const path$1 of paths) {
    if (!fs.existsSync(path$1)) {
      failed.push({ path: path$1, error: "Path does not exist" });
      continue;
    }
    const isProtected = PROTECTED_PATHS.some(
      (protectedPath) => path$1 === protectedPath || path$1.startsWith(path.join(protectedPath, "/"))
    );
    if (isProtected) {
      failed.push({ path: path$1, error: "Path is protected and cannot be deleted" });
      continue;
    }
    try {
      await trash(path$1);
      success.push(path$1);
    } catch (error) {
      failed.push({
        path: path$1,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  return { success, failed };
}
async function exportMarkedList(filePath, data, format) {
  let content;
  if (format === "json") {
    content = JSON.stringify(data, null, 2);
  } else {
    const headers = "Path,Size (bytes),Size (human readable)\n";
    const rows = data.map((item) => {
      const sizeMB = (item.size / (1024 * 1024)).toFixed(2);
      return `"${item.path}",${item.size},"${sizeMB} MB"`;
    });
    content = headers + rows.join("\n");
  }
  await promises.writeFile(filePath, content, "utf-8");
}
let store;
async function initStore() {
  if (!store) {
    const Store = (await import("electron-store")).default;
    store = new Store({
      defaults: {
        markedPaths: []
      }
    });
  }
  return store;
}
async function getMarkedPaths() {
  const s = await initStore();
  return s.get("markedPaths", []);
}
async function saveMarkedPaths(paths) {
  const s = await initStore();
  s.set("markedPaths", paths);
}
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: "hiddenInset"
  });
  const isDev = process.env.NODE_ENV === "development" || !electron.app.isPackaged;
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || (isDev ? "http://localhost:5173" : null);
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.ipcMain.handle("open-folder-dialog", async () => {
  const result = await electron.dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"]
  });
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});
electron.ipcMain.handle("scan-directory", async (_, path2) => {
  if (!fs.existsSync(path2)) {
    throw new Error("Directory does not exist");
  }
  return await scanDirectory(path2);
});
electron.ipcMain.handle("delete-directories", async (_, paths) => {
  return await deleteDirectories(paths);
});
electron.ipcMain.handle("export-marked-list", async (_, data, format) => {
  const result = await electron.dialog.showSaveDialog(mainWindow, {
    defaultPath: `marked-directories.${format}`,
    filters: [
      { name: format === "json" ? "JSON" : "CSV", extensions: [format] }
    ]
  });
  if (result.canceled || !result.filePath) {
    return null;
  }
  return await exportMarkedList(result.filePath, data, format);
});
electron.ipcMain.handle("get-marked-paths", async () => {
  return getMarkedPaths();
});
electron.ipcMain.handle("save-marked-paths", async (_, paths) => {
  saveMarkedPaths(paths);
});
