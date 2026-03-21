export function CTACard({
  heading,
  description,
  children,
}: {
  heading: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className='relative overflow-hidden rounded-2xl bg-surface-secondary border border-border p-8 sm:p-12'>
      <div className='space-y-4'>
        <h2 className='text-2xl font-bold text-text-primary tracking-tight text-center'>
          {heading}
        </h2>
        <p className='text-sm text-text-secondary max-w-md mx-auto text-center'>
          {description}
        </p>
        <div className='pt-2'>{children}</div>
      </div>
    </div>
  );
}
