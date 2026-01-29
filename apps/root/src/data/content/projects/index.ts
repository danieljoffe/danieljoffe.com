import { AllowedProjectSlugs } from '@/types/base';
import { ComponentType } from 'react';

import UiComponentsV1 from './ui-components-v1.mdx';
import UiComponentsV2 from './ui-components-v2.mdx';
import PerformanceCaseStudy from './performance-case-study.mdx';
import ComponentLibraryCaseStudy from './component-library-case-study.mdx';
import CmsToolingCaseStudy from './cms-tooling-case-study.mdx';
import AccessibilitySerialsStudyCase from './accessibility-serials-study-case.mdx';
import PortfolioModernPracticeStudyCase from './portfolio-modern-practice-study-case.mdx';
import LogisticsDashboardStudyCase from './logistics-dashboard-study-case.mdx';

export const projectMdxComponents: Record<AllowedProjectSlugs, ComponentType> =
  {
    'ui-components-v1': UiComponentsV1,
    'ui-components-v2': UiComponentsV2,
    'performance-case-study': PerformanceCaseStudy,
    'component-library-case-study': ComponentLibraryCaseStudy,
    'cms-tooling-case-study': CmsToolingCaseStudy,
    'accessibility-serials-study-case': AccessibilitySerialsStudyCase,
    'portfolio-modern-practice-study-case': PortfolioModernPracticeStudyCase,
    'logistics-dashboard-study-case': LogisticsDashboardStudyCase,
  };
