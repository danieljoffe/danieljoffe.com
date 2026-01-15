const styles = {
  error: 'bg-rose-500 text-white',
  success: 'bg-blue-500 text-white',
  hint: 'bg-neutral-200 text-neutral-900',
};

export default function InputFeedback({
  inputId,
  message,
  type,
}: {
  inputId: string;
  message: string;
  type: 'error' | 'success' | 'hint';
}) {
  if (message == null || message === '') {
    return null;
  }
  const role = type === 'error' ? 'alert' : 'status';
  const ariaLive = type === 'error' ? 'assertive' : 'polite';

  return (
    <div className={['px-2 py-1', styles[type]].join(' ')}>
      <p
        id={`${inputId}-${type}`}
        role={role}
        className='text-sm font-sans font-medium'
        aria-live={ariaLive}
        aria-atomic='true'
      >
        {message}
      </p>
    </div>
  );
}
