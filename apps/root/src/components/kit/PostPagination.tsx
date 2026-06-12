import { Text } from '@danieljoffe/shared-ui/Text';
import Button from '@/components/Button';
import { type PostPaginationData } from '@/data/contentOrder';

interface PostPaginationProps {
  pagination: PostPaginationData;
}

export function PostPagination({ pagination }: PostPaginationProps) {
  const { prev, next } = pagination;

  return (
    <nav
      aria-label='Post navigation'
      className='flex justify-between items-stretch sm:items-center gap-4 mt-10 pt-8 border-t border-border'
    >
      <Button
        as='link'
        href={prev.href}
        variant='outline'
        size='sm'
        aria-label={`Previous: ${prev.title}`}
        className='flex flex-col items-start gap-0.5 min-w-0 max-w-[48%]'
      >
        <Text variant='meta' as='span'>
          Previous
        </Text>
        <span className='truncate w-full text-left'>{prev.title}</span>
      </Button>
      <Button
        as='link'
        href={next.href}
        variant='outline'
        size='sm'
        aria-label={`Next: ${next.title}`}
        className='flex flex-col items-end gap-0.5 min-w-0 max-w-[48%] sm:ml-auto'
      >
        <Text variant='meta' as='span'>
          Next
        </Text>
        <span className='truncate w-full text-right'>{next.title}</span>
      </Button>
    </nav>
  );
}
