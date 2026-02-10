import Image from 'next/image';
import { EXPERIENCE_LINK } from '@/utils/base';
import { experienceFull, experiencePageSlugs } from '@/data/experience';
import Button from '@/components/Button';
import ContentGrid from '@/components/ContentGrid';
import { Card, GridItem, Stack } from '@danieljoffe.com/shared-ui';

export default function FullTimeline() {
  return (
    <>
      <h3 className='text-center'>Detailed Professional Journey</h3>
      <ContentGrid>
        {experiencePageSlugs.map(slug => {
          const company = experienceFull[slug] ?? {};

          return (
            <GridItem as='li' key={company.slug}>
              <Card className='flex w-full' padding='none' elevated>
                <Button
                  as='link'
                  variant='bare'
                  size='lg'
                  className='w-full hover:text-accent hover:shadow-lg/30'
                  href={`${EXPERIENCE_LINK.href}/${company.slug}`}
                  aria-label={`View details for ${company.company}`}
                >
                  <Stack direction='horizontal' className='flex-1'>
                    <div className='flex w-full max-w-[4.5rem] h-[4.5rem] p-2 md:p-[.75rem] bg-background-elevated rounded-[50%] justify-center items-center'>
                      <Image
                        src={company.logo}
                        alt={company.company}
                        width={40}
                        height={40}
                        sizes='(max-width: 640px) 3rem, 3.5rem'
                        unoptimized={true}
                        fetchPriority='low'
                        priority={false}
                        loading='lazy'
                        decoding='async'
                        className={[
                          'max-h-max w-[3rem]',
                          company.invert
                            ? 'dark:invert dark:brightness-200'
                            : '',
                        ].join(' ')}
                      />
                    </div>

                    <div className='flex-1'>
                      <h4>{company.company}</h4>
                      <p>{company.role}</p>
                    </div>
                  </Stack>
                </Button>
              </Card>
            </GridItem>
          );
        })}
      </ContentGrid>
    </>
  );
}
