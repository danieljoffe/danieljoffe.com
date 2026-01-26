import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

// Card Stories
const cardMeta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    elevated: {
      description: 'Adds elevated shadow effect',
      control: 'boolean',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    padding: {
      description: 'Padding size inside the card',
      control: 'select',
      options: [undefined, 'none', 'sm', 'md', 'lg'],
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    children: {
      description: 'Card content',
      control: 'text',
    },
  },
};
export default cardMeta;

type CardStory = StoryObj<typeof Card>;

export const Default: CardStory = {
  args: {
    children: 'Card content goes here',
  },
};

export const Elevated: CardStory = {
  args: {
    children: 'Elevated card content',
    elevated: true,
  },
};

export const NoPadding: CardStory = {
  args: {
    children: 'Card without padding',
    padding: 'none',
  },
};

export const LargePadding: CardStory = {
  args: {
    children: 'Card with large padding',
    padding: 'lg',
  },
};

// Full Card Example with all sub-components
export const FullCard: CardStory = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
      </CardHeader>
      <CardContent>
        This is the card content area where you can place any content.
      </CardContent>
    </Card>
  ),
};

// CardHeader Stories
const cardHeaderMeta: Meta<typeof CardHeader> = {
  title: 'Components/Card/CardHeader',
  component: CardHeader,
  tags: ['autodocs'],
  argTypes: {
    children: {
      description: 'Header content (typically contains CardTitle)',
      control: 'text',
    },
  },
};

type CardHeaderStory = StoryObj<typeof CardHeader>;

export const HeaderDefault: CardHeaderStory = {
  ...cardHeaderMeta,
  args: {
    children: 'Card Header Content',
  },
};

// CardTitle Stories
const cardTitleMeta: Meta<typeof CardTitle> = {
  title: 'Components/Card/CardTitle',
  component: CardTitle,
  tags: ['autodocs'],
  argTypes: {
    children: {
      description: 'Title text content',
      control: 'text',
    },
  },
};

type CardTitleStory = StoryObj<typeof CardTitle>;

export const TitleDefault: CardTitleStory = {
  ...cardTitleMeta,
  args: {
    children: 'Card Title',
  },
};

// CardContent Stories
const cardContentMeta: Meta<typeof CardContent> = {
  title: 'Components/Card/CardContent',
  component: CardContent,
  tags: ['autodocs'],
  argTypes: {
    children: {
      description: 'Content area of the card',
      control: 'text',
    },
  },
};

type CardContentStory = StoryObj<typeof CardContent>;

export const ContentDefault: CardContentStory = {
  ...cardContentMeta,
  args: {
    children: 'This is the card content area where you can place any content.',
  },
};
