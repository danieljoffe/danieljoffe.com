import { renderToStaticMarkup } from 'react-dom/server';
import ContactNotification from './ContactNotification';
import EmailLayout from './EmailLayout';
import FollowUpEmail from './FollowUp';
import FullReportEmail from './FullReport';
import JobAlertEmail from './JobAlert';
import QuickWinEmail from './QuickWin';

describe('ContactNotification', () => {
  const props = {
    name: 'Jane Smith',
    email: 'jane@example.com',
    message: 'I would like to discuss a project.',
  };

  it('renders sender name and email', () => {
    const html = renderToStaticMarkup(ContactNotification(props));
    expect(html).toContain('Jane Smith');
    expect(html).toContain('jane@example.com');
  });

  it('renders the message', () => {
    const html = renderToStaticMarkup(ContactNotification(props));
    expect(html).toContain('I would like to discuss a project.');
  });

  it('includes mailto link for sender email', () => {
    const html = renderToStaticMarkup(ContactNotification(props));
    expect(html).toContain('mailto:jane@example.com');
  });
});

describe('EmailLayout', () => {
  it('renders children and unsubscribe link', () => {
    const html = renderToStaticMarkup(
      EmailLayout({
        preview: 'Test preview',
        unsubscribeUrl: 'https://example.com/unsubscribe',
        children: 'Hello World',
      })
    );
    expect(html).toContain('Hello World');
    expect(html).toContain('https://example.com/unsubscribe');
    expect(html).toContain('Unsubscribe');
  });

  it('renders the brand name', () => {
    const html = renderToStaticMarkup(
      EmailLayout({
        preview: 'Test',
        unsubscribeUrl: 'https://example.com/unsub',
        children: 'Content',
      })
    );
    expect(html).toContain('Daniel Joffe');
  });
});

describe('FollowUpEmail', () => {
  const props = {
    name: 'John Doe',
    url: 'example.com',
    grade: 'C',
    gradeLabel: 'Needs Work',
    gradeColor: '#FFB46B',
    reportUrl: 'https://danieljoffe.com/audit/r/123',
    calendlyUrl: 'https://calendly.com/danieljoffe',
    unsubscribeUrl: 'https://danieljoffe.com/api/email/unsubscribe?token=abc',
  };

  it('renders the grade and label', () => {
    const html = renderToStaticMarkup(FollowUpEmail(props));
    expect(html).toContain('C');
    expect(html).toContain('Needs Work');
  });

  it('renders the calendly CTA link', () => {
    const html = renderToStaticMarkup(FollowUpEmail(props));
    expect(html).toContain('https://calendly.com/danieljoffe');
    expect(html).toContain('Book a Free Discovery Call');
  });

  it('renders personalized greeting with name', () => {
    const html = renderToStaticMarkup(FollowUpEmail(props));
    expect(html).toContain('Hi John Doe');
  });

  it('renders generic greeting without name', () => {
    const html = renderToStaticMarkup(FollowUpEmail({ ...props, name: null }));
    expect(html).toContain('Hi,');
    expect(html).not.toContain('Hi null');
  });
});

describe('FullReportEmail', () => {
  const props = {
    name: 'Alice',
    url: 'alice.dev',
    grade: 'B',
    gradeLabel: 'Good',
    gradeColor: '#63CAA5',
    scores: {
      performance: 85,
      accessibility: 92,
      seo: 78,
      bestPractices: 90,
    },
    topIssues: [
      {
        title: 'Missing alt text',
        severity: 'critical',
        category: 'accessibility',
      },
      { title: 'Slow LCP', severity: 'warning', category: 'performance' },
    ],
    reportUrl: 'https://danieljoffe.com/audit/r/456',
    unsubscribeUrl: 'https://danieljoffe.com/api/email/unsubscribe?token=def',
  };

  it('renders grade and scores', () => {
    const html = renderToStaticMarkup(FullReportEmail(props));
    expect(html).toContain('B');
    expect(html).toContain('Good');
    expect(html).toContain('85');
    expect(html).toContain('92');
  });

  it('renders top issues', () => {
    const html = renderToStaticMarkup(FullReportEmail(props));
    expect(html).toContain('Missing alt text');
    expect(html).toContain('Slow LCP');
    expect(html).toContain('CRITICAL');
  });

  it('renders CTA to view full report', () => {
    const html = renderToStaticMarkup(FullReportEmail(props));
    expect(html).toContain('https://danieljoffe.com/audit/r/456');
    expect(html).toContain('View Full Report');
  });

  it('handles null scores gracefully', () => {
    const html = renderToStaticMarkup(
      FullReportEmail({
        ...props,
        scores: {
          performance: null,
          accessibility: null,
          seo: null,
          bestPractices: null,
        },
      })
    );
    expect(html).toContain('—');
  });

  it('hides issues section when empty', () => {
    const html = renderToStaticMarkup(
      FullReportEmail({ ...props, topIssues: [] })
    );
    expect(html).not.toContain('Top Issues Found');
  });
});

describe('QuickWinEmail', () => {
  const props = {
    name: 'Bob',
    url: 'bob.dev',
    issue: {
      title: 'Add meta description',
      description: 'Your page is missing a meta description tag.',
      category: 'seo',
      severity: 'moderate',
      fix_difficulty: 'easy',
      impact: 'Improves search engine click-through rate.',
    },
    reportUrl: 'https://danieljoffe.com/audit/r/789',
    unsubscribeUrl: 'https://danieljoffe.com/api/email/unsubscribe?token=ghi',
  };

  it('renders the issue details', () => {
    const html = renderToStaticMarkup(QuickWinEmail(props));
    expect(html).toContain('Add meta description');
    expect(html).toContain('missing a meta description');
    expect(html).toContain('EASY FIX');
  });

  it('renders the impact section', () => {
    const html = renderToStaticMarkup(QuickWinEmail(props));
    expect(html).toContain('Why this matters');
    expect(html).toContain('click-through rate');
  });

  it('hides impact section when null', () => {
    const html = renderToStaticMarkup(
      QuickWinEmail({ ...props, issue: { ...props.issue, impact: null } })
    );
    expect(html).not.toContain('Why this matters');
  });

  it('renders CTA to see all issues', () => {
    const html = renderToStaticMarkup(QuickWinEmail(props));
    expect(html).toContain('https://danieljoffe.com/audit/r/789');
    expect(html).toContain('See All Your Issues');
  });
});

describe('JobAlertEmail', () => {
  const props = {
    title: 'Senior Frontend Engineer',
    company: 'Acme Corp',
    location: 'Remote, US',
    score: 87,
    jobUrl: 'https://boards.greenhouse.io/acme/jobs/1',
    fittedUrl: 'https://danieljoffe.com/fitted/jobs/abc-123',
    unsubscribeUrl:
      'https://danieljoffe.com/api/email/jobs/unsubscribe?profile_id=p1&token=tok',
  };

  it('renders job title, company, and score', () => {
    const html = renderToStaticMarkup(JobAlertEmail(props));
    expect(html).toContain('Senior Frontend Engineer');
    expect(html).toContain('Acme Corp');
    expect(html).toContain('87');
  });

  it('renders the Fitted deep link and original posting link', () => {
    const html = renderToStaticMarkup(JobAlertEmail(props));
    expect(html).toContain('Open in Fitted');
    expect(html).toContain('https://danieljoffe.com/fitted/jobs/abc-123');
    expect(html).toContain('View original posting');
    expect(html).toContain('https://boards.greenhouse.io/acme/jobs/1');
  });

  it('renders location when present', () => {
    const html = renderToStaticMarkup(JobAlertEmail(props));
    expect(html).toContain('Remote, US');
  });

  it('omits location separator when location is null', () => {
    const html = renderToStaticMarkup(
      JobAlertEmail({ ...props, location: null })
    );
    expect(html).toContain('Acme Corp');
    expect(html).not.toContain(' · null');
  });

  it('renders the unsubscribe link from EmailLayout', () => {
    const html = renderToStaticMarkup(JobAlertEmail(props));
    // React Email HTML-escapes '&' to '&amp;' in href output — match on the
    // un-escaped prefix instead of the raw URL.
    expect(html).toContain('/api/email/jobs/unsubscribe?profile_id=p1');
    expect(html).toContain('token=tok');
  });
});
