import Image from 'next/image';
import { cn } from '@/lib/cn';

type CompanyLogoSize = 'sm' | 'md' | 'lg';

const sizeStyles: Record<CompanyLogoSize, { container: string; img: number }> =
  {
    sm: { container: 'h-8 w-8 p-1.5', img: 20 },
    md: { container: 'h-10 w-10 p-2', img: 28 },
    lg: { container: 'h-14 w-14 p-2', img: 40 },
  };

export function CompanyLogo({
  src,
  alt,
  size = 'md',
  highlight = false,
}: {
  src: string;
  alt: string;
  size?: CompanyLogoSize;
  highlight?: boolean;
}) {
  const { container, img } = sizeStyles[size];
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl bg-white border overflow-hidden shrink-0',
        container,
        highlight ? 'border-brand-500' : 'border-border'
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={img}
        height={img}
        className='object-contain'
        unoptimized
        decoding='async'
      />
    </div>
  );
}
