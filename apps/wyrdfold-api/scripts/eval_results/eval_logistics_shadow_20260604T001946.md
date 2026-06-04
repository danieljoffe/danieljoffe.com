# Phase 2 Logistics-Addendum Shadow Run

- Model: **sonnet-4.6** (anthropic/claude-sonnet-4.6)
- Paired cases: **89**
- Unpaired (schema fail / missing): 0

## Spearman ρ (logistics-off vs logistics-on)

| Axis                    | ρ          | Passes ≥0.9? |
| ----------------------- | ---------- | ------------ |
| title_fit               | 0.9749     | yes          |
| skills_fit              | 0.9778     | yes          |
| seniority_fit           | 0.9616     | yes          |
| domain_fit              | 0.9533     | yes          |
| **fit_score (overall)** | **0.9709** | yes          |

## Cost

- logistics OFF: $1.0121
- logistics ON: $1.2365
- total: $2.2486
