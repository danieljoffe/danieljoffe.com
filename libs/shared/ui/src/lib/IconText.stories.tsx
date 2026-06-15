import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconText } from './IconText';

// Inline SVG stand-in for a lucide-react icon. shared-ui never imports an icon
// library directly — the consumer passes the icon node in.
const ArrowIcon = () => (
  <svg
    width='16'
    height='16'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
  >
    <line x1='5' y1='12' x2='19' y2='12' />
    <polyline points='12 5 19 12 12 19' />
  </svg>
);

const SparkIcon = () => (
  <svg
    width='20'
    height='20'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
  >
    <path d='M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4' />
  </svg>
);

const meta = {
  title: 'Layout/IconText',
  component: IconText,
  tags: ['autodocs'],
  argTypes: {
    iconPosition: {
      description: 'Which side of the text the icon sits on',
      control: 'inline-radio',
      options: ['left', 'right'],
      table: { defaultValue: { summary: 'left' } },
    },
    children: {
      description: 'Text content',
      control: 'text',
    },
    icon: {
      description: 'Icon node (passed in by the consumer, e.g. lucide-react)',
      control: false,
    },
    as: {
      description: 'Container element type',
      control: false,
    },
  },
} satisfies Meta<typeof IconText>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: <ArrowIcon />,
    children: 'Currently building',
  },
};

export const IconRight: Story = {
  args: {
    icon: <ArrowIcon />,
    iconPosition: 'right',
    children: 'View project',
  },
};

export const LargeIcon: Story = {
  args: {
    icon: <SparkIcon />,
    children: 'How I think',
  },
};

export const Alignment: Story = {
  args: {
    icon: <ArrowIcon />,
    children: '',
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <IconText icon={<SparkIcon />}>
        Icon optically centered on the text glyph
      </IconText>
      <IconText icon={<ArrowIcon />} iconPosition='right'>
        Trailing arrow stays aligned
      </IconText>
    </div>
  ),
};
