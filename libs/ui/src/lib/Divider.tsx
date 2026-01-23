interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
}

export function Divider({
  orientation = 'horizontal',
  className = '',
  label,
}: DividerProps) {
  if (orientation === 'vertical') {
    return <div className={`w-px bg-border ${className}`} />;
  }

  if (label) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className='flex-1 h-px bg-border' />
        <span className='text-sm text-foreground-muted'>{label}</span>
        <div className='flex-1 h-px bg-border' />
      </div>
    );
  }

  return <div className={`h-px bg-border ${className}`} />;
}
