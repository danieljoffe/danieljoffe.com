import type { Meta, StoryObj } from '@storybook/react';
import InputFeedback from './InputFeedback';

const meta = {
  component: InputFeedback,
  title: 'Components/InputFeedback',
  parameters: {
    layout: 'centered',
  },
  // tags: ['autodocs'],
} satisfies Meta<typeof InputFeedback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = {
  args: {
    inputId: 'email-field',
    message: 'Please enter a valid email address',
    type: 'error',
  },
};

export const Success: Story = {
  args: {
    inputId: 'email-field',
    message: 'Email address is valid',
    type: 'success',
  },
};

export const Hint: Story = {
  args: {
    inputId: 'password-field',
    message: 'Password must be at least 8 characters long',
    type: 'hint',
  },
};
