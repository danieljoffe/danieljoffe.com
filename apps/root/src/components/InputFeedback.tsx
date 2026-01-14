const baseStyles = 'px-2 py-1 text-sm font-sans font-medium';

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
    <p
      id={`${inputId}-${type}`}
      className={[baseStyles, styles[type]].join(' ')}
      role={role}
      aria-live={ariaLive}
      aria-atomic='true'
    >
      {message}
    </p>
  );
}
