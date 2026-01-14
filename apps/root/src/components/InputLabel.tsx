export default function InputLabel({
  inputId,
  label,
  required,
}: {
  inputId: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={inputId}
      className='block mb-1 text-base font-medium font-sans cursor-pointer'
    >
      {label}
      {required && (
        <span className='text-rose-500 ml-1' aria-label='required field'>
          *
        </span>
      )}
    </label>
  );
}
