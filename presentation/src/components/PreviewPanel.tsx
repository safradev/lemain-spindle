import { useEffect, useRef, useState } from "react";
import type { VideoInfo } from "../types/spindle";
import { animatePreviewIn, stopAnimation } from "../lib/animations";
import type { JSAnimation } from "animejs";

type PreviewPanelProps = {
  video: VideoInfo | null;
  placeholder: string;
  onExtract: () => void;
  extractEnabled: boolean;
};

const DEV_PREVIEW: VideoInfo = {
  videoId: "dev-preview",
  title: "Engenharia modular em produção — Lemain Labs",
  channel: "Lemain Labs",
  durationSeconds: 768,
  durationLabel: "12:48",
  webpageUrl: "https://www.youtube.com/watch?v=dev",
  embedUrl: "https://www.youtube.com/embed/dev",
  thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
};

function readDevPreviewFlag(): boolean {
  return import.meta.env.DEV && window.location.hash === "#preview";
}

export function PreviewPanel({
  video,
  placeholder,
  onExtract,
  extractEnabled,
}: PreviewPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<JSAnimation | null>(null);
  const [showDevPreview, setShowDevPreview] = useState(readDevPreviewFlag);
  const resolved = video ?? (showDevPreview ? DEV_PREVIEW : null);

  useEffect(() => {
    const sync = () => setShowDevPreview(readDevPreviewFlag());
    window.addEventListener("hashchange", sync);
    sync();
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (!resolved || !panelRef.current) {
      return;
    }
    stopAnimation(animationRef.current);
    animationRef.current = animatePreviewIn(panelRef.current);
    return () => stopAnimation(animationRef.current);
  }, [resolved?.videoId]);

  if (!resolved) {
    return (
      <div
        className="surface-panel relative flex min-h-56 flex-col items-center justify-center gap-3 overflow-hidden rounded-[28px] px-6 text-center"
        style={{
          borderStyle: "dashed",
          color: "var(--ink-soft)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(420px circle at 50% 40%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 70%)",
          }}
        />
        <div
          className="preview-pulse relative flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M8 6.5v11l9-5.5-9-5.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
          </svg>
        </div>
        <p className="relative max-w-sm text-sm leading-relaxed">{placeholder}</p>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="surface-panel overflow-hidden rounded-[28px]"
      style={{ opacity: 0 }}
    >
      <div className="grid gap-0 md:grid-cols-[280px_1fr]">
        <div
          className="relative min-h-44 overflow-hidden"
          style={{ background: "var(--surface-muted)" }}
        >
          {resolved.thumbnailUrl ? (
            <img
              src={resolved.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,110,0,0.18), transparent 45%, rgba(7,4,3,0.25))",
            }}
          />
        </div>
        <div className="flex flex-col justify-between gap-5 p-5 md:p-6">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--accent)" }}
            >
              Prévia
            </p>
            <h2
              className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              {resolved.title}
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>
              {resolved.channel}
              <span className="mx-2 opacity-40">·</span>
              <span className="font-[family-name:var(--font-mono)] text-[13px]">
                {resolved.durationLabel}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onExtract}
            disabled={!extractEnabled && !showDevPreview}
            className="btn-primary self-start px-6 py-3 disabled:opacity-45"
          >
            Extrair →
          </button>
        </div>
      </div>
    </div>
  );
}
