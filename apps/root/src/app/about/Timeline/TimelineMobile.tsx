import Image from 'next/image';

export default function TimelineMobile() {
  return (
    <div className='flex md:hidden'>
      <div className='flex flex-1 justify-center items-center'>
        <Image
          src='/images/sm-timeline.svg'
          alt='Timeline Mobile'
          width={375}
          height={667}
          className='w-full h-auto max-w-sm'
          sizes='100vw'
          unoptimized={true}
          fetchPriority='low'
          priority={false}
          loading='lazy'
          decoding='async'
        />
      </div>
    </div>
  );
}
