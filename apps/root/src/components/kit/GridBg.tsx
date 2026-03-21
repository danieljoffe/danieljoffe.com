export function GridBg() {
  return (
    <div className='absolute inset-0 overflow-hidden pointer-events-none'>
      <div
        className='absolute inset-0 opacity-[0.03]'
        style={{
          backgroundImage: `linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />
      <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-500/5 rounded-full blur-3xl' />
    </div>
  );
}
