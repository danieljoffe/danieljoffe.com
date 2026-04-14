export const experienceSlugs = {
  Winc: 'winc',
  IB: 'internet-brands',
  TLC: 'the-library-corporation',
  FC: 'fightcamp',
  SD: 'professional-development',
} as const;

export const experiencePageSlugs = [...Object.values(experienceSlugs)];
