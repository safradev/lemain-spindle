import { useEffect, useRef, useState } from "react";
import { Atmosphere } from "./components/Atmosphere";
import { BrandMark } from "./components/BrandMark";
import { FeedbackModal } from "./components/FeedbackModal";
import { FolderPicker } from "./components/FolderPicker";
import { FormatPicker } from "./components/FormatPicker";
import { PreviewPanel } from "./components/PreviewPanel";
import { ProgressPanel } from "./components/ProgressPanel";
import { ThemeToggle } from "./components/ThemeToggle";
import { UrlBar } from "./components/UrlBar";
import { useCore } from "./hooks/useCore";
import { useTheme } from "./hooks/useTheme";
import { animateShellEnter, animateThemeFlash, stopAnimation } from "./lib/animations";
import type { MediaFormat } from "./types/spindle";
import type { Timeline } from "animejs";

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const {
    busy,
    video,
    progress,
    error,
    lastResult,
    validate,
    extract,
    ready,
    clearFeedback,
  } = useCore();
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<MediaFormat>("mp4");
  const [outputDir, setOutputDir] = useState("");
  const shellRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const themeAnimationRef = useRef<Timeline | null>(null);
  const enterAnimationRef = useRef<Timeline | null>(null);

  useEffect(() => {
    if (!window.spindle) {
      return;
    }
    void window.spindle.getDefaultOutputDir().then(setOutputDir);
  }, []);

  useEffect(() => {
    if (!stageRef.current) {
      return;
    }
    const items = stageRef.current.querySelectorAll("[data-enter]");
    stopAnimation(enterAnimationRef.current);
    enterAnimationRef.current = animateShellEnter(items);
    return () => stopAnimation(enterAnimationRef.current);
  }, []);

  useEffect(() => {
    return () => stopAnimation(themeAnimationRef.current);
  }, []);

  const handleThemeToggle = () => {
    if (shellRef.current) {
      stopAnimation(themeAnimationRef.current);
      themeAnimationRef.current = animateThemeFlash(shellRef.current);
    }
    toggleTheme();
  };

  const handleValidate = () => {
    void validate(url);
  };

  const handleExtract = () => {
    if (!video || !outputDir) {
      return;
    }
    void extract({
      url: video.webpageUrl,
      format,
      outputDir,
    });
  };

  const placeholder = busy && !video ? "Validando vídeo..." : "Cole um link e valide para ver a prévia.";

  const feedback = lastResult
    ? {
        tone: "success" as const,
        title: "Extração concluída",
        message: "Sua mídia está pronta. O Spindle enrolou o arquivo no destino escolhido.",
        detail: lastResult.outputPath,
      }
    : error
      ? {
          tone: "error" as const,
          title: "Não deu certo",
          message: error,
          detail: null,
        }
      : null;

  return (
    <div ref={shellRef} className="app-shell">
      <Atmosphere />
      <div
        ref={stageRef}
        className="app-content mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-9 sm:px-8 sm:py-11"
      >
        <header data-enter className="mb-9 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              <BrandMark
                size={52}
                className="shrink-0 rounded-[14px] shadow-[0_14px_36px_rgba(255,110,0,0.28)]"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="status-dot" aria-hidden="true" />
                  <div className="leading-none">
                    <p
                      className="font-[family-name:var(--font-display)] text-[11px] font-bold uppercase tracking-[0.28em]"
                      style={{ color: "var(--ink)" }}
                    >
                      Lemain
                    </p>
                    <p
                      className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.34em]"
                      style={{ color: "var(--accent)" }}
                    >
                      Labs
                    </p>
                  </div>
                </div>
                <h1
                  className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl"
                  style={{ color: "var(--ink)" }}
                >
                  Spindle
                </h1>
              </div>
            </div>
            <p
              className="mt-3 max-w-md text-sm leading-relaxed sm:pl-[4.25rem]"
              style={{ color: "var(--ink-soft)" }}
            >
              Do link ao arquivo — Spindle enrola o YouTube em MP4 ou MP3.
            </p>
          </div>
          <ThemeToggle theme={theme} onToggle={handleThemeToggle} disabled={busy} />
        </header>

        <main className="flex flex-1 flex-col gap-6">
          <div data-enter>
            <UrlBar
              value={url}
              onChange={setUrl}
              onValidate={handleValidate}
              disabled={busy || !ready}
            />
          </div>

          <div data-enter>
            <PreviewPanel
              video={video}
              placeholder={placeholder}
              onExtract={handleExtract}
              extractEnabled={Boolean(video) && !busy && Boolean(outputDir)}
            />
          </div>

          <div data-enter className="grid items-stretch gap-4 sm:grid-cols-2">
            <FormatPicker value={format} onChange={setFormat} disabled={busy} />
            <FolderPicker value={outputDir} onChange={setOutputDir} disabled={busy} />
          </div>

          <div data-enter>
            <ProgressPanel percent={progress.percent} status={progress.status} />
          </div>
        </main>

        <footer
          data-enter
          className="mt-10 mb-2 flex items-center justify-between gap-3 border-t pt-5 text-[11px] tracking-[0.02em]"
          style={{ borderColor: "var(--border)", color: "var(--ink-soft)" }}
        >
          <span className="max-w-[28rem] leading-relaxed">
            Software sob medida e engenharia sênior para operações críticas.
          </span>
          <a
            href="https://lemain-labs.com"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 font-[family-name:var(--font-mono)] transition hover:opacity-80"
            style={{ color: "var(--ink-soft)" }}
          >
            lemain-labs.com
          </a>
        </footer>
      </div>

      {feedback ? (
        <FeedbackModal
          tone={feedback.tone}
          title={feedback.title}
          message={feedback.message}
          detail={feedback.detail}
          onClose={clearFeedback}
        />
      ) : null}
    </div>
  );
}
