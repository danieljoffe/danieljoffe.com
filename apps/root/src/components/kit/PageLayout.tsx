import { PageContainer } from '@danieljoffe.com/shared-ui/PageContainer';

export function PageLayout({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <PageContainer
      as='main'
      id='main-content'
      size={wide ? 'md' : 'sm'}
      className='py-16 lg:py-24 space-y-24'
    >
      {children}
    </PageContainer>
  );
}
