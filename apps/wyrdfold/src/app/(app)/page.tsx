import type { Metadata } from 'next';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';

export const metadata: Metadata = {
  title: 'Dashboard',
};

// Stub dashboard for Phase 6.1. The full DashboardPage (327 LOC, depends on
// jobs + targets types) lands alongside Phase 6.2/6.3 when those types port.
export default function DashboardPage() {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Heading variant='hero' as='h1'>
          Dashboard
        </Heading>
        <Text variant='body' className='mt-2'>
          Welcome to WyrdFold.
        </Text>
      </div>
      <Card>
        <CardContent className='py-8 text-center'>
          <Text variant='body'>
            Jobs, targets, and insights are coming online — sign-in works,
            navigation works, the rest of the UI ports next.
          </Text>
        </CardContent>
      </Card>
    </div>
  );
}
