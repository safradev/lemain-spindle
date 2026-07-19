type FolderPickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.2 4.2A1.4 1.4 0 0 1 3.6 2.8h3.1l1.2 1.3h4.5A1.4 1.4 0 0 1 13.8 5.5v6.3a1.4 1.4 0 0 1-1.4 1.4H3.6A1.4 1.4 0 0 1 2.2 11.8V4.2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FolderPicker({ value, onChange, disabled }: FolderPickerProps) {
  const handlePick = async () => {
    if (!window.spindle || disabled) {
      return;
    }
    const next = await window.spindle.pickOutputDir(value);
    if (next) {
      onChange(next);
    }
  };

  return (
    <div className="flex h-full flex-col gap-2.5">
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: "var(--ink-soft)" }}
      >
        Destino
      </span>
      <div className="flex min-h-[4.75rem] flex-1 items-stretch gap-2">
        <div
          className="field-input flex min-w-0 flex-1 items-center truncate rounded-[18px] px-4 text-sm"
          style={{ color: "var(--ink-soft)" }}
          title={value}
        >
          {value || "Nenhuma pasta selecionada"}
        </div>
        <button
          type="button"
          onClick={() => void handlePick()}
          disabled={disabled}
          className="btn-ghost inline-flex items-center gap-2 rounded-[18px] px-4 font-medium disabled:opacity-50"
          aria-label="Escolher pasta de destino"
        >
          <FolderIcon />
          <span>Escolher</span>
        </button>
      </div>
    </div>
  );
}
