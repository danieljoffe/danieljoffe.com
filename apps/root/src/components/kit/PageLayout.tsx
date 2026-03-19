export function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className='max-w-3xl mx-auto py-16 lg:py-24 space-y-24'>
      {children}
    </main>
  );
}
