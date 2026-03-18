import { UNSPLASH_URL } from '@/utils/constants';
import Button from '@/components/Button';

export interface UnsplashAttributionProps {
  creator: `@${string}`;
}

export default function UnsplashAttribution({
  creator,
}: UnsplashAttributionProps) {
  return (
    <figcaption className='absolute bottom-2 right-2'>
      <p className='bg-surface/85 text-text-primary text-xs rounded-md px-2 py-1 whitespace-nowrap'>
        <Button
          as='link'
          variant='bare'
          size='sm'
          href={`${UNSPLASH_URL}/${creator}`}
          target='_blank'
          rel='noopener noreferrer'
          aria-label={`Photo by ${creator} on Unsplash`}
        >
          {creator},
        </Button>
      </p>
    </figcaption>
  );
}
