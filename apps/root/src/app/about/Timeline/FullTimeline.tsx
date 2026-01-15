import Image from 'next/image';
import LinkHint from '@/components/LinkHint';
import Button from '@/components/Button';
import { experienceFull, experiencePageSlugs } from '@/data/experience';
import { EXPERIENCE_LINK } from '@/utils/base';

export default function FullTimeline() {
  return (
    <div className='flex flex-col gap-4' id='timeline'>
      <h3 className='pb-2'>Detailed Professional Journey</h3>
      <ul className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        {experiencePageSlugs.map(slug => {
          const company = experienceFull[slug] || {};

          return (
            <li key={company.slug}>
              <Button
                as='link'
                variant='link'
                size='lg'
                className='flex gap-4 w-full h-full text-white'
                href={`${EXPERIENCE_LINK.href}/${company.slug}`}
                aria-label={`View details for ${company.company}`}
              >
                <div className='flex gap-4 w-full h-full items-center justify-between'>
                  <div className='flex items-center justify-center bg-neutral-100 rounded-full p-2 w-16 h-16'>
                    <Image
                      src={company.logo}
                      alt={company.company}
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
                      <h4 className='m-0 h4'>{company.company}</h4>
                      <p className='text-sm'>{company.role}</p>
                    </div>
                    <div>
                      <LinkHint />
                    </div>
                  </div>
                </div>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
