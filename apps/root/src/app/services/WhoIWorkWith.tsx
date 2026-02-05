import { Stack, PageContainer, Section } from '@danieljoffe.com/shared-ui';

const audiences = [
  {
    label: 'Founders',
    description: 'who need a senior frontend partner, not just a pair of hands',
  },
  {
    label: 'Growing startups',
    description: 'whose engineering team is stretched thin',
  },
  {
    label: 'Agencies',
    description:
      'that need overflow capacity from someone who can own a project end-to-end',
  },
  {
    label: 'Non-technical teams',
    description: 'drowning in engineering dependency for basic updates',
  },
];

export default function WhoIWorkWith() {
  return (
    <Section
      aria-labelledby='who-i-work-with-heading'
      className='min-h-min max-h-max'
    >
      <PageContainer className='max-w-[40rem]'>
        <h2 id='who-i-work-with-heading' className='text-center'>
          Who I Work Best With
        </h2>
        <Stack as='ul' direction='vertical' gap='sm' className='list-none'>
          {audiences.map((audience, index) => (
            <li key={index}>
              <p>
                <strong className='font-bold'>{audience.label}</strong>{' '}
                {audience.description}
              </p>
            </li>
          ))}
        </Stack>
      </PageContainer>
    </Section>
  );
}
