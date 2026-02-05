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

### POST /api/email

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
| `message`  | string | Yes      | 30-5000 chars, no URLs           | Message content            |
| `hcaptcha` | string | Yes      | Valid hCaptcha token             | CAPTCHA verification token |

#### Validation Rules

- **Name**: Must contain only letters, spaces, hyphens, and apostrophes
- **Email**: Must be a valid email format and pass deliverability check
- **Message**: Cannot contain URLs (anti-spam protection)
- **CAPTCHA**: Must be a valid hCaptcha token
- **Honeypot**: Hidden `address` field must be empty (anti-bot protection)

#### Response

**Success Response (200):**

```json
{
  "statusCode": 200,
  "success": true,
  "body": {
    "data": {},
    "message": "Email sent successfully"
  }
}
```

**Error Response (200/400/403/500):**

```json
{
  "error": {
    "path": "email",
    "message": "Invalid email address"
  },
  "statusCode": 200
}
```

#### Error Codes

| Error Path                | Status | Description                           |
| ------------------------- | ------ | ------------------------------------- |
| `name`                    | 200    | Name validation failed                |
| `email`                   | 200    | Email format or deliverability issue  |
| `message`                 | 200    | Message validation failed             |
| `hcaptcha`                | 200    | CAPTCHA verification failed           |
| `root.forbidden`          | 403    | Rate limit exceeded or invalid source |
| `root.configurationError` | 200    | Server configuration issue            |
| `root.serviceError`       | 200    | External service failure              |

#### Rate Limiting

- **Limit**: 5 requests per IP address
- **Window**: 15 minutes (900 seconds)
- **Response**: 403 Forbidden when exceeded

#### Security Features

1. **Source Validation**: Must be called from `/about` page
2. **Rate Limiting**: IP-based request throttling
3. **Input Sanitization**: All inputs sanitized with DOMPurify
4. **Email Validation**: Real-time deliverability checking via ValidKit
5. **Anti-Spam**: URL detection and honeypot field
6. **CAPTCHA**: hCaptcha verification required

#### Example Usage

**JavaScript/Fetch:**

```javascript
const response = await fetch('/api/email', {
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
curl -X POST https://danieljoffe.com/api/email \
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
# Email validation service
VALIDKIT_API_KEY=your_validkit_api_key
VALIDKIT_API_URL=https://api.validkit.io/v1/validate

# Email delivery service
WEB3FORMS_ACCESS_KEY=your_web3forms_access_key
WEB3FORMS_API_URL=https://api.web3forms.com/submit

# Application environment
NODE_ENV=production

# Public environment variables
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_hcaptcha_site_key
```

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
yarn test

# E2E tests including API
yarn test:e2e
```

### Rate Limit Testing

To test rate limiting, make multiple requests quickly:

```javascript
// This should trigger rate limiting after 5 requests
for (let i = 0; i < 10; i++) {
  fetch('/api/email', {
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

_This documentation is automatically updated with each release. Last updated: December 2024_
