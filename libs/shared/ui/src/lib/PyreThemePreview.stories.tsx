/**
 * Pyre theme preview — renders a representative subset of components so
 * the chartreuse + near-black palette can be eyeballed and a11y-checked
 * in Storybook before WyrdFold consumes it.
 *
 * The `pyre` theme is registered in `.storybook/preview.ts`
 * (`withThemeByClassName`) and toggles a `.pyre dark` class on the body.
 * Switch via the Storybook toolbar.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { StatsCard } from './StatsCard';
import { Badge } from './Badge';
import { Alert } from './Alert';

function PyrePreview() {
  return (
    <div className='bg-surface text-text-primary min-h-screen p-8 space-y-8'>
      <header className='space-y-2'>
        <h1 className='text-text-primary'>Pyre theme preview</h1>
        <p className='text-text-secondary max-w-2xl'>
          Chartreuse on near-black. Toggle the theme via the Storybook toolbar
          to compare with indigo. This story exists for visual QA and jest-axe
          contrast verification.
        </p>
      </header>

      <section className='space-y-4'>
        <h2 className='text-text-primary'>Buttons</h2>
        <div className='flex flex-wrap gap-3'>
          <Button name='primary'>Primary</Button>
          <Button name='secondary' variant='secondary'>
            Secondary
          </Button>
          <Button name='outline' variant='outline'>
            Outline
          </Button>
          <Button name='bare' variant='bare'>
            Bare
          </Button>
          <Button name='disabled' disabled>
            Disabled
          </Button>
        </div>
      </section>

      <section className='space-y-4'>
        <h2 className='text-text-primary'>Stats</h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <StatsCard
            title='Total applications'
            value='128'
            change={12.5}
            changeLabel='vs last month'
          />
          <StatsCard
            title='Interview rate'
            value='24%'
            change={-3.1}
            changeLabel='vs last month'
          />
          <StatsCard title='Avg fit score' value='72' />
        </div>
      </section>

      <section className='space-y-4'>
        <h2 className='text-text-primary'>Cards + badges</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <Card>
            <CardHeader>
              <CardTitle>Senior Frontend Engineer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex flex-wrap gap-2'>
                <Badge variant='success'>Applied</Badge>
                <Badge variant='warning'>High priority</Badge>
                <Badge variant='error'>Stale</Badge>
                <Badge>React</Badge>
                <Badge>TypeScript</Badge>
              </div>
            </CardContent>
          </Card>
          <Card elevated>
            <CardHeader>
              <CardTitle>Elevated surface</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-text-secondary'>
                Elevated surface variant — slightly lighter than base surface in
                dark themes.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className='space-y-4'>
        <h2 className='text-text-primary'>Alerts</h2>
        <div className='space-y-3'>
          <Alert variant='success' title='Saved'>
            Your changes were persisted.
          </Alert>
          <Alert variant='warning' title='Heads up'>
            Token costs are approaching the monthly cap.
          </Alert>
          <Alert variant='error' title='Could not load'>
            Job API returned 503. Retry in a moment.
          </Alert>
          <Alert variant='info' title='New version available'>
            A newer resume version exists for this target.
          </Alert>
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: 'Theme/Pyre Preview',
  component: PyrePreview,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PyrePreview>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Pyre: Story = {
  globals: { theme: 'pyre' },
};

export const Indigo: Story = {
  globals: { theme: 'dark' },
};
