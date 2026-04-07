import { readFile } from 'node:fs/promises';
import {
  getOgFonts,
  getProfileImageBase64,
  getUnsplashUrl,
  getUnsplashImageBase64,
} from '../og';

jest.mock('@/utils/constants', () => ({
  UNSPLASH_PHOTOS_URL: 'https://images.unsplash.com/photo-',
}));

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('mock-font-data')),
}));

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

// fetch mock for getUnsplashImageBase64 (which fetches external URLs)
const mockFetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    headers: new Map(),
  })
);
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
  mockFetch.mockImplementation(() =>
    Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      headers: new Map(),
    })
  );
});

describe('og', () => {
  describe('getOgFonts', () => {
    it('reads three font files via readFile', async () => {
      const fonts = await getOgFonts();

      // Three readFile calls for the three fonts
      expect(mockReadFile).toHaveBeenCalledTimes(3);
      const paths = mockReadFile.mock.calls.map(
        (call: [string]) => call[0] as string
      );
      expect(paths.some((p: string) => p.includes('Inter-Regular.ttf'))).toBe(
        true
      );
      expect(paths.some((p: string) => p.includes('Inter-Medium.ttf'))).toBe(
        true
      );
      expect(paths.some((p: string) => p.includes('Inter-Bold.ttf'))).toBe(
        true
      );

      expect(fonts).toHaveLength(3);
    });

    it('returns three font objects with correct properties', async () => {
      const fonts = await getOgFonts();

      expect(fonts).toHaveLength(3);

      expect(fonts[0]).toMatchObject({
        name: 'Inter',
        weight: 400,
        style: 'normal',
      });
      expect(fonts[0].data).toBeInstanceOf(Buffer);

      expect(fonts[1]).toMatchObject({
        name: 'Inter',
        weight: 500,
        style: 'normal',
      });
      expect(fonts[1].data).toBeInstanceOf(Buffer);

      expect(fonts[2]).toMatchObject({
        name: 'Inter',
        weight: 700,
        style: 'normal',
      });
      expect(fonts[2].data).toBeInstanceOf(Buffer);
    });
  });

  describe('getProfileImageBase64', () => {
    it('returns a base64 data URL with image/png content type', async () => {
      const result = await getProfileImageBase64();

      expect(result).toMatch(/^data:image\/png;base64,.+/);
      // Verify readFile was called for the profile image (3 fonts + 1 profile = 4 total)
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining('daniel-joffe-profile.webp')
      );
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
      mockFetch.mockResolvedValueOnce({
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
      mockFetch.mockResolvedValueOnce({
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
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await getUnsplashImageBase64('abc123', 1200, 630);

      expect(result).toBeNull();
    });

    it('returns null when fetch throws an error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getUnsplashImageBase64('abc123', 1200, 630);

      expect(result).toBeNull();
    });
  });
});
