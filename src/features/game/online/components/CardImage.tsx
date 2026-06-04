import Image from "next/image";

export function CardImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={420}
      height={600}
      unoptimized
      className={className}
    />
  );
}
