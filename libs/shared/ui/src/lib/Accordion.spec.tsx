import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Accordion } from './Accordion';

expect.extend(toHaveNoViolations);

const one = { id: 'one', title: 'Section one', content: 'First content' };
const two = { id: 'two', title: 'Section two', content: 'Second content' };
const three = { id: 'three', title: 'Section three', content: 'Third content' };
const items = [one, two, three];

describe('Accordion', () => {
  it('renders a header button per item', () => {
    render(<Accordion items={items} />);
    expect(
      screen.getByRole('button', { name: /Section one/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Section two/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Section three/ })
    ).toBeInTheDocument();
  });

  it('renders nothing for an empty items array', () => {
    const { container } = render(<Accordion items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps panels collapsed by default', () => {
    render(<Accordion items={items} />);
    expect(screen.queryByText('First content')).not.toBeInTheDocument();
  });

  it('opens panels flagged defaultOpen', () => {
    render(<Accordion items={[{ ...one, defaultOpen: true }, two, three]} />);
    expect(screen.getByText('First content')).toBeInTheDocument();
    expect(screen.queryByText('Second content')).not.toBeInTheDocument();
  });

  it('toggles a panel open and closed on header click', () => {
    render(<Accordion items={items} />);
    const header = screen.getByRole('button', { name: /Section one/ });
    fireEvent.click(header);
    expect(screen.getByText('First content')).toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.queryByText('First content')).not.toBeInTheDocument();
  });

  it('allows multiple panels open by default', () => {
    render(<Accordion items={items} />);
    fireEvent.click(screen.getByRole('button', { name: /Section one/ }));
    fireEvent.click(screen.getByRole('button', { name: /Section two/ }));
    expect(screen.getByText('First content')).toBeInTheDocument();
    expect(screen.getByText('Second content')).toBeInTheDocument();
  });

  it('closes the open panel when another opens with allowMultiple=false', () => {
    render(<Accordion items={items} allowMultiple={false} />);
    fireEvent.click(screen.getByRole('button', { name: /Section one/ }));
    fireEvent.click(screen.getByRole('button', { name: /Section two/ }));
    expect(screen.queryByText('First content')).not.toBeInTheDocument();
    expect(screen.getByText('Second content')).toBeInTheDocument();
  });

  it('honours only the first defaultOpen when allowMultiple=false', () => {
    render(
      <Accordion
        allowMultiple={false}
        items={[
          { ...one, defaultOpen: true },
          { ...two, defaultOpen: true },
          three,
        ]}
      />
    );
    expect(screen.getByText('First content')).toBeInTheDocument();
    expect(screen.queryByText('Second content')).not.toBeInTheDocument();
  });

  it('disables interaction on disabled items', () => {
    render(<Accordion items={[one, { ...two, disabled: true }, three]} />);
    const header = screen.getByRole('button', { name: /Section two/ });
    expect(header).toBeDisabled();
    fireEvent.click(header);
    expect(screen.queryByText('Second content')).not.toBeInTheDocument();
  });

  it('reports toggles through onToggle', () => {
    const onToggle = jest.fn();
    render(<Accordion items={items} onToggle={onToggle} />);
    const header = screen.getByRole('button', { name: /Section one/ });
    fireEvent.click(header);
    expect(onToggle).toHaveBeenLastCalledWith('one', true);
    fireEvent.click(header);
    expect(onToggle).toHaveBeenLastCalledWith('one', false);
  });

  describe('ARIA attributes', () => {
    it('toggles aria-expanded on the header button', () => {
      render(<Accordion items={items} />);
      const header = screen.getByRole('button', { name: /Section one/ });
      expect(header).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(header);
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('links header to panel via aria-controls when open', () => {
      render(<Accordion items={items} />);
      const header = screen.getByRole('button', { name: /Section one/ });
      expect(header).not.toHaveAttribute('aria-controls');
      fireEvent.click(header);
      const panel = screen.getByRole('region');
      expect(header).toHaveAttribute('aria-controls', panel.id);
      expect(panel).toHaveAttribute('aria-labelledby', header.id);
    });

    it('wraps headers in level-3 headings by default', () => {
      render(<Accordion items={items} />);
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    });

    it('respects a custom headingLevel', () => {
      render(<Accordion items={items} headingLevel={2} />);
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3);
    });
  });

  describe('Keyboard navigation', () => {
    it('moves focus down with ArrowDown, wrapping at the end', () => {
      render(<Accordion items={items} />);
      const headers = screen.getAllByRole('button');
      headers[0]!.focus();
      fireEvent.keyDown(headers[0]!, { key: 'ArrowDown' });
      expect(headers[1]).toHaveFocus();
      fireEvent.keyDown(headers[1]!, { key: 'ArrowDown' });
      expect(headers[2]).toHaveFocus();
      fireEvent.keyDown(headers[2]!, { key: 'ArrowDown' });
      expect(headers[0]).toHaveFocus();
    });

    it('moves focus up with ArrowUp, wrapping at the start', () => {
      render(<Accordion items={items} />);
      const headers = screen.getAllByRole('button');
      headers[0]!.focus();
      fireEvent.keyDown(headers[0]!, { key: 'ArrowUp' });
      expect(headers[2]).toHaveFocus();
    });

    it('jumps to first and last with Home and End', () => {
      render(<Accordion items={items} />);
      const headers = screen.getAllByRole('button');
      headers[1]!.focus();
      fireEvent.keyDown(headers[1]!, { key: 'End' });
      expect(headers[2]).toHaveFocus();
      fireEvent.keyDown(headers[2]!, { key: 'Home' });
      expect(headers[0]).toHaveFocus();
    });

    it('skips disabled headers during navigation', () => {
      render(
        <Accordion
          items={[items[0], { ...items[1], disabled: true }, items[2]]}
        />
      );
      const headers = screen.getAllByRole('button');
      headers[0]!.focus();
      fireEvent.keyDown(headers[0]!, { key: 'ArrowDown' });
      expect(headers[2]).toHaveFocus();
    });
  });

  it('has no accessibility violations closed or open', async () => {
    const { container } = render(<Accordion items={items} />);
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(screen.getByRole('button', { name: /Section one/ }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
