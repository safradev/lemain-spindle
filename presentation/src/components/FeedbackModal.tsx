import { useEffect, useRef } from "react";
import { animateFeedbackModal, stopAnimation } from "../lib/animations";
import type { Timeline } from "animejs";

export type FeedbackTone = "success" | "error";

type FeedbackModalProps = {
  tone: FeedbackTone;
  title: string;
  message: string;
  detail?: string | null;
  onClose: () => void;
};

export function FeedbackModal({
  tone,
  title,
  message,
  detail = null,
  onClose,
}: FeedbackModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Timeline | null>(null);

  useEffect(() => {
    if (!overlayRef.current || !cardRef.current || !iconRef.current) {
      return;
    }
    stopAnimation(animationRef.current);
    animationRef.current = animateFeedbackModal({
      overlay: overlayRef.current,
      card: cardRef.current,
      icon: iconRef.current,
      burst: burstRef.current,
      tone,
    });
    return () => stopAnimation(animationRef.current);
  }, [tone, title]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isSuccess = tone === "success";

  return (
    <div
      ref={overlayRef}
      className="feedback-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
      aria-describedby="feedback-message"
      onClick={onClose}
      style={{ opacity: 0 }}
    >
      <div
        ref={cardRef}
        className="feedback-card surface-panel"
        data-tone={tone}
        onClick={(event) => event.stopPropagation()}
        style={{ opacity: 0, transform: "translateY(18px) scale(0.96)" }}
      >
        <div ref={burstRef} className="feedback-burst" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} className="feedback-spark" data-index={index} />
          ))}
        </div>

        <div
          ref={iconRef}
          className="feedback-icon"
          data-tone={tone}
          aria-hidden="true"
        >
          {isSuccess ? (
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="2" opacity="0.35" />
              <path
                className="feedback-check"
                d="M11 18.5 15.8 23 25 13.5"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="2" opacity="0.35" />
              <path
                d="M18 11.5v9"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <circle cx="18" cy="24.5" r="1.5" fill="currentColor" />
            </svg>
          )}
        </div>

        <h2
          id="feedback-title"
          className="mt-5 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          {title}
        </h2>
        <p
          id="feedback-message"
          className="mt-2 text-sm leading-relaxed"
          style={{ color: "var(--ink-soft)" }}
        >
          {message}
        </p>
        {detail ? (
          <p
            className="mt-3 truncate rounded-2xl px-3 py-2 font-[family-name:var(--font-mono)] text-xs"
            style={{
              background: "var(--surface-muted)",
              color: isSuccess ? "var(--accent)" : "var(--danger)",
            }}
            title={detail}
          >
            {detail}
          </p>
        ) : null}

        <button
          type="button"
          className="btn-primary mt-6 w-full px-5 py-3"
          onClick={onClose}
        >
          {isSuccess ? "Continuar" : "Entendi"}
        </button>
      </div>
    </div>
  );
}
