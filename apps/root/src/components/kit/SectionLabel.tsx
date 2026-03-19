export function SectionLabel({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className='flex items-center gap-2 mb-8'>
      <div className='p-1.5 rounded-md bg-surface-tertiary text-text-secondary'>
        {icon}
      </div>
      <span className='text-xs font-semibold uppercase tracking-wider text-text-tertiary'>
        {label}
      </span>
      <div className='flex-1 h-px bg-border ml-2' />
    </div>
  );
}
