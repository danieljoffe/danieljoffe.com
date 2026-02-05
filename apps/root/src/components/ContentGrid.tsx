import { Grid } from '@danieljoffe.com/shared-ui';
import { WChildrenT } from '@/types/base';

export default function ContentGrid({ children }: WChildrenT) {
  return (
    <Grid
      as='ul'
      cols={2}
      gap='lg'
      className='list-none md:grid-rows-2 max-w-[30rem] mx-auto md:max-w-full min-w-min'
    >
      {children}
    </Grid>
  );
}
