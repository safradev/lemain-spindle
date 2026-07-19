export type MediaFormat = "mp4" | "mp3";

export type VideoInfo = {
  videoId: string;
  title: string;
  channel: string;
  durationSeconds: number;
  durationLabel: string;
  thumbnailUrl: string;
  webpageUrl: string;
  embedUrl: string;
};

export type DownloadResult = {
  outputPath: string;
  title: string;
  mediaFormat: MediaFormat;
};

export type ProgressEvent = {
  requestId: string;
  percent: number;
  status: string;
};

export type BridgeError = {
  code: string;
  message: string;
};

export type SpindleApi = {
  getVideoInfo: (url: string) => Promise<VideoInfo>;
  download: (input: {
    url: string;
    format: MediaFormat;
    outputDir: string;
    requestId: string;
  }) => Promise<DownloadResult>;
  onProgress: (handler: (event: ProgressEvent) => void) => () => void;
  pickOutputDir: (current?: string) => Promise<string | null>;
  getDefaultOutputDir: () => Promise<string>;
  ping: () => Promise<{ ok: boolean }>;
};
