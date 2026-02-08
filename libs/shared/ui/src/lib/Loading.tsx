export interface LoadingProps {
  /** Accessible label for the loading state */
  'aria-label'?: string;
  /** Custom className for the container */
  className?: string;
}

/**
 * A fancy loading component with dual-ring spinner and bouncing dots animation.
 * Includes full ARIA support for accessibility.
 */
export function Loading({
  'aria-label': ariaLabel = 'Loading content',
  className = '',
}: LoadingProps) {
  return (
    <div
      className={`flex items-center justify-center min-h-50 w-full ${className}`}
      role='status'
      aria-live='polite'
      aria-label={ariaLabel}
    >
      <div className='flex flex-col items-center gap-4'>
        {/* Bouncing dots */}
        <div className='flex gap-1'>
          <div
            className='w-2 h-2 bg-warning rounded-full'
            style={{
              animation: 'bounceSubtle 0.6s ease-in-out infinite',
            }}
          />
          <div
            className='w-2 h-2 bg-info rounded-full'
            style={{
              animation: 'bounceSubtle 0.6s ease-in-out infinite',
              animationDelay: '0.1s',
            }}
          />
          <div
            className='w-2 h-2 bg-warning rounded-full'
            style={{
              animation: 'bounceSubtle 0.6s ease-in-out infinite',
              animationDelay: '0.2s',
            }}
          />
          <div
            className='w-2 h-2 bg-error rounded-full'
            style={{
              animation: 'bounceSubtle 0.6s ease-in-out infinite',
              animationDelay: '0.3s',
            }}
          />
        </div>

        {/* Loading text */}
        <p
          className='text-sm'
          style={{ animation: 'pulseSlow 2s ease-in-out infinite' }}
        >
          Loading...
        </p>
      </div>

      {/* Keyframes for custom animations */}
      <style>{`
        @keyframes bounceSubtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        @keyframes pulseSlow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
