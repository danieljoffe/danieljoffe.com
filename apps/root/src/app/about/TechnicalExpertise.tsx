import { expertiseCategories } from '@/data/about';
import {
  Badge,
  Card,
  Grid,
  GridItem,
  PageContainer,
  Section,
  Stack,
} from '@danieljoffe.com/shared-ui';

export default function TechnicalExpertise() {
  return (
    <Section
      aria-labelledby='technical-expertise-heading'
      className='min-h-min max-h-max'
    >
      <PageContainer>
        <h2 id='technical-expertise-heading' className='text-center'>
          Technical Expertise
        </h2>
        <Grid as='ul' cols={2} className='list-none !my-4'>
          {expertiseCategories.map(category => (
            <GridItem as='li' key={category.label}>
              <Card className='h-full border-l-4 border-l-accent' padding='md'>
                <h3 className='!mt-0 !mb-3'>{category.label}</h3>
                <Stack direction='horizontal' className='flex-wrap' gap='sm'>
                  {category.skills.map(skill => (
                    <Badge key={skill} variant='accent'>
                      {skill}
                    </Badge>
                  ))}
                </Stack>
              </Card>
            </GridItem>
          ))}
        </Grid>
      </PageContainer>
    </Section>
  );
}
