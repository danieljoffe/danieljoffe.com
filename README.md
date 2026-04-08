# Daniel Joffe - Portfolio Website

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.1.13-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Nx](https://img.shields.io/badge/Nx-21.4.1-143055?logo=nx)](https://nx.dev/)

> **A modern, performant portfolio website showcasing 8+ years of full-stack engineering expertise**

Live at: [danieljoffe.com](https://danieljoffe.com)

---

## 🚀 About

This is the personal portfolio website of Daniel Joffe, a Senior Software Engineer specializing in full-stack development, technical leadership, and performance optimization. The site showcases professional experience, achievements, methodologies, and project work through an accessible, fast, and modern web experience.

### Key Features

- 📱 **Fully Responsive Design** - Optimized for all devices and screen sizes
- ⚡ **Performance Optimized** - Built with Next.js 16 and advanced optimization techniques
- ♿ **Accessibility First** - WCAG compliant with proper semantic markup
- 🎨 **Modern UI/UX** - Beautiful, clean design with smooth animations using GSAP
- 📊 **Analytics & Monitoring** - Integrated with Google Analytics, Vercel Analytics, and Sentry
- 🔍 **SEO Optimized** - Comprehensive meta tags, structured data, and OpenGraph support
- 📧 **Contact Form** - Secure contact form with hCaptcha protection
- 📱 **PWA Ready** - Service worker implementation for offline capabilities

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19.1.1
- **Language**: TypeScript 5.9.2
- **Styling**: Tailwind CSS 4.1.13
- **Animations**: GSAP 3.13.0
- **Icons**: Lucide React

### Development & Build Tools

- **Monorepo**: Nx 21.4.1
- **Package Manager**: pnpm
- **Linting**: ESLint 9 with custom configuration
- **Testing**: Jest + React Testing Library
- **E2E Testing**: Playwright
- **Component Development**: Storybook 9.1.4

### Production & Monitoring

- **Analytics**: Google Analytics, Vercel Analytics
- **Performance**: Vercel Speed Insights
- **Error Tracking**: Sentry
- **Form Protection**: hCaptcha
- **Image Optimization**: Next.js Image + Unsplash integration

---

## 📁 Project Structure

```
├── apps/
│   ├── root/              # Main Next.js 16 application (App Router)
│   │   └── src/
│   │       ├── app/       # Pages, API routes, and page-level components
│   │       ├── components/
│   │       │   └── kit/   # Next.js-specific shared components (Spinner, Pagination, etc.)
│   │       ├── hooks/     # Custom React hooks (useTableSort, useAdminTableFetch, etc.)
│   │       ├── lib/       # Utilities (cn, formStyles, badgeStyles, layoutStyles, etc.)
│   │       ├── state/     # Global state management (Toast, etc.)
│   │       ├── types/     # TypeScript type definitions
│   │       └── utils/     # Helper functions and constants
│   ├── root-e2e/          # Playwright E2E tests
│   └── audit-scan-service/ # Express Lighthouse/axe audit service
├── libs/
│   └── shared/
│       ├── ui/            # Shared React component library (34 components)
│       └── audit/         # Shared audit types and utilities
```

## 📚 Documentation

- **API_DOCUMENTATION.md** - Complete API reference with examples in each api route
- **[Testing Guide](./TESTING.md)** - Comprehensive testing and QA documentation
- **Component Documentation** - Available via Storybook (`pnpm storybook`)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/danieljoffe/danieljoffe.com.git
   cd danieljoffe.com
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp apps/root/.env.example apps/root/.env.local
   # Edit the .env.local file with your configuration
   ```

4. **Start the development server**

   ```bash
   pnpm nx dev root
   ```

   The application will be available at `http://localhost:3000`

---

## 📜 Available Scripts

### Development

```bash
# Start development server
pnpm nx dev root

# Build for production
pnpm nx build root

# Start production server
pnpm nx start root

# Run linting
pnpm nx lint root

# Run tests
pnpm nx test root

# Run E2E tests
pnpm nx e2e root-e2e
```

### Development Tools

```bash
# Start Storybook (root app)
pnpm nx storybook root

# Start Storybook (shared UI library)
pnpm nx storybook @danieljoffe.com/shared-ui

# Generate project graph
pnpm nx graph
```

---

## 🧪 Testing

The project includes comprehensive testing setup:

- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Playwright with multiple browser support
- **Component Testing**: Storybook for visual component development
- **Linting**: ESLint with custom rules for code quality

```bash
# Run app unit tests
pnpm nx test root

# Run shared UI library tests
pnpm nx test @danieljoffe.com/shared-ui

# Run E2E tests
pnpm nx e2e root-e2e

# Run tests in watch mode
pnpm nx test root --watch
```

---

## 📊 Performance & Monitoring

The application includes several performance and monitoring features:

- **Core Web Vitals Tracking**: Automated performance monitoring
- **Error Boundary**: React error boundaries with Sentry integration
- **Service Worker**: Caching and offline functionality
- **Image Optimization**: Next.js Image component with Unsplash integration
- **Bundle Analysis**: Webpack bundle analyzer for optimization

---

## 🌐 Deployment

The application is optimized for deployment on Vercel:

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - automatic deployments on push to main branch

### Environment Variables

Key environment variables needed for production:

```bash
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=your_ga_id
SENTRY_DSN=your_sentry_dsn
HCAPTCHA_SITE_KEY=your_hcaptcha_site_key
HCAPTCHA_SECRET_KEY=your_hcaptcha_secret_key
```

---

## 🤝 Contributing

This is a personal portfolio project, but if you'd like to suggest improvements:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Commit your changes (`git commit -am 'Add some improvement'`)
4. Push to the branch (`git push origin feature/improvement`)
5. Create a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📬 Contact

**Daniel Joffe**  
Senior Software Engineer

- 🌐 Website: [danieljoffe.com](https://danieljoffe.com)
- 💼 LinkedIn: [linkedin.com/in/danieljoffe](https://linkedin.com/in/danieljoffe)
- 🐙 GitHub: [github.com/danieljoffe](https://github.com/danieljoffe)
- 📧 Email: hello@danieljoffe.com

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [React](https://reactjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Animated with [GSAP](https://greensock.com/gsap/)
- Icons by [Lucide](https://lucide.dev/)
- Images from [Unsplash](https://unsplash.com/)
- Hosted on [Vercel](https://vercel.com/)
