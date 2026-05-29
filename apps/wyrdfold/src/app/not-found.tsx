import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import WyrdfoldSidebar from './(app)/WyrdfoldSidebar';

/**
 * Catches unmatched URLs that don't fall inside any route segment.
 *
 * `(app)/not-found.tsx` only fires when a page *inside* the `(app)`
 * group calls `notFound()`. For URLs that match nothing at all (e.g.
 * `/jobs` before that page is ported), Next.js looks for a root-level
 * `not-found.tsx` — this one. The middleware has already redirected
 * unauthenticated users to `/login`, so anyone landing here is signed
 * in and just typed a wrong URL.
 *
 * Wrap the content in the same sidebar shell ``(app)/layout.tsx``
 * provides so the user keeps direct nav to every authed route from
 * the not-found screen. Without this, the user has only "Back to
 * dashboard" and has to navigate from there to anywhere else.
 */
export default function NotFound() {
  return (
    <div className='flex min-h-screen'>
      <WyrdfoldSidebar />
      <main
        id='main-content'
        className='flex-1 overflow-x-hidden p-4 pb-[calc(theme(spacing.16)+env(safe-area-inset-bottom)+1rem)] md:p-6'
      >
        <div className='flex min-h-full items-center justify-center'>
          <Card className='max-w-md w-full'>
            <CardContent className='flex flex-col items-center gap-4 py-12 text-center'>
              <Heading variant='hero' as='h1'>
                Page not found
              </Heading>
              <Text variant='body' as='p' className='max-w-sm'>
                We couldn&apos;t find that page. It may have moved, been
                removed, or never existed.
              </Text>
              <Button
                name='wyrdfold-root-not-found-home'
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
      </main>
    </div>
  );
}
