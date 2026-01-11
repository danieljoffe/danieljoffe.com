import Image from 'next/image';
import timeline from './timeline';
import LinkHint from '@/components/units/LinkHint';
import { ABOUT_LINK } from '@/components/assembled/Nav/Links';
import Button from '@/components/units/Button';

export default function FullTimeline() {
  return (
    <div className='flex flex-col gap-4' id={timeline.id}>
      <h3 className='pb-2'>{timeline.title}</h3>
      <ul className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        {timeline.items.map(item => (
          <li key={item.company}>
            <Button
              as='link'
              variant='link'
              size='lg'
              className='flex gap-4 w-full h-full text-white'
              href={`${ABOUT_LINK.href}/experience/${item.id}`}
              aria-label={`View details for ${item.company}`}
            >
              <div className='flex gap-4 w-full h-full items-center justify-between'>
                <div className='flex items-center justify-center bg-neutral-100 rounded-full p-2 w-16 h-16'>
                  <Image
                    src={item.logo}
                    alt={item.company}
                    width={48}
                    height={48}
                    sizes='(max-width: 640px) 3rem, 3.5rem'
                    fetchPriority='low'
                    priority={false}
                    unoptimized={true}
                  />
                </div>
                <div className='flex justify-center items-center gap-2 flex-1'>
                  <div className='flex-1'>
                    <h4>{item.company}</h4>
                    <p>{item.role}</p>
                  </div>
                  <div>
                    <LinkHint />
                  </div>
                </div>
              </div>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
