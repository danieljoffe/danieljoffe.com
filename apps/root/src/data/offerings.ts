import {
  type LucideIcon,
  Rocket,
  BarChart3,
  Zap,
  Accessibility,
  Target,
  LayoutTemplate,
  Wrench,
  UserCheck,
  Search,
  Sprout,
  Layers,
} from 'lucide-react';

interface Achievement {
  Icon: LucideIcon;
  text: string;
  metric: string;
}

interface Methodology {
  Icon: LucideIcon;
  title: string;
  text: string;
}

export const offerings: {
  achievements: Achievement[];
  methodology: Methodology[];
} = {
  achievements: [
    {
      Icon: Rocket,
      text: 'Reduced mobile load time from 10s to 2s at FightCamp.',
      metric: 'Lightning Fast',
    },
    {
      Icon: BarChart3,
      text: "Decreased Content team's developer dependency by 80% at FightCamp.",
      metric: 'Empowered Teams',
    },
    {
      Icon: Zap,
      text: 'Increased campaign page launches to 200+ in 2 months at Winc.',
      metric: 'Explosive Growth',
    },
    {
      Icon: Accessibility,
      text: 'Achieved WCAG compliance across legacy systems at The Library Corporation.',
      metric: 'Accessible for All',
    },
    {
      Icon: Target,
      text: 'Mentored junior developers—one promoted to Senior, another went to JPL.',
      metric: 'Talent Unlocked',
    },
    {
      Icon: LayoutTemplate,
      text: 'Built a self-serve CMS enabling 200+ landing pages at Winc.',
      metric: 'Frictionless Launches',
    },
    {
      Icon: Wrench,
      text: 'Built React component library adopted by 80% of apps at Internet Brands.',
      metric: 'Rock-Solid Delivery',
    },
    {
      Icon: UserCheck,
      text: 'Interviewed 13 candidates, hired key Senior Developer at Internet Brands.',
      metric: 'Leadership Secured',
    },
  ],
  methodology: [
    {
      Icon: Search,
      title: 'I Audit Before I Build',
      text: 'At FightCamp, I found HD images and 800MB videos loading on every page. Lazy loading, srcset optimization, and bundle analysis cut bundle size by 62% and improved load times by 80%.',
    },
    {
      Icon: Rocket,
      title: 'I Build for Autonomy',
      text: "Marketing teams shouldn't wait on engineering to ship a landing page. I built CMS tooling at Winc and FightCamp that let non-technical teams publish independently — 200+ pages launched, 80% fewer engineering requests.",
    },
    {
      Icon: BarChart3,
      title: 'I Measure What Matters',
      text: 'Lighthouse scores, bounce rates, Core Web Vitals — I treat performance as a feature. At FightCamp, systematic optimization lifted Lighthouse from ~35 to ~80 and cut mobile bounce rates by 39%.',
    },
    {
      Icon: Layers,
      title: 'I Think in Systems, Not Just Components',
      text: 'Building auth systems and rate limiters taught me to reason about tradeoffs — JWT vs sessions, in-memory vs distributed state, fail-open vs fail-closed. I bring that architectural thinking to every layer of the stack, not just the UI.',
    },
    {
      Icon: Sprout,
      title: 'I Invest in People',
      text: "Five developers I've mentored have gone on to promotions and dream jobs — including one now at JPL. I believe component architecture is learnable, but curiosity and drive aren't.",
    },
  ],
};
