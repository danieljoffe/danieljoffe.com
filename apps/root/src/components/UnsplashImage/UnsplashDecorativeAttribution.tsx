import { UnsplashAttributionProps } from './UnsplashAttribution';

export default function UnsplashDecorativeAttribution({
  creator,
}: UnsplashAttributionProps) {
  return (
    <span
      className={[
        'absolute bottom-2 right-2',
        'bg-surface/75 text-text-primary text-xs rounded-md px-2 py-1',
        'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
        'transition-opacity duration-200',
        'pointer-events-none',
      ].join(' ')}
      aria-hidden='true'
    >
      unsplash{creator}
    </span>
  );
}
