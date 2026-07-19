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
};

type BridgeResponse = {
  id?: string | number | null;
  result?: unknown;
  error?: BridgeError;
  method?: string;
  params?: ProgressEvent;
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

export class CoreBridge extends EventEmitter {
  private child: ChildProcessWithoutNullStreams | null = null;
  private pending = new Map<string, Pending>();
  private nextId = 1;
  private started = false;
  private readonly root: string;

  constructor(root = repoRootFromMain()) {
    super();
    this.root = root;
  }

  start(): void {
    if (this.started) {
      return;
    }

    const python = resolvePythonBinary(this.root);
    this.child = spawn(python, ["-m", "core.bridge.stdio_server"], {
      cwd: this.root,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
        PYTHONPATH: this.root,
      },
    });
    this.started = true;

    const stdout = createInterface({ input: this.child.stdout, crlfDelay: Infinity });
    stdout.on("line", (line) => this.onLine(line));

    this.child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8").trim();
      if (text) {
        console.error(`[core] ${text}`);
      }
    });

    this.child.on("exit", (code, signal) => {
      this.started = false;
      this.child = null;
      const error = new Error(
        `Motor Python encerrou (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
      );
      for (const [, item] of this.pending) {
        item.reject(error);
      }
      this.pending.clear();
      this.emit("exit", error);
    });
  }

  stop(): void {
    if (!this.child) {
      return;
    }
    this.child.stdin.end();
    this.child.kill();
    this.child = null;
    this.started = false;
  }

  ping(): Promise<{ ok: boolean }> {
    return this.request("ping", {}) as Promise<{ ok: boolean }>;
  }

  getVideoInfo(url: string): Promise<VideoInfo> {
    return this.request("getVideoInfo", { url }) as Promise<VideoInfo>;
  }

  download(input: {
    url: string;
    format: MediaFormat;
    outputDir: string;
    requestId: string;
  }): Promise<DownloadResult> {
    return this.request("download", input) as Promise<DownloadResult>;
  }

  private request(method: string, params: Record<string, unknown>): Promise<unknown> {
    this.ensureRunning();
    const id = String(this.nextId++);
    const payload = JSON.stringify({ id, method, params });

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try {
        this.child!.stdin.write(`${payload}\n`);
      } catch (error) {
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error("Falha ao falar com o motor."));
      }
    });
  }

  private ensureRunning(): void {
    if (!this.started || !this.child) {
      this.start();
    }
    if (!this.child) {
      throw new Error("Não foi possível iniciar o motor Python.");
    }
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

    if (message.error) {
      const error = new Error(message.error.message);
      (error as Error & { code?: string }).code = message.error.code;
      pending.reject(error);
      return;
    }

    pending.resolve(message.result);
  }
}
