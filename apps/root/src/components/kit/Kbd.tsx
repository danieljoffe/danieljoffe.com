export function Kbd({ children }: { children: string }) {
  return (
    <kbd className='hidden sm:inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-[10px] font-mono font-medium text-text-tertiary bg-surface-tertiary border border-border rounded'>
      {children}
    </kbd>
  );
}
