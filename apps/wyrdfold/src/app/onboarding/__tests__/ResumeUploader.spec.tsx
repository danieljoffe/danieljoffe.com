import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResumeUploader from '../ResumeUploader';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

function makeFile(name: string, type: string, sizeBytes: number): File {
  const file = new File(['x'], name, { type });
  // jsdom's File doesn't honor a custom byte size from the constructor —
  // override `.size` for the limit-check branch.
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('ResumeUploader', () => {
  it('renders the upload prompt heading and drop zone', () => {
    render(<ResumeUploader onComplete={jest.fn()} onSkip={jest.fn()} />);
    expect(
      screen.getByRole('heading', { level: 2, name: /upload your resume/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /upload resume file/i })
    ).toBeInTheDocument();
  });

  it('rejects an unsupported MIME type without calling fetch', async () => {
    render(<ResumeUploader onComplete={jest.fn()} onSkip={jest.fn()} />);
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const txt = makeFile('cv.txt', 'text/plain', 1024);
    // userEvent.upload() filters by the `accept` attribute and would silently
    // drop a .txt file before firing change. We're testing the component's
    // own MIME validation branch, so dispatch a change event directly.
    fireEvent.change(input, { target: { files: [txt] } });

    expect(fetchMock).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/pdf or docx/i);
    });
  });

  it('rejects files larger than 10 MB without calling fetch', async () => {
    const user = userEvent.setup();
    render(<ResumeUploader onComplete={jest.fn()} onSkip={jest.fn()} />);
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const oversized = makeFile('big.pdf', 'application/pdf', 11 * 1024 * 1024);
    await user.upload(input, oversized);

    expect(fetchMock).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/under 10 mb/i);
    });
  });

  it('POSTs a valid PDF to the upload endpoint and shows the success state', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    const user = userEvent.setup();
    render(<ResumeUploader onComplete={jest.fn()} onSkip={jest.fn()} />);
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const pdf = makeFile('cv.pdf', 'application/pdf', 2048);
    await user.upload(input, pdf);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/career/experience/upload-resume?auto_derive=true',
        expect.objectContaining({ method: 'POST' })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/resume uploaded successfully/i)
      ).toBeInTheDocument();
    });
  });

  it('calls onComplete after a brief delay following a successful upload', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    const onComplete = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ResumeUploader onComplete={onComplete} onSkip={jest.fn()} />);
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const pdf = makeFile('cv.pdf', 'application/pdf', 2048);
    await user.upload(input, pdf);

    await waitFor(() => {
      expect(
        screen.getByText(/resume uploaded successfully/i)
      ).toBeInTheDocument();
    });

    jest.advanceTimersByTime(1200);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('renders the API error message when the upload fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: 'Could not parse resume' }),
    });
    const user = userEvent.setup();
    render(<ResumeUploader onComplete={jest.fn()} onSkip={jest.fn()} />);
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const pdf = makeFile('cv.pdf', 'application/pdf', 2048);
    await user.upload(input, pdf);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /could not parse resume/i
      );
    });
  });

  it('invokes onSkip when "Skip for now" is clicked', async () => {
    const onSkip = jest.fn();
    const user = userEvent.setup();
    render(<ResumeUploader onComplete={jest.fn()} onSkip={onSkip} />);
    await user.click(screen.getByRole('button', { name: /skip for now/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
