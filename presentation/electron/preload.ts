import { contextBridge, ipcRenderer } from "electron";
import { toUserFacingError } from "../src/lib/userFacingError";
import type { MediaFormat, ProgressEvent, SpindleApi } from "../src/types/spindle";

async function invokeUserSafe<T>(channel: string, ...args: unknown[]): Promise<T> {
  try {
    return (await ipcRenderer.invoke(channel, ...args)) as T;
  } catch (error) {
    throw new Error(toUserFacingError(error));
  }
}

const api: SpindleApi = {
  ping: () => invokeUserSafe<{ ok: boolean }>("core:ping"),
  getVideoInfo: (url: string) => invokeUserSafe("core:getVideoInfo", url),
  download: (input: {
    url: string;
    format: MediaFormat;
    outputDir: string;
    requestId: string;
  }) => invokeUserSafe("core:download", input),
  onProgress: (handler: (event: ProgressEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ProgressEvent) => {
      handler(payload);
    };
    ipcRenderer.on("core:progress", listener);
    return () => {
      ipcRenderer.removeListener("core:progress", listener);
    };
  },
  pickOutputDir: (current?: string) => invokeUserSafe<string | null>("dialog:pickOutputDir", current),
  getDefaultOutputDir: () => invokeUserSafe<string>("app:defaultOutputDir"),
};

contextBridge.exposeInMainWorld("spindle", api);
