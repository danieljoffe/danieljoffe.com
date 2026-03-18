import { cn } from '@danieljoffe.com/shared-ui';

export default function MainContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      id='main-content'
      className={cn('max-w-3xl mx-auto py-16 lg:py-24 space-y-24', className)}
    >
      {children}
    </main>
  );
}
