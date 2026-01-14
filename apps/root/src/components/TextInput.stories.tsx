import type { Meta, StoryObj } from '@storybook/react';
import TextInput from './TextInput';

const meta = {
  component: TextInput,
  title: 'Components/TextInput',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    as: {
      control: 'select',
      options: ['input', 'textarea'],
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password'],
      if: { arg: 'as', eq: 'input' },
    },
    required: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    success: {
      control: 'boolean',
    },
    error: {
      control: 'text',
    },
    hint: {
      control: 'text',
    },
    value: {
      control: 'text',
    },
    placeholder: {
      control: 'text',
    },
    rows: {
      control: 'number',
      if: { arg: 'as', eq: 'textarea' },
    },
  },
  args: {
    as: 'input',
    type: 'text',
  },
  decorators: [
    (Story, { args }) => {
      return (
        <div className='flex p-4'>
          <Story {...args} />
        </div>
      );
    },
  ],
  // tags: ['autodocs'],
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: props => (
    <TextInput
      {...props}
      label='Email Address'
      name='email'
      type='email'
      placeholder='Enter your email'
    />
  ),
};

export const WithError: Story = {
  render: props => (
    <TextInput
      {...props}
      label='Email Address'
      name='email'
      type='email'
      error='Please enter a valid email address'
      defaultValue='invalid-email'
    />
  ),
};

export const WithHint: Story = {
  render: props => (
    <TextInput
      {...props}
      label='Password'
      name='password'
      type='password'
      hint='Must be at least 8 characters long'
    />
  ),
};

export const Success: Story = {
  render: props => (
    <TextInput
      {...props}
      label='Email Address'
      name='email'
      type='email'
      success={true}
      defaultValue='user@example.com'
    />
  ),
};

export const Disabled: Story = {
  render: props => (
    <TextInput
      {...props}
      label='Email Address'
      name='email'
      type='email'
      disabled={true}
      defaultValue='user@example.com'
    />
  ),
};

export const Required: Story = {
  render: props => (
    <TextInput
      {...props}
      label='Email Address'
      name='email'
      type='email'
      required={true}
    />
  ),
};

export const TextArea: Story = {
  render: props => (
    <TextInput
      {...props}
      label='Message'
      name='message'
      as='textarea'
      placeholder='Enter your message here...'
      rows={4}
    />
  ),
};

export const TextAreaWithError: Story = {
  render: props => (
    <TextInput
      {...props}
      label='Description'
      name='description'
      as='textarea'
      error='Description is required'
      placeholder='Enter description...'
    />
  ),
};

export const TextAreaWithHint: Story = {
  render: props => (
    <TextInput
      {...props}
      label='Comments'
      name='comments'
      as='textarea'
      hint='Please provide detailed feedback'
      placeholder='Your comments here...'
      rows={6}
    />
  ),
};
