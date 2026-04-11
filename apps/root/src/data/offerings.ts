import {
  type LucideIcon,
  Rocket,
  BarChart3,
  Zap,
  Wrench,
  Search,
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
      metric: '10s → 2s Load Time',
    },
    {
      Icon: BarChart3,
      text: "Decreased Content team's developer dependency by 80% at FightCamp.",
      metric: '80% Fewer Eng Requests',
    },
    {
      Icon: Zap,
      text: 'Increased campaign page launches to 200+ in 2 months at Winc.',
      metric: '200+ Pages in 2 Months',
    },
    {
      Icon: Wrench,
      text: 'Built React component library adopted by 80% of apps at Internet Brands.',
      metric: '80% Component Adoption',
    },
  ],
  methodology: [
    {
      Icon: Search,
      title: 'I Audit Before I Build',
      text: 'At FightCamp, I found HD images and 800MB videos loading on every page. Lazy loading, srcset optimization, and bundle analysis cut bundle size by 62% and eliminated render-blocking on every page.',
    },
    {
      Icon: Rocket,
      title: 'I Build for Autonomy',
      text: "The best thing I can leave behind is a team that doesn't need me. I build CMS tooling that gets marketing off the engineering backlog, component libraries that new hires learn in a day, and documentation that outlives the person who wrote it. I invest in people the same way. Five developers I've mentored have gone on to promotions and dream jobs, including one now at JPL.",
    },
    {
      Icon: BarChart3,
      title: 'I Measure What Matters',
      text: 'Lighthouse scores, bounce rates, Core Web Vitals. I treat performance as a feature, not an afterthought. At FightCamp, systematic optimization lifted Lighthouse from ~35 to ~80 and cut mobile bounce rates by 39%.',
    },
    {
      Icon: Layers,
      title: 'I Think in Systems, Not Just Components',
      text: 'Building auth systems and rate limiters taught me to reason about tradeoffs: JWT vs sessions, in-memory vs distributed state, fail-open vs fail-closed. I bring that architectural thinking to every layer of the stack, not just the UI.',
    },
  ],
};
