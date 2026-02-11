import { AllowedExperienceSlugs } from '@/types/base';
import { PostThumbnail } from '@/types/postTypes';
import { EXPERIENCE_LINK, UNSPLASH_URL } from '@/utils/constants';
import {
  experienceNames,
  experienceRoles,
  experienceSlugs,
} from './experience';

export const experienceRecords: Record<AllowedExperienceSlugs, PostThumbnail> =
  {
    [experienceSlugs.Winc]: {
      slug: experienceSlugs.Winc,
      title: experienceNames.Winc,
      role: experienceRoles.Winc,
      duration: 'Jun 2015 - Oct 2017',
      description:
        'The Foundation Years: Learning to Scale Marketing Operations',
      link: {
        label: experienceNames.Winc,
        href: `${EXPERIENCE_LINK.href}/${experienceSlugs.Winc}`,
      },
      cover: {
        alt: 'Forground of vineyards with a sunset shining on the mountains in the background',
        src: '/photo-1558138818-d44c4dea7a6a',
        origin: `${UNSPLASH_URL}/photos/long-exposure-photography-of-road-and-cars-NqOInJ-ttqM`,
        creator: '@marcojodoin',
        blurHash: 'LHA9c@NGEfsTxboLofWB0}xt$%R*',
      },
    },
    [experienceSlugs.IB]: {
      slug: experienceSlugs.IB,
      title: experienceNames.IB,
      role: experienceRoles.IB,
      duration: 'Mar 2018 - Aug 2019',
      description:
        'The Leadership Test: Managing Teams While Ensuring Compliance',
      link: {
        label: experienceNames.IB,
        href: `${EXPERIENCE_LINK.href}/${experienceSlugs.IB}`,
      },
      cover: {
        alt: 'Overexposed traffic lights in a city at night',
        src: '/photo-1498084393753-b411b2d26b34',
        origin: `${UNSPLASH_URL}/photos/plants-and-mountains-during-golden-hour-N1c4X5csoTg`,
        creator: '@timmossholder',
        blurHash: 'LA9jDg~A-oxt^+-UxZt75UE2M|jt',
      },
    },
    [experienceSlugs.TLC]: {
      slug: experienceSlugs.TLC,
      title: experienceNames.TLC,
      role: experienceRoles.TLC,
      duration: 'Sep 2019 - Nov 2021',
      description:
        'The Specialization Challenge: Building for Unique User Needs',
      link: {
        label: experienceNames.TLC,
        href: `${EXPERIENCE_LINK.href}/${experienceSlugs.TLC}`,
      },
      cover: {
        alt: 'An 1800s library with tall bookshelves and large overhead windows',
        src: '/photo-1465929639680-64ee080eb3ed',
        origin: `${UNSPLASH_URL}/photos/photo-of-library-hall-dsvJgiBJTOs`,
        creator: '@willvanw',
        blurHash: 'LRCPO;bH9FjY~CbHD%jZ%2WWi^o0',
      },
    },
    [experienceSlugs.FC]: {
      slug: experienceSlugs.FC,
      title: experienceNames.FC,
      role: experienceRoles.FC,
      duration: 'Nov 2021 - Jan 2023',
      description: 'The Scale Challenge: Infrastructure for Exponential Growth',
      link: {
        label: experienceNames.FC,
        href: `${EXPERIENCE_LINK.href}/${experienceSlugs.FC}`,
      },
      cover: {
        alt: 'A woman wearing black boxing gloves in boxing stance in a gym',
        src: '/photo-1584464491033-06628f3a6b7b',
        origin: `${UNSPLASH_URL}/photos/woman-in-orange-and-black-shirt-and-black-leggings-doing-exercise-ZUBNPRZsQvk`,
        creator: '@visualsbyroyalz',
        blurHash: 'LVK1zX00D%IU_3D%ofj]00WBt7xu',
      },
    },
    [experienceSlugs.SD]: {
      slug: experienceSlugs.SD,
      title: experienceNames.SD,
      role: experienceRoles.SD,
      duration: 'Jan 2023 - Present',
      description:
        'The Investment Phase: Deepening Expertise While Contributing',
      link: {
        label: experienceNames.SD,
        href: `${EXPERIENCE_LINK.href}/${experienceSlugs.SD}`,
      },
      cover: {
        alt: 'A man in a green shirt and jeans looking at his laptop sitting at a cafe counter',
        src: '/photo-1645886702268-a28bf146bc35',
        origin: `${UNSPLASH_URL}/photos/a-man-sitting-at-a-table-using-a-laptop-computer-CBlCcF-dyGM`,
        creator: '@emmaou',
        blurHash: 'LjKU=u%gkqRP_MogMxbvD%RPxtR*',
      },
    },
  };
