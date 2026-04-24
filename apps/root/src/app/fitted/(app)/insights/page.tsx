import type { Metadata } from 'next';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@danieljoffe.com/shared-ui/Card';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export const metadata: Metadata = {
  title: 'Insights',
};

const metrics = [
  'Applications',
  'Interviews',
  'Response Rate',
  'Avg. Time to Hear Back',
];

export default function FittedInsights() {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Heading variant='component' as='h1'>
          Insights
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          Track your job search progress
        </Text>
      </div>

      <div className='grid gap-4 grid-cols-2 lg:grid-cols-4'>
        {metrics.map(metric => (
          <Card key={metric}>
            <CardHeader>
              <CardTitle className='text-sm'>{metric}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton variant='text' lines={1} size='lg' />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton variant='rectangular' height={200} />
        </CardContent>
      </Card>
    </div>
  );
}
