import React, { act } from 'react';
import { render } from '@testing-library/react';
import Page from './page';

describe('Page', () => {
  it('should render successfully', async () => {
    const { baseElement } = await act(async () => render(<Page />));
    expect(baseElement).toBeTruthy();
  });
});
