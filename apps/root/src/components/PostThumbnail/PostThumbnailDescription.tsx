import { PostBase } from '@/types/postTypes';
import { Badge, Stack } from '@danieljoffe.com/shared-ui';

interface PostThumbnailDescriptionProps extends Pick<
  PostBase,
  'title' | 'description'
> {
  duration?: string;
  role?: string;
}

export default function PostThumbnailDescription({
  title,
  description,
  duration,
  role,
}: PostThumbnailDescriptionProps) {
  return (
    <div
      className={[
        'flex flex-col flex-1',
        'bg-card text-card-foreground',
        'px-4 pt-4 pb-6',
      ].join(' ')}
    >
      <h3 className=''>{title}</h3>
      {role && duration && (
        <Stack as='p' direction='horizontal'>
          <Badge variant='accent'>{role}</Badge>
          <Badge>{duration}</Badge>
        </Stack>
      )}
      <p className='text-sm'>{description}</p>
    </div>
  );
}
