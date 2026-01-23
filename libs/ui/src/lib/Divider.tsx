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
    return (
      <div
        role='separator'
        aria-orientation='vertical'
        className={`w-px bg-border ${className}`}
      />
    );
  }

  if (label) {
    return (
      <div
        role='separator'
        aria-orientation='horizontal'
        className={`flex items-center gap-4 ${className}`}
      >
        <div className='flex-1 h-px bg-border' aria-hidden='true' />
        <span className='text-sm text-foreground-muted'>{label}</span>
        <div className='flex-1 h-px bg-border' aria-hidden='true' />
      </div>
    );
  }

  return (
    <div
      role='separator'
      aria-orientation='horizontal'
      className={`h-px bg-border ${className}`}
    />
  );
}
