import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from '@storybook/test';
import { Tabs } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
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
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Tab to the first tab button
    await userEvent.tab();
    await expect(canvas.getByRole('tab', { name: 'Tab 1' })).toHaveFocus();

    // Click to switch tabs (keyboard navigation between tabs)
    await userEvent.tab();
    await expect(canvas.getByRole('tabpanel')).toHaveFocus();
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
