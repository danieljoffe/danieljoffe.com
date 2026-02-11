import {
  Check,
  Rocket,
  Wrench,
  FileText,
  Monitor,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Rocket,
  Wrench,
  FileText,
  Monitor,
};
import {
  Card,
  Badge,
  Stack,
  PageContainer,
  Section,
  Grid,
  GridItem,
} from '@danieljoffe.com/shared-ui';
import { services } from '@/data/services';

export default function ServicesGrid() {
  return (
    <Section
      aria-labelledby='services-grid-heading'
      className='min-h-min max-h-max'
    >
      <PageContainer>
        <h2 id='services-grid-heading' className='sr-only'>
          Services
        </h2>
        <Grid as='ul' cols={1} gap='lg' className='md:grid-cols-2'>
          {services.map((service, index) => (
            <GridItem key={index} as='li'>
              <Card padding='lg' elevated className='h-full flex flex-col'>
                <Stack direction='vertical' gap='md' className='flex-1'>
                  <div className='flex flex-col gap-2 items-start'>
                    <Stack
                      direction='horizontal'
                      gap='sm'
                      align='center'
                      className='w-full'
                    >
                      {(() => {
                        const Icon = iconMap[service.icon];
                        return Icon ? (
                          <Icon
                            className='size-6 text-accent shrink-0'
                            absoluteStrokeWidth={true}
                            aria-hidden='true'
                          />
                        ) : null;
                      })()}
                      <h3 className='!mb-0'>{service.title}</h3>
                    </Stack>
                    {service.highlighted && (
                      <p className='w-full text-center'>
                        <Badge variant='accent' className='w-fit'>
                          Most popular
                        </Badge>
                      </p>
                    )}
                  </div>
                  <p>{service.description}</p>
                  <div className='flex-1'>
                    <p className='font-bold mb-2'>What you get:</p>
                    <ul className='space-y-2'>
                      {service.deliverables.map((item, i) => (
                        <li key={i} className='text-sm flex items-start gap-2'>
                          <Check
                            className='size-4 text-success shrink-0 mt-0.5'
                            aria-hidden='true'
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className='text-sm italic border-l-2 border-l-accent pl-3'>
                    {service.proof}
                  </p>
                  <Stack
                    direction='horizontal'
                    gap='md'
                    className='pt-4 border-t border-border'
                  >
                    <p className='text-sm whitespace-nowrap'>
                      <strong>Timeline:</strong> {service.timeline}
                    </p>
                    <p className='text-sm whitespace-nowrap'>
                      <strong>Starting at:</strong> {service.price}
                    </p>
                  </Stack>
                </Stack>
              </Card>
            </GridItem>
          ))}
        </Grid>
      </PageContainer>
    </Section>
  );
}
