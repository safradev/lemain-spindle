import { useCallback, useEffect, useRef, useState } from "react";
import { toUserFacingError } from "../lib/userFacingError";
import type {
  DownloadResult,
  MediaFormat,
  ProgressEvent,
  VideoInfo,
} from "../types/spindle";

type CoreState = {
  ready: boolean;
  busy: boolean;
  video: VideoInfo | null;
  progress: { percent: number; status: string };
  error: string | null;
  notice: string | null;
  lastResult: DownloadResult | null;
};

export function useCore() {
  const [state, setState] = useState<CoreState>({
    ready: false,
    busy: false,
    video: null,
    progress: { percent: 0, status: "Pronto" },
    error: null,
    notice: null,
    lastResult: null,
  });
  const progressRequestId = useRef<string | null>(null);

  useEffect(() => {
    if (!window.spindle) {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const connect = () => {
      void window.spindle.ping().then(
        () => {
          if (!cancelled) {
            setState((current) => ({ ...current, ready: true, notice: null, error: null }));
          }
        },
        (error: unknown) => {
          if (cancelled) {
            return;
          }
          attempts += 1;
          if (attempts < 8) {
            window.setTimeout(connect, 400 * attempts);
            return;
          }
          setState((current) => ({
            ...current,
            ready: false,
            error: toUserFacingError(error),
          }));
        },
      );
    };

    connect();

    const unsubscribe = window.spindle.onProgress((event: ProgressEvent) => {
      if (
        progressRequestId.current &&
        event.requestId !== progressRequestId.current
      ) {
        return;
      }
      setState((current) => ({
        ...current,
        progress: { percent: event.percent, status: event.status },
      }));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const validate = useCallback(async (url: string) => {
    setState((current) => ({
      ...current,
      busy: true,
      error: null,
      notice: null,
      lastResult: null,
      video: null,
      progress: { percent: 0, status: "Validando vídeo..." },
    }));
    try {
      const video = await window.spindle.getVideoInfo(url);
      setState((current) => ({
        ...current,
        busy: false,
        video,
        progress: { percent: 0, status: "Vídeo validado" },
      }));
      return video;
    } catch (error) {
      setState((current) => ({
        ...current,
        busy: false,
        video: null,
        error: toUserFacingError(error),
        progress: { percent: 0, status: "Falha na validação" },
      }));
      return null;
    }
  }, []);

  const extract = useCallback(
    async (input: { url: string; format: MediaFormat; outputDir: string }) => {
      const requestId = `dl-${Date.now()}`;
      progressRequestId.current = requestId;
      setState((current) => ({
        ...current,
        busy: true,
        error: null,
        notice: null,
        lastResult: null,
        progress: { percent: 0, status: "Iniciando extração..." },
      }));
      try {
        const result = await window.spindle.download({ ...input, requestId });
        setState((current) => ({
          ...current,
          busy: false,
          lastResult: result,
          progress: { percent: 100, status: "Concluído" },
        }));
        return result;
      } catch (error) {
        setState((current) => ({
          ...current,
          busy: false,
          error: toUserFacingError(error),
          progress: { percent: 0, status: "Falha na extração" },
        }));
        return null;
      } finally {
        progressRequestId.current = null;
      }
    },
    [],
  );

  const clearFeedback = useCallback(() => {
    setState((current) => ({
      ...current,
      error: null,
      lastResult: null,
      notice: null,
    }));
  }, []);

  return { ...state, validate, extract, clearFeedback };
}
