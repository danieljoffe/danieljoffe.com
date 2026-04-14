import { readFile } from 'node:fs/promises';
import { getOgFonts, getProfileImageBase64, getCoverImageBase64 } from '../og';

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('mock-font-data')),
}));

jest.mock('sharp', () => {
  return jest.fn().mockReturnValue({
    png: jest.fn().mockReturnValue({
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-png-data')),
    }),
  });
});

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

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

    it('caches the profile image on subsequent calls', async () => {
      const callsBefore = mockReadFile.mock.calls.length;
      const result = await getProfileImageBase64();

      // Should reuse cached promise — no additional readFile call
      expect(mockReadFile.mock.calls.length).toBe(callsBefore);
      expect(result).toMatch(/^data:image\/png;base64,.+/);
    });
  });

  describe('getCoverImageBase64', () => {
    it('reads a local cover image and returns a PNG base64 data URL', async () => {
      const imageData = Buffer.from([0x52, 0x49, 0x46, 0x46]);
      mockReadFile.mockResolvedValueOnce(imageData);

      const result = await getCoverImageBase64('/images/covers/test-post.webp');

      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining('public/images/covers/test-post.webp')
      );
      // sharp converts to PNG for Satori compatibility
      const expectedBase64 = Buffer.from('mock-png-data').toString('base64');
      expect(result).toBe(`data:image/png;base64,${expectedBase64}`);
    });

    it('returns null when readFile throws (file not found)', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));

      const result = await getCoverImageBase64('/images/covers/missing.webp');

      expect(result).toBeNull();
    });
  });
});
