import { Grid, cn } from '@danieljoffe.com/shared-ui';
import { WithChildren } from '@/types/base';

export default function ContentGrid({
  children,
  className,
}: WithChildren & { className?: string }) {
  return (
    <Grid
      as='ul'
      cols={2}
      gap='lg'
      className={cn(
        'list-none max-w-[30rem] mx-auto md:max-w-full min-w-min',
        className
      )}
    >
      {children}
    </Grid>
  );
}
