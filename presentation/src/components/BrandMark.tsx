type BrandMarkProps = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 36, className }: BrandMarkProps) {
  const src = `${import.meta.env.BASE_URL}brand/spindle-icon.svg`;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      draggable={false}
    />
  );
}
