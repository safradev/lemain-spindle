export function Atmosphere() {
  const watermarkSrc = `${import.meta.env.BASE_URL}brand/lemain-mark.svg`;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="atmosphere-glow" />
      <div className="atmosphere-glow-secondary" />
      <div className="atmosphere-grid" />
      <div className="atmosphere-particles" />
      <img
        src={watermarkSrc}
        alt=""
        className="atmosphere-watermark"
        draggable={false}
      />
    </div>
  );
}
