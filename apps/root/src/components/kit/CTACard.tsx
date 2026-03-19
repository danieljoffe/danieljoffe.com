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
    <div className='relative overflow-hidden rounded-2xl bg-surface-secondary border border-border p-8 sm:p-12 text-center'>
      <div className='absolute inset-0 bg-brand-500/[0.02]' />
      <div className='relative space-y-4'>
        <h2 className='text-2xl font-bold text-text-primary tracking-tight'>
          {heading}
        </h2>
        <p className='text-sm text-text-secondary max-w-md mx-auto'>
          {description}
        </p>
        <div className='pt-2'>{children}</div>
      </div>
    </div>
  );
}
