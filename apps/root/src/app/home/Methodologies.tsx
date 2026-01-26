import { Stack, PageContainer, Section, Card } from '@danieljoffe.com/ui';
import ContentGrid from '@/components/ContentGrid';
import { offerings } from '@/utils/offerings';

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
              <Card key={index} elevated padding='lg'>
                <Stack
                  direction='vertical'
                  gap='md'
                  align='center'
                  className='text-center'
                >
                  <p className='text-2xl'>{methodology.icon}</p>
                  <div>
                    <h3>{methodology.title}</h3>
                    <p>{methodology.text}</p>
                  </div>
                </Stack>
              </Card>
            ))}
          </ContentGrid>
        </Stack>
      </PageContainer>
    </Section>
  );
}
