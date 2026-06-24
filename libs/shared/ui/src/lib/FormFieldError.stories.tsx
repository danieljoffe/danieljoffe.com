import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormFieldError } from './FormFieldError';

const meta = {
  title: 'Forms/FormFieldError',
  component: FormFieldError,
  tags: ['autodocs'],
} satisfies Meta<typeof FormFieldError>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: 'This field is required',
    id: 'email-error',
  },
};

export const LongMessage: Story = {
  args: {
    message: 'Password must be at least 8 characters and include a number',
    id: 'password-error',
  },
};

export const NoMessage: Story = {
  args: {
    message: undefined,
    id: 'hidden-error',
  },
  // Renders nothing when there is no message — nothing to snapshot.
  parameters: { visual: { disable: true } },
};
