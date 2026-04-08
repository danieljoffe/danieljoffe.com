import { ComponentType } from 'react';
import { AllowedExperienceSlugs } from '@/types/base';
import { PostMetadata } from '@/types/postTypes';
import Winc, { metadata as wincMeta } from './winc.mdx';
import InternetBrands, { metadata as ibMeta } from './internet-brands.mdx';
import TheLibraryCorporation, {
  metadata as tlcMeta,
} from './the-library-corporation.mdx';
import FightCamp, { metadata as fcMeta } from './fightcamp.mdx';
import ProfessionalDevelopment, {
  metadata as sdMeta,
} from './professional-development.mdx';

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

export const experienceMdxMetadata: Record<
  AllowedExperienceSlugs,
  PostMetadata
> = {
  winc: wincMeta,
  'internet-brands': ibMeta,
  'the-library-corporation': tlcMeta,
  fightcamp: fcMeta,
  'professional-development': sdMeta,
};
