export type BaseTextInputProps = {
  label?: string;
  error?: string | undefined;
  hint?: string;
  success?: boolean;
  className?: string;
  as?: 'input' | 'textarea';
};

export type TextInputAsInputProps = BaseTextInputProps & {
  as?: 'input';
} & React.InputHTMLAttributes<HTMLInputElement>;

export type TextInputAsTextareaProps = BaseTextInputProps & {
  as: 'textarea';
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export type TextInputProps = TextInputAsInputProps | TextInputAsTextareaProps;
