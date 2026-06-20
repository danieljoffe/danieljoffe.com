# API Documentation

This document provides comprehensive documentation for all API endpoints available in the Daniel Joffe portfolio website.

## Base URL

```
Production: https://danieljoffe.com/api
Development: http://localhost:3000/api
```

## Authentication

No authentication is required for public API endpoints. All endpoints implement security measures including:

- Rate limiting by IP address
- CAPTCHA verification (where applicable)
- Request source validation
- Input sanitization and validation

---

## Endpoints

### POST /api/email/contact

**Contact Form Submission**

Handles contact form submissions with comprehensive validation, rate limiting, and email delivery.

#### Request

**Headers:**

```http
Content-Type: application/json
Referer: https://danieljoffe.com/about (required)
```

**Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello, I'd like to get in touch about a potential collaboration...",
  "hcaptcha": "hcaptcha_token_here"
}
```

#### Request Schema

| Field      | Type   | Required | Constraints                      | Description                |
| ---------- | ------ | -------- | -------------------------------- | -------------------------- |
| `name`     | string | Yes      | 5-100 chars, letters/spaces only | Full name of sender        |
| `email`    | string | Yes      | 3-254 chars, valid email format  | Email address for reply    |
| `message`  | string | Yes      | 30-1000 chars, no URLs           | Message content            |
| `hcaptcha` | string | Yes      | Valid hCaptcha token             | CAPTCHA verification token |

#### Validation Rules

- **Name**: Must contain only letters, spaces, hyphens, and apostrophes
- **Email**: Must be a valid email format
- **Message**: Cannot contain URLs (anti-spam protection)
- **CAPTCHA**: Must be a valid hCaptcha token
- **Honeypot**: Hidden `address` field must be empty (anti-bot protection)

#### Response

**Success Response (200):**

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Email sent successfully"
}
```

**Error Response (400/403/429/500):**

```json
{
  "error": {
    "path": "email",
    "message": "Invalid email address"
  },
  "statusCode": 400
}
```

**Rate Limit Error (429):**

```json
{
  "error": {
    "path": "root.forbidden",
    "message": "Too many requests. Please try again later."
  },
  "statusCode": 429,
  "retryAfter": 812
}
```

The `Retry-After` HTTP header is also set on 429 responses.

#### Error Codes

| Error Path                | Status | Description                    |
| ------------------------- | ------ | ------------------------------ |
| `name`                    | 400    | Name validation failed         |
| `email`                   | 400    | Email format validation failed |
| `message`                 | 400    | Message validation failed      |
| `hcaptcha`                | 400    | CAPTCHA verification failed    |
| `root.forbidden`          | 403    | Invalid source or bot detected |
| `root.forbidden`          | 429    | Rate limit exceeded            |
| `root.configurationError` | 500    | Server configuration issue     |
| `root.serviceError`       | 500    | External service failure       |

#### Rate Limiting

- **Limit**: 5 requests per IP address
- **Window**: 15 minutes (900 seconds)
- **Response**: 429 Too Many Requests with `Retry-After` header

#### Security Features

1. **Bot Detection**: Vercel botid integration (production only)
2. **Source Validation**: Must be called from `/about` page
3. **Rate Limiting**: IP-based request throttling (429 with Retry-After)
4. **Input Sanitization**: All inputs sanitized with DOMPurify
5. **Anti-Spam**: URL detection and honeypot field
6. **CAPTCHA**: hCaptcha verification required

#### Example Usage

**JavaScript/Fetch:**

```javascript
const response = await fetch('/api/email/contact', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello, I would like to discuss a project opportunity...',
    hcaptcha: hcaptchaToken,
  }),
});

const result = await response.json();

if (result.success) {
  console.log('Email sent successfully!');
} else {
  console.error('Error:', result.error.message);
}
```

**cURL:**

```bash
curl -X POST https://danieljoffe.com/api/email/contact \
  -H "Content-Type: application/json" \
  -H "Referer: https://danieljoffe.com/about" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Hello, I would like to discuss a project opportunity...",
    "hcaptcha": "hcaptcha_token_here"
  }'
```

## Environment Variables

The API requires the following environment variables:

### Required for Production

```bash
# Application environment
NODE_ENV=production

# Email delivery (Resend) — required to send contact emails
RESEND_API_KEY=your_resend_api_key

# hCaptcha public site ID
NEXT_PUBLIC_HCAPTCHA_SITE_ID=your_hcaptcha_site_id
```

> See `apps/root/.env.example` for the complete list of supported variables.

### Development Setup

1. Copy environment template:

   ```bash
   cp apps/root/.env.example apps/root/.env.local
   ```

2. Fill in your API keys and configuration values

3. Restart the development server

---

## Testing

### Manual Testing

Use the contact form on the `/about` page or test directly with API clients.

### Automated Testing

The API endpoints are covered by:

- Unit tests for validation logic
- Integration tests with Playwright
- Error handling and edge case testing

Run tests:

```bash
# Unit tests
pnpm nx test root

# E2E tests including API
pnpm nx e2e root-e2e
```

### Rate Limit Testing

To test rate limiting, make multiple requests quickly:

```javascript
// This should trigger rate limiting after 5 requests
for (let i = 0; i < 10; i++) {
  fetch('/api/email/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      message:
        'Test message that is long enough to pass validation requirements...',
      hcaptcha: 'test_token',
    }),
  });
}
```

## Support & Contact

For API-related questions or issues:

- **Documentation Issues**: Create a GitHub issue
- **Technical Support**: Contact via the website's contact form
- **Security Concerns**: Email directly to hello@danieljoffe.com

---

## Changelog

### v1.0.0 (Current)

- Initial API implementation
- Contact form endpoint with full validation
- Rate limiting and security features
- Comprehensive error handling

---

> _Last updated: June 2026_
