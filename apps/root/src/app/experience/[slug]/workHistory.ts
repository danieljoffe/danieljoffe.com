import { EXPERIENCE_LINK, NavLink } from '@/components/assembled/Nav/Links';
import { UnsplashImageMeta } from '@/components/assembled/UnsplashImage';

export type ExperienceItem = {
  id: string;
  year: string;
  company: string;
  logo: string;
  role: string;
  description: string;
  challenge: string[];
  solution: string;
  impact: string;
  learned: string;
  cover: UnsplashImageMeta;
  tech: string;
  link: NavLink;
};

export const winc: ExperienceItem = {
  id: 'winc',
  link: {
    label: 'Winc',
    href: [EXPERIENCE_LINK.href, '/winc'].join(''),
  },
  year: '2015-2017',
  company: 'WINC (formerly ClubW)',
  logo: '/images/winc-logo.svg',
  role: 'Frontend Developer',
  description: 'The Foundation Years: Learning to Scale Marketing Operations',
  challenge: [
    'I began my career at a wine subscription startup during a pivotal transformation period. ClubW was rebranding to Winc, and I found myself at the center of both technical and brand evolution challenges.',
    'Marketing was bottlenecked by engineering. Creating campaign landing pages required developer intervention for every single page, limiting the team to just 3 pages per week. Meanwhile, we were undergoing a complete brand transformation that demanded seamless user experience continuity.',
  ],
  solution:
    "I developed a custom, self-serve landing page CMS using Angular 2, which was a relatively cutting-edge technology at the time. This wasn't just a technical project; it was about empowering an entire team to move at the speed of business.",
  impact:
    'Marketing launched 200+ campaign pages within two months of the CMS launch, contributing to a ~43% improvement in conversion rates. I also orchestrated the technical aspects of the ClubW to Winc rebrand, ensuring zero user friction during the transition while simultaneously leading our AngularJS to Angular 2 migration for improved framework stability.',
  learned:
    'The power of eliminating bottlenecks through smart tooling, and how technical solutions can directly accelerate business growth.',
  cover: {
    src: `/photo-1558138818-d44c4dea7a6a`,
    alt: 'Forground of vineyards with a sunset shining on the mountains in the background',
    origin:
      'https://unsplash.com/photos/long-exposure-photography-of-road-and-cars-NqOInJ-ttqM',
    creator: '@marcojodoin',
    blurHash: 'LHA9c@NGEfsTxboLofWB0}xt$%R*',
  },
  tech: 'AngularJS, JavaScript ES6+, Java, Spring, Thymeleaf, HTML5, CSS3, WebAIM, WCAG 2.0 AA, Git, Browser Accessibility Tools',
};

export const internetBrands: ExperienceItem = {
  id: 'internet-brands',
  link: {
    label: 'Internet Brands',
    href: [EXPERIENCE_LINK.href, '/internet-brands'].join(''),
  },
  year: '2018-2019',
  company: 'Internet Brands',
  logo: '/images/internet-brands-logo.svg',
  role: 'Frontend Developer',
  description: 'The Leadership Test: Managing Teams While Ensuring Compliance',
  challenge: [
    "Moving to Internet Brands' Health vertical meant entering the complex world of healthcare applications, where technical excellence had to meet strict regulatory requirements.",
    'I was thrust into senior-level responsibilities despite my title, leading a team of 5 developers (3 junior, 2 mid-level) while ensuring HIPAA compliance across clinical office applications. The company also needed to fill a critical Senior Developer role that had been vacant.',
  ],
  solution:
    'I took ownership of both people and process. I drove HIPAA compliance research and implementation, led the hiring process interviewing 13 candidates, and built a shared React component library that unified our microservices UI.',
  impact:
    'The React component library I built was adopted by 80% of Health vertical applications, with 30+ documented components. I interviewed 13 candidates and hired a Senior Developer who became a key contributor. I also mentored 4 junior developers—one was later promoted to Senior, another went on to JPL.',
  learned:
    "Leadership isn't about titles. It's about taking responsibility for outcomes. I discovered my ability to manage both technical architecture and team dynamics simultaneously.",
  cover: {
    src: `/photo-1498084393753-b411b2d26b34`,
    alt: 'Overexposed traffic lights in a city at night',
    origin:
      'https://unsplash.com/photos/plants-and-mountains-during-golden-hour-N1c4X5csoTg',
    creator: '@timmossholder',
    blurHash: 'LA9jDg~A-oxt^+-UxZt75UE2M|jt',
  },
  tech: 'React, Redux, TypeScript, JavaScript ES6+, AngularJS, Angular 2+, Webpack, CSS Grid, Flexbox, Chrome DevTools, NPM, Electron, CI/CD, HIPAA Compliance',
};

export const theLibraryCorporation: ExperienceItem = {
  id: 'the-library-corporation',
  link: {
    label: 'The Library Corporation',
    href: [EXPERIENCE_LINK.href, '/the-library-corporation'].join(''),
  },
  year: '2019-2021',
  company: 'The Library Corporation',
  logo: '/images/the-library-corporation-logo.svg',
  role: 'Software Engineer',
  description: 'The Specialization Challenge: Building for Unique User Needs',
  challenge: [
    'Transitioning to library software meant understanding an entirely different user base: librarians managing cataloging workflows across 5,500+ school and public libraries nationwide.',
    "As the sole frontend developer for 23 months, I needed to build features that enhanced complex workflows for subject matter experts I'd never worked with before, all while ensuring accessibility compliance for diverse library patrons.",
  ],
  solution:
    'I became a student of the domain, collaborating closely with QA teams, backend engineers, and library cataloging SMEs. I built 30+ features in AngularJS while focusing on scalability and accessibility.',
  impact:
    'I achieved full WCAG compliance by researching, diagnosing, and remediating 200+ accessibility violations across our legacy Spring application. My dynamic cataloging components increased both accuracy and flexibility for diverse asset types, serving 5,500+ libraries.',
  learned:
    'The importance of domain expertise and user-centered design. Technical skills mean nothing without deep understanding of user needs and regulatory requirements.',
  cover: {
    src: `/photo-1465929639680-64ee080eb3ed`,
    alt: 'An 1800s library with tall bookshelves and large overhead windows',
    origin: 'https://unsplash.com/photos/photo-of-library-hall-dsvJgiBJTOs',
    creator: '@willvanw',
    blurHash: 'LRCPO;bH9FjY~CbHD%jZ%2WWi^o0',
  },
  tech: '**Tech Stack:** Angular 2, TypeScript, AngularJS, Node.js, AWS S3, HTML5, CSS3, SASS',
};

export const fightcamp: ExperienceItem = {
  id: 'fightcamp',
  link: {
    label: 'FightCamp',
    href: [EXPERIENCE_LINK.href, '/fightcamp'].join(''),
  },
  year: '2021-2023',
  company: 'FightCamp',
  logo: '/images/fightcamp-logo.svg',
  role: 'Full-Stack Engineer',
  description: 'The Scale Challenge: Infrastructure for Exponential Growth',
  challenge: [
    'FightCamp was experiencing explosive growth, and I arrived just as the technical infrastructure needed to evolve to match business demands.',
    'The platform was buckling under exponential user growth. Mobile performance was suffering (10-second load times), the team lacked development standards, and non-technical teams were overly dependent on engineering for basic tasks.',
  ],
  solution:
    'I led a comprehensive infrastructure optimization initiative, established development guidelines for the growing engineering team, and built tools that empowered other departments to work independently.',
  impact:
    "I reduced mobile website load times from 10 seconds to ~2 seconds, achieving a 39% bounce rate reduction and 62% bundle size reduction. I integrated Google Optimize for A/B testing and extended our UI component library with Storybook, reducing Content team's developer dependency by 80%.",
  learned:
    'How to think infrastructure-first and the multiplier effect of empowering other teams through smart technical solutions.',
  cover: {
    src: `/photo-1584464491033-06628f3a6b7b`,
    alt: 'A woman wearing black boxing gloves in boxing stance in a gym',
    origin:
      'https://unsplash.com/photos/woman-in-orange-and-black-shirt-and-black-leggings-doing-exercise-ZUBNPRZsQvk',
    creator: '@visualsbyroyalz',
    blurHash: 'LVK1zX00D%IU_3D%ofj]00WBt7xu',
  },
  tech: 'Vue.js, Nuxt.js, TypeScript, Webpack, Storybook, Jest, Storyblok CMS, Google Optimize, Google Analytics, AWS S3, Intersection Observer API, Lighthouse, Chrome DevTools',
};

export const professionalDevelopment: ExperienceItem = {
  id: 'professional-development',
  link: {
    label: 'Professional Development & Contract Work',
    href: [EXPERIENCE_LINK.href, '/professional-development'].join(''),
  },
  year: '2023-Present',
  company: 'Professional Development & Contract Work',
  logo: '/images/brand-logo.svg',
  role: 'Full-Stack Engineer',
  description: 'The Investment Phase: Deepening Expertise While Contributing',
  challenge: [
    'Rather than immediately jumping to the next full-time role, I made the strategic decision to strengthen my computer science foundation while staying engaged with meaningful projects.',
    'Combining formal CS education with contract work to deepen expertise across the full stack.',
  ],
  solution:
    "I enrolled in WGU's Computer Science program while accepting a contracted engineering project from a former CEO—building a logistics dashboard MVP using Next.js, AWS Cognito, and role-based authentication.",
  impact:
    'Built a logistics dashboard MVP in 3 months for a seed-stage venture featuring Next.js, AWS Cognito integration, and role-based access control. Currently 14+ credits into my CS degree at WGU, on track for October 2026 graduation.',
  learned:
    'A long-term investment mindset. Sometimes the best career move is to strengthen your foundation while maintaining professional relationships that value your expertise.',
  cover: {
    src: `/photo-1645886702268-a28bf146bc35`,
    alt: 'A man in a green shirt and jeans looking at his laptop sitting at a cafe counter',
    origin:
      'https://unsplash.com/photos/a-man-sitting-at-a-table-using-a-laptop-computer-CBlCcF-dyGM',
    creator: '@emmaou',
    blurHash: 'LjKU=u%gkqRP_MogMxbvD%RPxtR*',
  },
  tech: '**Tech Stack:** Angular 2, TypeScript, AngularJS, Node.js, AWS S3, HTML5, CSS3, SASS',
};

export const experience: Record<string, ExperienceItem> = {
  [winc.id]: winc,
  [internetBrands.id]: internetBrands,
  [theLibraryCorporation.id]: theLibraryCorporation,
  [fightcamp.id]: fightcamp,
  [professionalDevelopment.id]: professionalDevelopment,
};
