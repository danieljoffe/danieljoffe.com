import { promises as fs } from 'fs';

async function getFileContents(path: string) {
  try {
    return await fs.readFile(`${process.cwd()}${path}`, 'utf8');
  } catch (e: unknown) {
    console.error(e as Event);
    return '/* failed to fetch file contents */';
  }
}

export const CRITICAL_STYLES = await getFileContents(
  '/src/styles/_critical-styles.css'
);
