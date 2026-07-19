type ThemeToggleProps = {
  theme: "light" | "dark";
  onToggle: () => void;
  disabled?: boolean;
};

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15.5 3.5a8.5 8.5 0 1 0 5 14.2A7 7 0 1 1 15.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 2.8v2.2M12 19v2.2M21.2 12h-2.2M5 12H2.8M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6M18.5 18.5l-1.6-1.6M7.1 7.1 5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ThemeToggle({ theme, onToggle, disabled }: ThemeToggleProps) {
  const toDark = theme === "light";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="btn-ghost flex h-10 w-10 items-center justify-center rounded-full border-[color:var(--border-strong)] disabled:opacity-50"
      style={{ color: "var(--accent)" }}
      aria-label={toDark ? "Ativar tema escuro" : "Ativar tema claro"}
      title={toDark ? "Tema escuro" : "Tema claro"}
    >
      {toDark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
