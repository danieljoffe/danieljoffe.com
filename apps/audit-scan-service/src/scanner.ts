import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import AxePuppeteer from '@axe-core/puppeteer';
import type { DeviceMode } from '@danieljoffe.com/shared-audit';
import {
  LIGHTHOUSE_CONFIG,
  LIGHTHOUSE_DESKTOP_CONFIG,
} from './config/lighthouse.js';
import { supabase } from './supabase.js';

export interface ScanResults {
  lighthouse: Record<string, unknown>;
  axe: Record<string, unknown>;
  pageTitle: string;
  pageDescription: string;
  screenshotUrl: string | null;
}
const executablePath = process.env['CHROME_PATH'] || '/usr/bin/chromium';

export async function runScan(
  url: string,
  deviceMode: DeviceMode = 'mobile'
): Promise<ScanResults> {
  const browser = await puppeteer.launch({
    executablePath,
    args: [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-crash-reporter',
      '--disable-breakpad',
      '--disable-software-rasterizer',
      '--single-process',
      '--no-zygote',
    ],
  });

  const isDesktop = deviceMode === 'desktop';
  const lhConfig = isDesktop ? LIGHTHOUSE_DESKTOP_CONFIG : LIGHTHOUSE_CONFIG;

  try {
    // Run Lighthouse
    const port = Number(new URL(browser.wsEndpoint()).port);
    const lighthouseResult = await lighthouse(url, {
      ...lhConfig,
      port,
    });

    if (!lighthouseResult?.lhr) {
      throw new Error('Lighthouse returned no results');
    }

    const lhr = lighthouseResult.lhr;

    // Run axe-core — match viewport to device mode
    const page = await browser.newPage();
    await page.setViewport({
      width: lhConfig.screenEmulation.width,
      height: lhConfig.screenEmulation.height,
      deviceScaleFactor: lhConfig.screenEmulation.deviceScaleFactor,
    });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const axeResults = await new AxePuppeteer(page).analyze();

    // Extract page metadata
    const pageTitle = await page.title();
    const pageDescription = await page
      .$eval('meta[name="description"]', el => el.getAttribute('content') ?? '')
      .catch(() => '');

    // Take screenshot and upload to Supabase Storage
    const screenshotBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 60,
      fullPage: false,
    });

    let screenshotUrl: string | null = null;
    try {
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(filename, screenshotBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '31536000',
        });
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('screenshots')
          .getPublicUrl(filename);
        screenshotUrl = urlData.publicUrl;
      }
    } catch (_e) {
      console.warn('Screenshot upload failed, continuing without screenshot');
    }

    await page.close();

    return {
      lighthouse: lhr as unknown as Record<string, unknown>,
      axe: axeResults as unknown as Record<string, unknown>,
      pageTitle,
      pageDescription,
      screenshotUrl,
    };
  } finally {
    await browser.close();
  }
}
