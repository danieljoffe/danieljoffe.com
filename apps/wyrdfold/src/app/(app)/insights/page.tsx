import type { Metadata } from 'next';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import InsightsDashboard from './InsightsDashboard';

export const metadata: Metadata = {
  title: 'Insights',
};

export default function FittedInsights() {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Heading variant='hero' as='h1'>
          Insights
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          Track your job search progress
        </Text>
      </div>
      <InsightsDashboard />
    </div>
  );
}
