import type { MediaFormat } from "../types/spindle";

type FormatPickerProps = {
  value: MediaFormat;
  onChange: (value: MediaFormat) => void;
  disabled?: boolean;
};

const OPTIONS: {
  value: MediaFormat;
  label: string;
  hint: string;
  icon: "video" | "audio";
}[] = [
  { value: "mp4", label: "MP4", hint: "Vídeo", icon: "video" },
  { value: "mp3", label: "MP3", hint: "Áudio", icon: "audio" },
];

function FormatIcon({ kind }: { kind: "video" | "audio" }) {
  if (kind === "audio") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M6 11.5V4.8l6-1.3v6.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="4.8" cy="11.5" r="1.7" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="10.8" cy="10" r="1.7" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.2" y="3.5" width="11.6" height="9" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.8 6.2v3.6L9.8 8 6.8 6.2Z" fill="currentColor" />
    </svg>
  );
}

export function FormatPicker({ value, onChange, disabled }: FormatPickerProps) {
  return (
    <div className="flex h-full flex-col gap-2.5">
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: "var(--ink-soft)" }}
      >
        Formato
      </span>
      <div className="grid flex-1 grid-cols-2 gap-2">
        {OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              data-selected={selected}
              onClick={() => onChange(option.value)}
              className="format-option px-4 py-3.5 text-left disabled:opacity-50"
              aria-pressed={selected}
            >
              <span className="mb-1.5 flex items-center gap-2" style={{ color: selected ? "var(--accent)" : "var(--ink-soft)" }}>
                <FormatIcon kind={option.icon} />
              </span>
              <span className="block font-[family-name:var(--font-display)] text-base font-semibold">
                {option.label}
              </span>
              <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
