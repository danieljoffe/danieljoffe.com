import { PostBaseI } from '@/types/post.types';

export default function PostThumbnailIDescription({
  title,
  description,
}: Pick<PostBaseI, 'title' | 'description'>) {
  return (
    <div
      className={[
        'overflow-hidden min-h-[15rem] min-h-min text-white',
        'bg-neutral-900/25 backdrop-blur-md shadow-lg h-full',
        'px-4 pt-6 pb-8',
      ].join(' ')}
    >
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
