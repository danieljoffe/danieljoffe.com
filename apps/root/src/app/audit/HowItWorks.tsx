import { Heading, Text } from '@/components/kit';

const steps = [
  {
    number: 1,
    title: 'Paste your URL',
    description:
      'Enter any website address and we\u2019ll run a comprehensive audit.',
  },
  {
    number: 2,
    title: 'Get your report',
    description:
      'Performance, accessibility, SEO, and best practices \u2014 all graded.',
  },
  {
    number: 3,
    title: 'Fix what matters',
    description: 'Prioritized recommendations with difficulty ratings.',
  },
];

export default function HowItWorks() {
  return (
    <section
      aria-labelledby='how-it-works-heading'
      className='w-full overflow-hidden flex flex-col justify-center'
    >
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 md:py-14'>
        <Heading
          variant='section'
          as='h2'
          id='how-it-works-heading'
          className='text-center'
        >
          How It Works
        </Heading>
        <ol className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-6'>
          {steps.map(step => (
            <li
              key={step.number}
              className='rounded-lg border border-border bg-surface-elevated flex w-full h-full py-6 px-5'
            >
              <div className='flex flex-col gap-2 items-start'>
                <span className='inline-flex items-center justify-center size-10 rounded-full bg-brand-500 text-text-inverse font-bold'>
                  {step.number}
                </span>
                <Heading variant='component' as='h3'>
                  {step.title}
                </Heading>
                <Text variant='body'>{step.description}</Text>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
