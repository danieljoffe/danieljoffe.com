import { ComponentType } from 'react';
import { AllowedProjectSlugs } from '@/types/base';
import { PostMetadata } from '@/types/postTypes';
import UiComponentsV1, { metadata as uiV1Meta } from './ui-components-v1.mdx';
import UiComponentsV2, { metadata as uiV2Meta } from './ui-components-v2.mdx';
import PerformanceCaseStudy, {
  metadata as perfMeta,
} from './performance-case-study.mdx';
import ComponentLibraryCaseStudy, {
  metadata as clibMeta,
} from './component-library-case-study.mdx';
import CmsToolingCaseStudy, {
  metadata as cmsMeta,
} from './cms-tooling-case-study.mdx';
import AccessibilitySerialsStudyCase, {
  metadata as a11yMeta,
} from './accessibility-serials-study-case.mdx';
import PortfolioModernPracticeStudyCase, {
  metadata as modernMeta,
} from './portfolio-modern-practice-study-case.mdx';
import LogisticsDashboardStudyCase, {
  metadata as logisticsMeta,
} from './logistics-dashboard-study-case.mdx';
import ContactFormCaseStudy, {
  metadata as contactFormMeta,
} from './contact-form-case-study.mdx';
import AppContextCaseStudy, {
  metadata as appContextMeta,
} from './appcontext-simplification-case-study.mdx';
import JobPipelineCaseStudy, {
  metadata as jobPipelineMeta,
} from './job-pipeline-case-study.mdx';
import ApiPerformanceCaseStudy, {
  metadata as apiPerfMeta,
} from './api-performance-case-study.mdx';

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
    'contact-form-case-study': ContactFormCaseStudy,
    'appcontext-simplification-case-study': AppContextCaseStudy,
    'job-pipeline-case-study': JobPipelineCaseStudy,
    'api-performance-case-study': ApiPerformanceCaseStudy,
  };

export const projectMdxMetadata: Record<AllowedProjectSlugs, PostMetadata> = {
  'ui-components-v1': uiV1Meta,
  'ui-components-v2': uiV2Meta,
  'performance-case-study': perfMeta,
  'component-library-case-study': clibMeta,
  'cms-tooling-case-study': cmsMeta,
  'accessibility-serials-study-case': a11yMeta,
  'portfolio-modern-practice-study-case': modernMeta,
  'logistics-dashboard-study-case': logisticsMeta,
  'contact-form-case-study': contactFormMeta,
  'appcontext-simplification-case-study': appContextMeta,
  'job-pipeline-case-study': jobPipelineMeta,
  'api-performance-case-study': apiPerfMeta,
};
