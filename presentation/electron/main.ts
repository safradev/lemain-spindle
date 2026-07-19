import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } from "electron";
import path from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";
import { CoreBridge } from "./core-bridge";
import { toUserFacingError } from "../src/lib/userFacingError";
import type { MediaFormat, ProgressEvent } from "../src/types/spindle";

const APP_NAME = "Lemain Spindle";

let mainWindow: BrowserWindow | null = null;
let bridge: CoreBridge | null = null;

app.setName(APP_NAME);

if (!app.isPackaged) {
  app.commandLine.appendSwitch("remote-debugging-port", "9223");
}

function resolveAppIconPath(): string | null {
  const candidates = [
    path.join(__dirname, "../resources/icon.icns"),
    path.join(__dirname, "../resources/icon.ico"),
    path.join(__dirname, "../resources/icon.png"),
    path.join(__dirname, "../public/brand/spindle-icon-512.png"),
    path.join(__dirname, "../dist/brand/spindle-icon-512.png"),
    path.join(__dirname, "../public/brand/spindle-icon.png"),
    path.join(__dirname, "../dist/brand/spindle-icon.png"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function applyDockBrand(iconPath: string | null): void {
  if (process.platform !== "darwin" || !app.dock) {
    return;
  }
  if (iconPath) {
    const image = nativeImage.createFromPath(iconPath);
    if (!image.isEmpty()) {
      app.dock.setIcon(image);
    }
  }
}

function throwUserFacing(error: unknown): never {
  console.error("[spindle]", error);
  throw new Error(toUserFacingError(error));
}

function createWindow(): void {
  const iconPath = resolveAppIconPath();

  mainWindow = new BrowserWindow({
    width: 920,
    height: 860,
    minWidth: 760,
    minHeight: 720,
    show: false,
    backgroundColor: "#070403",
    title: APP_NAME,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.setTitle(APP_NAME);
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function ensureBridge(): CoreBridge {
  if (!bridge) {
    bridge = new CoreBridge();
    bridge.on("progress", (event: ProgressEvent) => {
      mainWindow?.webContents.send("core:progress", event);
    });
    bridge.start();
  }
  return bridge;
}

function registerIpc(): void {
  ipcMain.handle("core:ping", async () => {
    try {
      return await ensureBridge().ping();
    } catch (error) {
      throwUserFacing(error);
    }
  });

  ipcMain.handle("core:getVideoInfo", async (_event, url: string) => {
    try {
      if (typeof url !== "string") {
        throw new Error("Informe um link do YouTube.");
      }
      return await ensureBridge().getVideoInfo(url);
    } catch (error) {
      throwUserFacing(error);
    }
  });

  ipcMain.handle(
    "core:download",
    async (
      _event,
      input: { url: string; format: MediaFormat; outputDir: string; requestId: string },
    ) => {
      try {
        if (
          !input ||
          typeof input.url !== "string" ||
          typeof input.outputDir !== "string" ||
          typeof input.requestId !== "string" ||
          (input.format !== "mp4" && input.format !== "mp3")
        ) {
          throw new Error("Parâmetros de download inválidos.");
        }
        return await ensureBridge().download(input);
      } catch (error) {
        throwUserFacing(error);
      }
    },
  );

  ipcMain.handle("dialog:pickOutputDir", async (_event, current?: string) => {
    try {
      if (!mainWindow) {
        return null;
      }
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Escolher pasta de destino",
        properties: ["openDirectory", "createDirectory"],
        defaultPath:
          typeof current === "string" && current.trim()
            ? current
            : path.join(os.homedir(), "Downloads"),
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0];
    } catch (error) {
      throwUserFacing(error);
    }
  });

  ipcMain.handle("app:defaultOutputDir", async () => path.join(os.homedir(), "Downloads"));
}

app.whenReady().then(() => {
  applyDockBrand(resolveAppIconPath());
  registerIpc();
  createWindow();
  try {
    ensureBridge();
  } catch (error) {
    console.error("Falha ao iniciar motor Python", error);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  bridge?.stop();
  bridge = null;
});
