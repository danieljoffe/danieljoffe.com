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
  title: 'Profile',
};

const sections = [
  { title: 'Resume', lines: 4 },
  { title: 'Skills', lines: 3 },
  { title: 'Education', lines: 2 },
];

export default function FittedProfile() {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Heading variant='component' as='h1'>
          Profile
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          Manage your experience and skills
        </Text>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {sections.map(section => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton variant='text' lines={section.lines} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
