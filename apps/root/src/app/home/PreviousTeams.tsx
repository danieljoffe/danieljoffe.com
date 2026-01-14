import Container from '@/components/Container';
import Image from 'next/image';
import LinkHint from '@/components/LinkHint';
import { EXPERIENCE_LINK } from '@/components/Nav/Links';
import Button from '@/components/Button';
import { experienceFull } from '@/data/experience';

const companies = Object.values(experienceFull);

export default function PreviousTeams() {
  return (
    <Container>
      <h2 className='text-center' id='previous-teams-heading'>
        Teams I&apos;ve worked with
      </h2>
      <div className='grid grid-cols-2 grid-rows-2 gap-8 justify-items-center items-center pb-4 min-h-[12.5rem]'>
        {companies.map((company, index) => (
          <Button
            key={company.slug}
            as='link'
            variant='link'
            size='lg'
            href={`${EXPERIENCE_LINK.href}/${company.slug}`}
            aria-label={company.company}
            title={company.company}
          >
            <div className='flex gap-2 w-full h-full items-center justify-center'>
              <Image
                className='w-full h-full max-w-[10rem] max-h-[5rem] object-contain flex-1'
                src={company.logo}
                alt={company.company}
                width={145}
                height={45}
                sizes='(max-width: 640px) 5rem, (max-width: 768px) 6rem, 7rem'
                unoptimized={true}
                loading={index < 2 ? 'eager' : 'lazy'}
                fetchPriority={index < 2 ? 'high' : 'low'}
              />
              <LinkHint />
            </div>
          </Button>
        ))}
      </div>

      <p className='text-center'>
        I&apos;ve worked with these companies to build fast, beautiful, and
        inclusive digital experiences.
      </p>
    </Container>
  );
}
