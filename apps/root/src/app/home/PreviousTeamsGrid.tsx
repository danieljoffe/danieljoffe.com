import Image from 'next/image';
import { experienceFull } from '@/data/experience';
import { EXPERIENCE_LINK } from '@/utils/constants';
import { Stack, Grid } from '@danieljoffe.com/shared-ui';
import CompanyLink from './CompanyLink';

const companies = Object.values(experienceFull);

export default function PreviousTeamsGrid() {
  return (
    <Grid
      as='ul'
      cols={0}
      className='grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
    >
      {companies.map(company => (
        <li
          className='flex flex-1 justify-center opacity-70 hover:opacity-100 transition-opacity'
          key={company.slug}
        >
          <CompanyLink
            href={`${EXPERIENCE_LINK.href}/${company.slug}`}
            slug={company.slug}
            company={company.company}
          >
            <Stack
              direction='horizontal'
              gap='sm'
              align='center'
              justify='center'
              className='w-full h-full'
            >
              <Image
                className={[
                  'w-full h-full max-w-[6.25rem] max-h-[3.25rem] object-contain flex-1',
                  company.invert ? 'dark:invert dark:brightness-200' : '',
                ].join(' ')}
                src={company.logo}
                alt={company.company}
                width={100}
                height={50}
                sizes='(max-width: 640px) 5rem, (max-width: 768px) 6rem, 7rem'
                unoptimized={true}
                decoding='async'
              />
            </Stack>
          </CompanyLink>
        </li>
      ))}
    </Grid>
  );
}
