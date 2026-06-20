import { renderToStaticMarkup } from 'react-dom/server';
import ContactNotification from './ContactNotification';
import EmailLayout from './EmailLayout';

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
