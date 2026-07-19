type BrandMarkProps = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 36, className }: BrandMarkProps) {
  return (
    <img
      src="/brand/spindle-icon.svg"
      alt=""
      width={size}
      height={size}
      className={className}
      draggable={false}
    />
  );
}
