import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";
import { existsSync } from "node:fs";
import { EventEmitter } from "node:events";
import type {
  BridgeError,
  DownloadResult,
  MediaFormat,
  ProgressEvent,
  VideoInfo,
} from "../src/types/spindle";

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type BridgeResponse = {
  id?: string | number | null;
  result?: unknown;
  error?: BridgeError;
  method?: string;
  params?: ProgressEvent;
};

type CoreLaunch = {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  bundled: boolean;
};

const READY_MARKER = "spindle-core:ready";
const READY_TIMEOUT_MS = 60_000;
const REQUEST_TIMEOUT_MS: Record<string, number> = {
  ping: 20_000,
  getVideoInfo: 90_000,
  download: 30 * 60_000,
};

function repoRootFromMain(): string {
  return path.resolve(__dirname, "..", "..");
}

function resolvePythonBinary(root: string): string {
  const candidates = [
    path.join(root, ".venv", "bin", "python"),
    path.join(root, ".venv", "bin", "python3"),
    path.join(root, ".venv", "Scripts", "python.exe"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return process.platform === "win32" ? "python" : "python3";
}

function coreFileName(): string {
  return process.platform === "win32" ? "spindle-core.exe" : "spindle-core";
}

function resolveBundledCorePath(): string | null {
  const fileName = coreFileName();
  const candidates = [
    path.join(process.resourcesPath, "core", fileName),
    path.join(repoRootFromMain(), "presentation", "build-resources", "core", fileName),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolveBundledFfmpegPath(): string | null {
  const fileName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const candidates = [
    path.join(process.resourcesPath, "ffmpeg", fileName),
    path.join(repoRootFromMain(), "presentation", "build-resources", "ffmpeg", fileName),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function packagedCorePath(): string {
  return path.join(process.resourcesPath, "core", coreFileName());
}

function shouldUseBundledCore(): boolean {
  if (process.env.SPINDLE_USE_BUNDLED_CORE === "1") {
    return true;
  }
  if (process.env.SPINDLE_USE_BUNDLED_CORE === "0") {
    return false;
  }
  if (process.env.VITE_DEV_SERVER_URL) {
    return false;
  }
  return existsSync(packagedCorePath());
}

function sanitizeEnv(base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base };
  for (const key of Object.keys(env)) {
    if (key.startsWith("ELECTRON_") || key === "NODE_OPTIONS" || key === "ELECTRON_RUN_AS_NODE") {
      delete env[key];
    }
  }
  env.PYTHONUNBUFFERED = "1";
  env.PYTHONIOENCODING = "utf-8";
  env.PYTHONUTF8 = "1";
  return env;
}

function resolveCoreLaunch(root: string): CoreLaunch {
  const ffmpeg = resolveBundledFfmpegPath();
  const env = sanitizeEnv(process.env);

  if (ffmpeg) {
    env.SPINDLE_FFMPEG = ffmpeg;
  }

  if (shouldUseBundledCore()) {
    const bundledCore = resolveBundledCorePath();
    if (!bundledCore) {
      throw new Error("Motor embutido não encontrado. Reinstale o aplicativo.");
    }
    const runtimeDir = path.join(path.dirname(bundledCore), "runtime");
    if (!existsSync(runtimeDir)) {
      throw new Error("Motor incompleto (runtime ausente). Reinstale o aplicativo.");
    }
    console.log(`[core] launching bundled motor: ${bundledCore}`);
    return {
      command: bundledCore,
      args: [],
      cwd: path.dirname(bundledCore),
      env,
      bundled: true,
    };
  }

  const python = resolvePythonBinary(root);
  console.log(`[core] launching python motor: ${python}`);
  return {
    command: python,
    args: ["-m", "core.bridge.stdio_server"],
    cwd: root,
    env: {
      ...env,
      PYTHONPATH: root,
    },
    bundled: false,
  };
}

export class CoreBridge extends EventEmitter {
  private child: ChildProcessWithoutNullStreams | null = null;
  private pending = new Map<string, Pending>();
  private nextId = 1;
  private started = false;
  private motorReady = false;
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;
  private readyReject: ((error: Error) => void) | null = null;
  private readyTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly root: string;

  constructor(root = repoRootFromMain()) {
    super();
    this.root = root;
  }

  start(): void {
    if (this.started) {
      return;
    }

    const launch = resolveCoreLaunch(this.root);
    this.motorReady = false;
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
      this.readyTimer = setTimeout(() => {
        reject(new Error("Motor demorou demais para iniciar."));
      }, READY_TIMEOUT_MS);
    });
    this.readyPromise.catch(() => undefined);

    this.child = spawn(launch.command, launch.args, {
      cwd: launch.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: launch.env,
      windowsHide: true,
      shell: false,
    });
    this.started = true;

    const stdout = createInterface({ input: this.child.stdout, crlfDelay: Infinity });
    stdout.on("line", (line) => this.onLine(line));

    const stderr = createInterface({ input: this.child.stderr, crlfDelay: Infinity });
    stderr.on("line", (line) => {
      const text = line.trim();
      if (!text) {
        return;
      }
      console.error(`[core] ${text}`);
      if (text.includes(READY_MARKER)) {
        this.markReady();
      }
    });

    this.child.on("error", (error) => {
      console.error("[core] failed to spawn", error);
      this.failReady(error instanceof Error ? error : new Error(String(error)));
      this.resetChild();
      this.rejectAll(error instanceof Error ? error : new Error(String(error)));
      this.emit("exit", error);
    });

    this.child.on("exit", (code, signal) => {
      const error = new Error(
        `Motor Python encerrou (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
      );
      console.error("[core]", error.message);
      this.failReady(error);
      this.resetChild();
      this.rejectAll(error);
      this.emit("exit", error);
    });
  }

  async whenReady(): Promise<void> {
    this.ensureStarted();
    if (this.motorReady) {
      return;
    }
    if (!this.readyPromise) {
      throw new Error("Não foi possível iniciar o motor Python.");
    }
    await this.readyPromise;
  }

  stop(): void {
    if (!this.child) {
      return;
    }
    this.child.stdin.end();
    this.child.kill();
    this.resetChild();
  }

  async ping(): Promise<{ ok: boolean }> {
    await this.whenReady();
    return this.request("ping", {}) as Promise<{ ok: boolean }>;
  }

  async getVideoInfo(url: string): Promise<VideoInfo> {
    await this.whenReady();
    return this.request("getVideoInfo", { url }) as Promise<VideoInfo>;
  }

  async download(input: {
    url: string;
    format: MediaFormat;
    outputDir: string;
    requestId: string;
  }): Promise<DownloadResult> {
    await this.whenReady();
    return this.request("download", input) as Promise<DownloadResult>;
  }

  private request(method: string, params: Record<string, unknown>): Promise<unknown> {
    this.ensureStarted();
    const id = String(this.nextId++);
    const payload = JSON.stringify({ id, method, params });
    const timeoutMs = REQUEST_TIMEOUT_MS[method] ?? 60_000;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Motor sem resposta (${method}).`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      try {
        const child = this.child;
        if (!child || !child.stdin.writable) {
          this.pending.delete(id);
          clearTimeout(timer);
          reject(new Error("Motor indisponível. Reinicie o aplicativo."));
          return;
        }
        child.stdin.write(`${payload}\n`);
      } catch (error) {
        this.pending.delete(id);
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error("Falha ao falar com o motor."));
      }
    });
  }

  private ensureStarted(): void {
    if (!this.started || !this.child) {
      this.start();
    }
    if (!this.child) {
      throw new Error("Não foi possível iniciar o motor Python.");
    }
  }

  private markReady(): void {
    if (this.motorReady) {
      return;
    }
    this.motorReady = true;
    if (this.readyTimer) {
      clearTimeout(this.readyTimer);
      this.readyTimer = null;
    }
    this.readyResolve?.();
    this.readyResolve = null;
    this.readyReject = null;
  }

  private failReady(error: Error): void {
    if (this.motorReady) {
      return;
    }
    if (this.readyTimer) {
      clearTimeout(this.readyTimer);
      this.readyTimer = null;
    }
    this.readyReject?.(error);
    this.readyResolve = null;
    this.readyReject = null;
  }

  private resetChild(): void {
    this.started = false;
    this.child = null;
    this.motorReady = false;
    this.readyPromise = null;
  }

  private rejectAll(error: Error): void {
    for (const [, item] of this.pending) {
      clearTimeout(item.timer);
      item.reject(error);
    }
    this.pending.clear();
  }

  private onLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    let message: BridgeResponse;
    try {
      message = JSON.parse(trimmed) as BridgeResponse;
    } catch {
      console.error("[core] linha inválida do bridge:", trimmed.slice(0, 200));
      return;
    }

    if (message.method === "progress" && message.params) {
      this.emit("progress", message.params);
      return;
    }

    if (message.id === null || message.id === undefined) {
      return;
    }

    const pending = this.pending.get(String(message.id));
    if (!pending) {
      return;
    }
    this.pending.delete(String(message.id));
    clearTimeout(pending.timer);

    if (message.error) {
      const error = new Error(message.error.message);
      (error as Error & { code?: string }).code = message.error.code;
      pending.reject(error);
      return;
    }

    pending.resolve(message.result);
  }
}
