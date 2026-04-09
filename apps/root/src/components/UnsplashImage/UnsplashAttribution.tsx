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
      <Button
        as='link'
        variant='secondary'
        size='sm'
        href={`${UNSPLASH_URL}/${creator}`}
        target='_blank'
        rel='noopener noreferrer'
        aria-label={`Photo by ${creator} on Unsplash`}
      >
        {creator}
      </Button>
    </figcaption>
  );
}
