import { act } from 'react';
import { render } from '@testing-library/react';
import Page from './page';

describe('Services Page', () => {
  it('should render successfully', async () => {
    // Server Components are async functions, so we call it and await the result
    const PageContent = await Page();
    const { baseElement } = await act(async () => render(PageContent));
    expect(baseElement).toBeTruthy();
  });
});
