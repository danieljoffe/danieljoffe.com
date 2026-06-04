# Slim Target Derivation — Sonnet 4.6 vs 4.5

- Baseline model: **sonnet-4.6**

## Per-model summary

| Model      | Schema OK | Mean hint Jaccard | Mean keyword Jaccard | $ total | Avg latency | Errors |
| ---------- | --------- | ----------------- | -------------------- | ------- | ----------- | ------ |
| sonnet-4.5 | 5/10      | 0.4048            | 0.5485               | $0.2362 | 15104ms     | 5      |
| sonnet-4.6 | 7/10      | —                 | —                    | $0.2529 | 19383ms     | 3      |

## Per-label comparison (Sonnet 4.5 vs Sonnet 4.6)

| Label                            | Hint Jaccard          | Keyword Jaccard | Seniority match | Desc len (4.6 / 4.5) |
| -------------------------------- | --------------------- | --------------- | --------------- | -------------------- |
| Staff Frontend Engineer          | 0.2105                | 0.5263          | yes             | 784 / 545            |
| Director of CX Operations        | 0.5333                | 0.7692          | yes             | 784 / 746            |
| Senior Data Scientist            | candidate schema FAIL | —               | —               | —                    |
| Head of Content                  | 0.4706                | 0.35            | yes             | 695 / 598            |
| Plant Operations Manager         | candidate schema FAIL | —               | —               | —                    |
| Engineering Manager, Platform    | baseline schema FAIL  | —               | —               | —                    |
| Principal Product Designer       | candidate schema FAIL | —               | —               | —                    |
| VP of Customer Success           | baseline schema FAIL  | —               | —               | —                    |
| Senior DevOps Engineer           | baseline schema FAIL  | —               | —               | —                    |
| Director of Marketing Operations | candidate schema FAIL | —               | —               | —                    |
