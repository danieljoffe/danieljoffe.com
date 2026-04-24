import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
  title: 'Job Detail',
};

export default async function FittedJobDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center gap-3'>
        <Link
          href='/fitted'
          className='p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors'
          aria-label='Back to dashboard'
        >
          <ArrowLeft className='size-5' aria-hidden />
        </Link>
        <div>
          <Heading variant='component' as='h1'>
            Job Detail
          </Heading>
          <Text variant='caption' className='text-text-tertiary'>
            ID: {id}
          </Text>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Company Info</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton variant='text' lines={3} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton variant='text' lines={5} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LLM Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton variant='text' lines={4} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton variant='text' lines={3} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
