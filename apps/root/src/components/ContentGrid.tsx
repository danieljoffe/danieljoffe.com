import { Grid } from '@danieljoffe.com/shared-ui';
import { WithChildren } from '@/types/base';

export default function ContentGrid({ children }: WithChildren) {
  return (
    <Grid
      as='ul'
      cols={2}
      gap='lg'
      className='list-none max-w-[30rem] mx-auto md:max-w-full min-w-min'
    >
      {children}
    </Grid>
  );
}
