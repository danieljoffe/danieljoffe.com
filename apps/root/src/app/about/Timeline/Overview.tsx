import TimelineMobile from './TimelineMobile';
import TimelineTU from './TimelineTU';

export default function Overview() {
  return (
    <div className='flex flex-col gap-4'>
      <h3>Overview</h3>
      <p>
        From wine e-commerce to healthcare compliance to library systems, each
        role expanded my toolkit. I&apos;ve progressed from building landing
        pages to architecting component libraries used by 80% of applications,
        always focused on eliminating bottlenecks and empowering teams.
      </p>
      <TimelineMobile />
      <TimelineTU />
    </div>
  );
}
