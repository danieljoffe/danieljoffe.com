import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';

export default function AppNotFound() {
  return (
    <div className='flex flex-col gap-6'>
      <Heading variant='hero' as='h1'>
        Page not found
      </Heading>
      <Card>
        <CardContent className='flex flex-col items-center gap-4 py-12 text-center'>
          <Text variant='body' as='p' className='max-w-md'>
            We couldn&apos;t find that page. It may have been moved or the URL
            is incorrect.
          </Text>
          <Button
            name='wyrdfold-not-found-home'
            variant='primary'
            size='sm'
            as='link'
            href='/dashboard'
          >
            Back to dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
