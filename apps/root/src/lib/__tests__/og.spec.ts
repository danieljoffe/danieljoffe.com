import { readFile } from 'node:fs/promises';

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('mock-file-content')),
}));

jest.mock('@/utils/constants', () => ({
  UNSPLASH_PHOTOS_URL: 'https://images.unsplash.com/photo-',
}));

const mockReadFile = readFile as jest.Mock;
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  getOgFonts,
  getProfileImageBase64,
  getUnsplashUrl,
  getUnsplashImageBase64,
} from '../og';

beforeEach(() => {
  mockReadFile.mockClear();
  mockFetch.mockReset();
});

describe('og', () => {
  describe('getOgFonts', () => {
    it('reads three font files from the correct paths', async () => {
      await getOgFonts();

      expect(mockReadFile).toHaveBeenCalledTimes(3);

      const cwd = process.cwd();
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining(`${cwd}/assets/fonts/og/Inter-Regular.ttf`)
      );
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining(`${cwd}/assets/fonts/og/Inter-Medium.ttf`)
      );
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining(`${cwd}/assets/fonts/og/Fraunces-Bold.ttf`)
      );
    });

    it('returns three font objects with correct properties', async () => {
      const fonts = await getOgFonts();

      expect(fonts).toHaveLength(3);

      expect(fonts[0]).toEqual({
        name: 'Inter',
        data: Buffer.from('mock-file-content'),
        weight: 400,
        style: 'normal',
      });

      expect(fonts[1]).toEqual({
        name: 'Inter',
        data: Buffer.from('mock-file-content'),
        weight: 500,
        style: 'normal',
      });

      expect(fonts[2]).toEqual({
        name: 'Fraunces',
        data: Buffer.from('mock-file-content'),
        weight: 700,
        style: 'normal',
      });
    });
  });

  describe('getProfileImageBase64', () => {
    it('reads the profile image from the correct path', async () => {
      await getProfileImageBase64();

      const cwd = process.cwd();
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining(`${cwd}/public/images/daniel-joffe-profile.png`)
      );
    });

    it('returns a base64 data URL with image/png content type', async () => {
      const result = await getProfileImageBase64();

      const expectedBase64 =
        Buffer.from('mock-file-content').toString('base64');
      expect(result).toBe(`data:image/png;base64,${expectedBase64}`);
    });
  });

  describe('getUnsplashUrl', () => {
    it('constructs the correct URL with all parameters', () => {
      const result = getUnsplashUrl('abc123', 1200, 630);

      expect(result).toBe(
        'https://images.unsplash.com/photo-abc123?w=1200&h=630&fit=crop&auto=format&q=80'
      );
    });

    it('handles different dimensions', () => {
      const result = getUnsplashUrl('xyz789', 800, 400);

      expect(result).toBe(
        'https://images.unsplash.com/photo-xyz789?w=800&h=400&fit=crop&auto=format&q=80'
      );
    });
  });

  describe('getUnsplashImageBase64', () => {
    it('returns a base64 data URL when fetch succeeds with content-type header', async () => {
      const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageData.buffer),
        headers: new Map([['content-type', 'image/webp']]),
      });

      const result = await getUnsplashImageBase64('abc123', 1200, 630);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://images.unsplash.com/photo-abc123?w=1200&h=630&fit=crop&auto=format&q=80'
      );
      const expectedBase64 = Buffer.from(imageData.buffer).toString('base64');
      expect(result).toBe(`data:image/webp;base64,${expectedBase64}`);
    });

    it('falls back to image/jpeg when content-type header is null', async () => {
      const imageData = new Uint8Array([0xff, 0xd8, 0xff]);
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageData.buffer),
        headers: {
          get: () => null,
        },
      });

      const result = await getUnsplashImageBase64('abc123', 1200, 630);

      const expectedBase64 = Buffer.from(imageData.buffer).toString('base64');
      expect(result).toBe(`data:image/jpeg;base64,${expectedBase64}`);
    });

    it('returns null when res.ok is false', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      });

      const result = await getUnsplashImageBase64('abc123', 1200, 630);

      expect(result).toBeNull();
    });

    it('returns null when fetch throws an error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await getUnsplashImageBase64('abc123', 1200, 630);

      expect(result).toBeNull();
    });
  });
});
