import { Text } from './Text';

export interface FormFieldErrorProps {
  message?: string | undefined;
  id?: string | undefined;
}

export function FormFieldError({ message, id }: FormFieldErrorProps) {
  if (!message) return null;
  return (
    <Text variant='error' id={id} className='mt-1.5'>
      {message}
    </Text>
  );
}
