import { Text } from '@danieljoffe/shared-ui/Text';
import Button from '@/components/Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  namePrefix: string;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  namePrefix,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className='flex flex-row justify-between items-center mt-4'>
      <Button
        variant='outline'
        size='sm'
        name={`${namePrefix}-previous-page`}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <Text variant='body' as='span'>
        Page {page} of {totalPages}
      </Text>
      <Button
        variant='outline'
        size='sm'
        name={`${namePrefix}-next-page`}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
