import React from 'react';
import { render } from '@testing-library/react';
import DashboardPage from '../src/app/(app)/page';

describe('DashboardPage', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<DashboardPage />);
    expect(baseElement).toBeTruthy();
  });
});
