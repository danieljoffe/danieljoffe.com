import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Accordion } from './Accordion';

const meta = {
  title: 'Data Display/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  argTypes: {
    allowMultiple: {
      description: 'Allow several panels open at once',
      control: 'boolean',
      table: { defaultValue: { summary: 'true' } },
    },
    headingLevel: {
      description: 'Heading level of the header rows',
      control: 'select',
      options: [2, 3, 4],
      table: { defaultValue: { summary: '3' } },
    },
  },
} satisfies Meta<typeof Accordion>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      {
        id: 'summary',
        title: 'Profile summary',
        content:
          'Senior frontend engineer with a focus on design systems and accessibility.',
        defaultOpen: true,
      },
      {
        id: 'experience',
        title: 'Experience',
        content: 'Eight years across product teams and platform work.',
      },
      {
        id: 'education',
        title: 'Education',
        content: 'BSc Computer Science.',
      },
    ],
  },
};

export const SingleOpen: Story = {
  args: {
    allowMultiple: false,
    items: [
      {
        id: 'v3',
        title: 'Version 3 — current',
        content: 'Reworked scoring model and new export formats.',
        defaultOpen: true,
      },
      {
        id: 'v2',
        title: 'Version 2',
        content: 'Added collaborative review comments.',
      },
      {
        id: 'v1',
        title: 'Version 1',
        content: 'Initial release.',
      },
    ],
  },
};

export const WithDisabledItem: Story = {
  args: {
    items: [
      { id: 'available', title: 'Feedback', content: 'Panel content.' },
      {
        id: 'locked',
        title: 'Reviewer notes (locked)',
        content: 'Not visible.',
        disabled: true,
      },
    ],
  },
};

export const ToggleInteraction: Story = {
  args: {
    onToggle: fn(),
    items: [
      { id: 'a', title: 'First section', content: 'First panel body' },
      { id: 'b', title: 'Second section', content: 'Second panel body' },
    ],
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByRole('button', { name: /First section/ });
    const second = canvas.getByRole('button', { name: /Second section/ });

    await step('Open the first section', async () => {
      await userEvent.click(first);
      await waitFor(() =>
        expect(first).toHaveAttribute('aria-expanded', 'true')
      );
      await expect(canvas.getByText('First panel body')).toBeInTheDocument();
      await expect(args.onToggle).toHaveBeenCalledWith('a', true);
    });

    await step('Open the second — both stay open', async () => {
      await userEvent.click(second);
      await waitFor(() =>
        expect(second).toHaveAttribute('aria-expanded', 'true')
      );
      await expect(first).toHaveAttribute('aria-expanded', 'true');
    });

    await step('Close the first section', async () => {
      await userEvent.click(first);
      await waitFor(() =>
        expect(first).toHaveAttribute('aria-expanded', 'false')
      );
      await expect(
        canvas.queryByText('First panel body')
      ).not.toBeInTheDocument();
    });
  },
};

export const ExclusiveInteraction: Story = {
  args: {
    allowMultiple: false,
    items: [
      { id: 'a', title: 'First section', content: 'First panel body' },
      { id: 'b', title: 'Second section', content: 'Second panel body' },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByRole('button', { name: /First section/ });
    const second = canvas.getByRole('button', { name: /Second section/ });

    await userEvent.click(first);
    await waitFor(() => expect(first).toHaveAttribute('aria-expanded', 'true'));

    // Opening the second closes the first in single-open mode
    await userEvent.click(second);
    await waitFor(() =>
      expect(second).toHaveAttribute('aria-expanded', 'true')
    );
    await expect(first).toHaveAttribute('aria-expanded', 'false');
  },
};
