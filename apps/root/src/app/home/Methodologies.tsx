import {
  Stack,
  PageContainer,
  Section,
  Card,
  GridItem,
} from '@danieljoffe.com/shared-ui';
import ContentGrid from '@/components/ContentGrid';
import { offerings } from '@/data/offerings';
import {
  Search,
  Rocket,
  BarChart3,
  Sprout,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Search,
  Rocket,
  BarChart3,
  Sprout,
};

export default function Methodologies() {
  return (
    <Section
      aria-labelledby='methodologies-heading'
      className='min-h-min max-h-max'
      background='alt'
    >
      <PageContainer>
        <Stack gap='md'>
          <h2 className='text-center' id='methodologies-heading'>
            My Methodology
          </h2>
          <ContentGrid>
            {offerings.methodology.map((methodology, index) => (
              <GridItem as='li' key={index} className='flex'>
                <Card elevated padding='lg'>
                  <Stack direction='vertical' gap='md' align='center'>
                    {(() => {
                      const Icon = iconMap[methodology.icon];
                      return Icon ? (
                        <Icon
                          className='size-6 text-accent shrink-0'
                          absoluteStrokeWidth={true}
                        />
                      ) : null;
                    })()}
                    <div>
                      <h3>{methodology.title}</h3>
                      <p>{methodology.text}</p>
                    </div>
                  </Stack>
                </Card>
              </GridItem>
            ))}
          </ContentGrid>
        </Stack>
      </PageContainer>
    </Section>
  );
}
