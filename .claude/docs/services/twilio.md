# Twilio

## What it does in this app

Sends SMS notifications when a newly polled job clears a user's `sms_score_threshold`. Configurable per-profile daily rate limit (`sms_daily_limit`, default 5). At-most-once semantics via the `job_notification_sent` dedup table.

- Trigger: `poller.py` after each poll cycle calls `send_sms_alerts_for_new_jobs()`
- Body format: `Great match: <title> at <company> (score: NN). https://<host>/fitted/jobs/<id>`
- Channel column on `job_notification_sent` is `'sms'` (separate from `'email'` so a user can get both for the same role)

## Get an API key

1. Sign in at https://console.twilio.com
2. Account → **Account Info** in the top-right tile
   - **Account SID** — `AC…` (not secret, but identifies the account)
   - **Auth Token** — click to reveal; rotate if exposed
3. Phone Numbers → **Manage → Active numbers** → buy a number
   - For US SMS, also complete A2P 10DLC registration (Messaging → Regulatory Compliance) — cheap toll-free numbers also work for personal/dev volumes

**Trial accounts** can only send to verified phone numbers. Verify your own cell first under Phone Numbers → Verified Caller IDs before testing.

## Env vars

In `apps/job-api/.env`:

```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...        # secret
TWILIO_PHONE_NUMBER=+15555550100
```

If any are unset, `send_sms_alerts_for_new_jobs()` logs `SMS alerts skipped: Twilio credentials not configured` and the poller continues without SMS.

## Validate the key

```bash
curl -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json"
```

A 200 with `friendly_name`, `status: active` means auth is good. 401 = bad SID/token combo.

Send a real test SMS:

```bash
curl -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json" \
  --data-urlencode "From=$TWILIO_PHONE_NUMBER" \
  --data-urlencode "To=+1<your-cell>" \
  --data-urlencode "Body=Twilio test from job-api"
```

End-to-end: enable SMS for your user_profile (`sms_notifications_enabled=true`, set `phone_number`, lower `sms_score_threshold` to e.g. 50), then trigger a manual poll and check the dedup table:

```sql
select id, channel, sent_at, score_at_send, external_id
from job_notification_sent
where channel = 'sms'
order by sent_at desc limit 5;
```

## Cost / billing dashboard

- Usage: https://console.twilio.com/us1/monitor/usage
- Per-message US SMS is currently ~$0.0079 (long code) or ~$0.04 toll-free, with carrier fees on top — check the live pricing on their site
- This service does **not** write to `llm_cost_log`. Track spend in the Twilio console.

## Where it's wired

- SMS sender: `apps/job-api/app/services/notify.py:312` (`_send_twilio_sms`)
- Cached client: `apps/job-api/app/services/notify.py:299` (`_get_twilio_client`)
- Fan-out + rate limit: `apps/job-api/app/services/notify.py:175` (`send_sms_alerts_for_new_jobs`)
- Per-user opt-in fields on `user_profiles`: `phone_number`, `sms_notifications_enabled`, `sms_score_threshold`, `sms_daily_limit`

## Common errors

| Symptom                                          | Cause                                 | Fix                                                            |
| ------------------------------------------------ | ------------------------------------- | -------------------------------------------------------------- |
| `HTTP 401 Authenticate`                          | wrong SID/auth-token combo            | re-copy from console; restart job-api                          |
| `21408` permission denied to send to that number | trial account, recipient not verified | verify the recipient under Phone Numbers → Verified Caller IDs |
| `21610` recipient unsubscribed                   | user replied STOP                     | nothing to do — Twilio enforces this; clear in their console   |
| `21211` invalid 'To' phone number                | E.164 format missing                  | store phone numbers as `+15555550100`, no spaces or dashes     |
| Daily-limit hit immediately                      | `sms_daily_limit` defaults to 5       | bump it on the user_profile row, or wait for the next UTC day  |
| Message sent but never arrives                   | A2P 10DLC unregistered (US long code) | register your sender in Messaging → Regulatory Compliance      |
