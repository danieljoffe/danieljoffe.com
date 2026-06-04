# Phase 1 Title Triage — Multi-Model Run

- Reference model: **haiku-4.5** (production baseline)
- Titles graded: **89** across 3 targets

## Per-model summary

| Model           | Agreement vs ref | FPR   | FNR   | Compared | $ total | Avg latency | Errors |
| --------------- | ---------------- | ----- | ----- | -------- | ------- | ----------- | ------ |
| sonnet-4.6      | 89.9%            | 10.0% | 10.3% | 89       | $0.0461 | 4344ms      | 0      |
| deepseek-v3.2   | 86.5%            | 14.0% | 12.8% | 89       | $0.0028 | 9760ms      | 0      |
| haiku-4.5 (ref) | —                | —     | —     | —        | $0.0154 | 2352ms      | 0      |

## Per-target agreement

| Target                                   | sonnet-4.6 | deepseek-v3.2 |
| ---------------------------------------- | ---------- | ------------- |
| Staff Frontend Engineer                  | 86.7%      | 83.3%         |
| Director of CX Operations & Transformati | 82.8%      | 75.9%         |
| Frontend Engineering Manager             | 100.0%     | 100.0%        |
