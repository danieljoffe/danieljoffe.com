import { render, screen } from '@testing-library/react';
import ScoreCards from './ScoreCards';

describe('ScoreCards', () => {
  it('renders all 4 score cards', () => {
    render(
      <ScoreCards
        performance={85}
        accessibility={92}
        seo={78}
        bestPractices={88}
      />
    );
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Accessibility')).toBeInTheDocument();
    expect(screen.getByText('SEO')).toBeInTheDocument();
    expect(screen.getByText('Best Practices')).toBeInTheDocument();
  });

  it('renders score values', () => {
    render(
      <ScoreCards
        performance={85}
        accessibility={92}
        seo={78}
        bestPractices={88}
      />
    );
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('78')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
  });

  it('renders N/A for null scores', () => {
    render(
      <ScoreCards
        performance={null}
        accessibility={null}
        seo={null}
        bestPractices={null}
      />
    );
    expect(screen.getAllByText('N/A')).toHaveLength(4);
  });

  it('applies correct color for high scores (green)', () => {
    render(
      <ScoreCards
        performance={95}
        accessibility={null}
        seo={null}
        bestPractices={null}
      />
    );
    const scoreEl = screen.getByText('95');
    expect(scoreEl.style.color).toBe('rgb(99, 202, 165)');
  });

  it('applies correct color for low scores (red)', () => {
    render(
      <ScoreCards
        performance={30}
        accessibility={null}
        seo={null}
        bestPractices={null}
      />
    );
    const scoreEl = screen.getByText('30');
    expect(scoreEl.style.color).toBe('rgb(255, 107, 107)');
  });

  it('renders mobile context note by default', () => {
    render(
      <ScoreCards
        performance={85}
        accessibility={92}
        seo={78}
        bestPractices={88}
      />
    );
    expect(
      screen.getByText(/scores reflect a mobile device/i)
    ).toBeInTheDocument();
  });

  it('renders desktop context note when deviceMode is desktop', () => {
    render(
      <ScoreCards
        performance={85}
        accessibility={92}
        seo={78}
        bestPractices={88}
        deviceMode='desktop'
      />
    );
    expect(
      screen.getByText(/scores reflect a desktop device/i)
    ).toBeInTheDocument();
  });
});
