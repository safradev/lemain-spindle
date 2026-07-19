export function Atmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="atmosphere-glow" />
      <div className="atmosphere-glow-secondary" />
      <div className="atmosphere-grid" />
      <div className="atmosphere-particles" />
      <img
        src="/brand/lemain-mark.svg"
        alt=""
        className="atmosphere-watermark"
        draggable={false}
      />
    </div>
  );
}
