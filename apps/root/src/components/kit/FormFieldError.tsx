export function FormFieldError({
  message,
  id,
}: {
  message?: string | undefined;
  id?: string | undefined;
}) {
  if (!message) return null;
  return (
    <p id={id} className='mt-1.5 text-sm text-error'>
      {message}
    </p>
  );
}
