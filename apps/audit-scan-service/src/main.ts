import express from 'express';
import cors from 'cors';
import { calculateGrade } from '@danieljoffe.com/shared-audit';
import { authMiddleware } from './middleware/auth.js';
import { runScan } from './scanner.js';
import { parseIssues } from './issues.js';
import { supabase } from './supabase.js';

const app = express();
const PORT = process.env['PORT'] || 3001;
const origin = process.env['ALLOWED_ORIGIN'] || 'https://danieljoffe.com';

app.use(
  cors({
    origin,
  })
);
app.use(express.json());

const MAX_CONCURRENT_SCANS = 2;
let activeScans = 0;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/run-scan', authMiddleware, (req, res) => {
  const { scan_id, url, device_mode } = req.body as {
    scan_id?: string;
    url?: string;
    device_mode?: string;
  };
  const device =
    device_mode === 'mobile' || device_mode === 'desktop'
      ? device_mode
      : 'mobile';

  if (!scan_id || !url) {
    res.status(400).json({ error: 'Missing scan_id or url' });
    return;
  }

  if (activeScans >= MAX_CONCURRENT_SCANS) {
    res.status(503).json({ error: 'Service busy. Try again shortly.' });
    return;
  }

  // Respond immediately — scan runs async
  res.json({ status: 'accepted', scan_id });

  activeScans++;

  const SCAN_TIMEOUT_MS = 90_000;

  (async () => {
    try {
      await supabase
        .from('scans')
        .update({ status: 'running' })
        .eq('id', scan_id);

      const results = await Promise.race([
        runScan(url, device),
        new Promise<never>((_resolve, reject) =>
          setTimeout(
            () => reject(new Error('Scan timed out after 90s')),
            SCAN_TIMEOUT_MS
          )
        ),
      ]);

      const issues = parseIssues(results.lighthouse, results.axe);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const categories = (results.lighthouse as any)['categories'] as Record<
        string,
        { score?: number }
      >;
      const scores = {
        performance: Math.round((categories['performance']?.score ?? 0) * 100),
        accessibility: Math.round(
          (categories['accessibility']?.score ?? 0) * 100
        ),
        seo: Math.round((categories['seo']?.score ?? 0) * 100),
        bestPractices: Math.round(
          (categories['best-practices']?.score ?? 0) * 100
        ),
      };

      const grade = calculateGrade(scores);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audits = (results.lighthouse as any)['audits'] as Record<
        string,
        { numericValue?: number }
      >;
      const fcp = audits['first-contentful-paint']?.numericValue ?? null;
      const lcp = audits['largest-contentful-paint']?.numericValue ?? null;
      const tbt = audits['total-blocking-time']?.numericValue ?? null;
      const clsValue = audits['cumulative-layout-shift']?.numericValue ?? null;
      const si = audits['speed-index']?.numericValue ?? null;

      await supabase
        .from('scans')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          score_performance: scores.performance,
          score_accessibility: scores.accessibility,
          score_best_practices: scores.bestPractices,
          score_seo: scores.seo,
          grade_overall: grade.grade,
          fcp_ms: fcp,
          lcp_ms: lcp,
          tbt_ms: tbt,
          cls: clsValue,
          si_ms: si,
          page_title: results.pageTitle,
          page_description: results.pageDescription,
          page_screenshot_url: results.screenshotUrl,
          lighthouse_raw: results.lighthouse,
          axe_raw: results.axe,
        })
        .eq('id', scan_id);

      if (issues.length > 0) {
        await supabase.from('scan_issues').insert(
          issues.map((issue, index) => ({
            scan_id,
            category: issue.category,
            severity: issue.severity,
            title: issue.title,
            description: issue.description,
            impact: issue.impact,
            fix_difficulty: issue.fix_difficulty,
            technical_detail: issue.technical_detail,
            sort_order: index,
          }))
        );
      }

      console.log(
        `Scan completed: ${scan_id} | ${device} | Grade: ${grade.grade} | Issues: ${issues.length}`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Scan failed: ${scan_id}`, message);

      await supabase
        .from('scans')
        .update({
          status: 'failed',
          error_message: message,
        })
        .eq('id', scan_id);
    } finally {
      activeScans--;
    }
  })();
});

app.listen(PORT, () => {
  console.log(`Scan service running on port ${PORT}`);
});
