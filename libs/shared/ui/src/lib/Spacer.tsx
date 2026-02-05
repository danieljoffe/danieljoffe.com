export interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const sizeClasses = {
  xs: 'h-2',
  sm: 'h-4',
  md: 'h-8',
  lg: 'h-12',
  xl: 'h-16',
  '2xl': 'h-24',
};

export function Spacer({ size = 'md' }: SpacerProps) {
  return <div className={sizeClasses[size]} />;
}
