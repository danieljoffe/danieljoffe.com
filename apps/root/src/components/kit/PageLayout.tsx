import { cn } from '@/lib/cn';

export function PageLayout({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <main
      id='main-content'
      className={cn(
        'mx-auto py-16 lg:py-24 space-y-24',
        wide ? 'max-w-5xl' : 'max-w-3xl'
      )}
    >
      {children}
    </main>
  );
}
