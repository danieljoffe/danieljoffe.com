import { AllowedExperienceSlugs } from '@/types/base';
import { ComponentType } from 'react';

import Winc from './winc.mdx';
import InternetBrands from './internet-brands.mdx';
import TheLibraryCorporation from './the-library-corporation.mdx';
import FightCamp from './fightcamp.mdx';
import ProfessionalDevelopment from './professional-development.mdx';

export const experienceMdxComponents: Record<
  AllowedExperienceSlugs,
  ComponentType
> = {
  winc: Winc,
  'internet-brands': InternetBrands,
  'the-library-corporation': TheLibraryCorporation,
  fightcamp: FightCamp,
  'professional-development': ProfessionalDevelopment,
};
