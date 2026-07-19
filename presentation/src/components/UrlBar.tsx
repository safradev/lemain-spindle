import { type FormEvent, useEffect, useRef } from "react";
import { animateBusyPulse, stopAnimation } from "../lib/animations";
import type { JSAnimation } from "animejs";

type UrlBarProps = {
  value: string;
  onChange: (value: string) => void;
  onValidate: () => void;
  disabled?: boolean;
};

export function UrlBar({ value, onChange, onValidate, disabled }: UrlBarProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const animationRef = useRef<JSAnimation | null>(null);

  useEffect(() => {
    return () => stopAnimation(animationRef.current);
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (disabled) {
      return;
    }
    if (buttonRef.current) {
      stopAnimation(animationRef.current);
      animationRef.current = animateBusyPulse(buttonRef.current);
    }
    onValidate();
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch">
      <input
        type="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder="Cole o link do YouTube"
        className="field-input min-w-0 flex-1 rounded-full px-5 py-3.5 outline-none disabled:opacity-60"
      />
      <button
        ref={buttonRef}
        type="submit"
        disabled={disabled || !value.trim()}
        className="btn-primary px-6 py-3.5 disabled:opacity-45"
      >
        Validar →
      </button>
    </form>
  );
}
