import { PostBaseI } from '@/types/post.types';

export default function PostThumbnailIDescription({
  title,
  description,
}: Pick<PostBaseI, 'title' | 'description'>) {
  return (
    <div
      className={[
        'flex flex-col gap-4 h-full w-full',
        'overflow-hidden min-h-[15rem] min-h-min',
        'text-white',
      ].join(' ')}
    >
      <div
        className={[
          'flex flex-col gap-4 h-full w-full p-4',
          'bg-neutral-900/25 backdrop-blur-md shadow-lg',
        ].join(' ')}
      >
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}
