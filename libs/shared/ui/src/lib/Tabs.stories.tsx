import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Tabs } from './Tabs';

const meta = {
  title: 'Data Display/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  argTypes: {
    tabs: {
      description: 'Array of tab objects with id, label, and content',
    },
    defaultTab: {
      description: 'ID of the tab to show by default',
      control: 'text',
    },
    onChange: {
      description: 'Callback when active tab changes',
      action: 'onChange executed!',
    },
    variant: {
      description: 'Visual style variant for the tabs',
      control: 'radio',
      options: ['underline', 'pill'],
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleTabs = [
  { id: 'tab1', label: 'Tab 1', content: 'Content for Tab 1' },
  { id: 'tab2', label: 'Tab 2', content: 'Content for Tab 2' },
  { id: 'tab3', label: 'Tab 3', content: 'Content for Tab 3' },
];

export const Default: Story = {
  args: {
    tabs: sampleTabs,
  },
};

export const WithDefaultTab: Story = {
  args: {
    tabs: sampleTabs,
    defaultTab: 'tab2',
  },
};

export const TabSwitchInteraction: Story = {
  args: {
    tabs: sampleTabs,
    onChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // First tab should be active by default
    await expect(canvas.getByText('Content for Tab 1')).toBeInTheDocument();
    await expect(canvas.getByRole('tab', { name: 'Tab 1' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // Click second tab
    await userEvent.click(canvas.getByRole('tab', { name: 'Tab 2' }));
    await expect(args.onChange).toHaveBeenCalledWith('tab2');
    await expect(canvas.getByText('Content for Tab 2')).toBeInTheDocument();
    await expect(canvas.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // Click third tab
    await userEvent.click(canvas.getByRole('tab', { name: 'Tab 3' }));
    await expect(args.onChange).toHaveBeenCalledWith('tab3');
    await expect(canvas.getByText('Content for Tab 3')).toBeInTheDocument();
  },
};

export const KeyboardNavigation: Story = {
  args: {
    tabs: sampleTabs,
    onChange: fn(),
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Focus first tab via Tab key', async () => {
      await userEvent.tab();
      await expect(canvas.getByRole('tab', { name: 'Tab 1' })).toHaveFocus();
    });

    await step('ArrowRight moves focus to next tab', async () => {
      await userEvent.keyboard('{ArrowRight}');
      await expect(canvas.getByRole('tab', { name: 'Tab 2' })).toHaveFocus();
      await expect(args.onChange).toHaveBeenCalledWith('tab2');
    });

    await step('ArrowRight wraps around to first tab', async () => {
      await userEvent.keyboard('{ArrowRight}');
      await expect(canvas.getByRole('tab', { name: 'Tab 3' })).toHaveFocus();
      await userEvent.keyboard('{ArrowRight}');
      await expect(canvas.getByRole('tab', { name: 'Tab 1' })).toHaveFocus();
    });

    await step('ArrowLeft moves focus to previous tab', async () => {
      await userEvent.keyboard('{ArrowLeft}');
      await expect(canvas.getByRole('tab', { name: 'Tab 3' })).toHaveFocus();
    });

    await step('Tab moves focus to tabpanel', async () => {
      await userEvent.tab();
      await expect(canvas.getByRole('tabpanel')).toHaveFocus();
    });
  },
};

export const PillVariant: Story = {
  args: {
    tabs: sampleTabs,
    variant: 'pill',
  },
};

export const AccessibilityAttributes: Story = {
  args: {
    tabs: sampleTabs,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check tablist role
    await expect(canvas.getByRole('tablist')).toBeInTheDocument();

    // Check tab roles and aria attributes
    const tabs = canvas.getAllByRole('tab');
    await expect(tabs).toHaveLength(3);

    // Check tabpanel
    const tabpanel = canvas.getByRole('tabpanel');
    await expect(tabpanel).toBeInTheDocument();
    await expect(tabpanel).toHaveAttribute('aria-labelledby');
  },
};
