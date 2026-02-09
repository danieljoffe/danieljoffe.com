import { cn } from './utils';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
}: SwitchProps) {
  return (
    <div className='flex items-center gap-2'>
      <button
        type='button'
        role='switch'
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-accent' : 'bg-border-strong'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-background transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
      {label && <span className='text-foreground select-none'>{label}</span>}
    </div>
  );
}
