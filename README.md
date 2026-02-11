<div align="center">
  <picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/logo-light.svg">
  <img src="assets/logo-light.svg" alt="Blitzpack Logo" height="200">
  </picture>
  <h1>Blitzpack</h1>
  <p>Full-stack TypeScript monorepo template with Next.js, Fastify, and Turborepo. From zero to production in hours.</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-≥20.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-≥9.0.0-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![CI](https://github.com/CarboxyDev/blitzpack/actions/workflows/ci.yml/badge.svg)](https://github.com/CarboxyDev/blitzpack/actions/workflows/ci.yml)

</div>

## Why Blitzpack?

Most full-stack templates give you a folder structure and routing. Blitzpack gives you a complete, production-ready application with authentication, admin controls, API infrastructure, observability and several more battle-tested features. You get a solid frictionless foundation to build your next product on.

What normally takes 2-3 weeks of infrastructure work is ready in a single command.

- **Truly Production-Ready**: Auth flows, rate limiting, structured logging, testing infrastructure and more are configured for production from day one.

- **Built for Zero Friction**: Unified tooling, shared packages, monorepo structure and full TypeScript support ensures that all components work seamlessly together.
- **No Assembly Required**: Auth flows, email system, admin dashboard, and other core features are already wired up and ready to use. No more wasting time setting up from scratch.

- **True full-stack type safety**: Zod schemas validate once, protect everywhere. From API requests to database queries to UI forms.

- **Authentication Made Easy**: Login, Sign-up, Email verification, password reset, OAuth (Google/GitHub), role-based access control, session management, and user banning. All wired up and working. Not TODOs but actual implementations.
- **Modern UI out of the box** - You get beautiful components with shadcn/ui, Tailwind v4, dark/light mode, theme support and smooth animations.

- **Hassle-Free Database** - Prisma ORM with PostgreSQL, easy migrations and Docker setup that just works.

- **AI Agent Ready**: The bundled CLAUDE.md documentation gives AI agents instant context about the structure. Ship faster with AI that understands your whole stack.

## Quick Start

```bash
pnpm create blitzpack
```

The setup wizard will guide you through project creation and next steps. Make sure you have Docker installed and running on your machine.

During setup, choose a profile:

- **Recommended**: Core app with everything included.
- **Platform-Agnostic**: Core app without dockerfiles.
- **Modular**: Core app with features of your choice.

If you choose **Modular**, the wizard opens feature customization before scaffolding.

**What's running after setup:**

- Web: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:8080/api](http://localhost:8080/api)
- API Docs: [http://localhost:8080/docs](http://localhost:8080/docs)

## Tech Stack

**Web**

- Next.js 16
- React 19
- Tailwind CSS v4 for styling
- shadcn/ui for UI primitives
- TanStack Query for server state
- React Hook Form for forms
- Recharts for data visualization

**API**

- Fastify 5
- Prisma 7 and PostgreSQL 17
- Better-auth for authentication
- Pino for structured logging
- Scalar for API docs
- React Email and Resend for emails
- AWS S3 for file storage

**Monorepo**

- Turborepo
- pnpm workspaces
- Vitest for testing
- Husky and lint-staged for git hooks
- Shared packages for types, utils, config in `packages/`

## Project Structure

```
blitzpack/
├── apps/
│   ├── web/                   # Next.js frontend (port 3000)
│   │   ├── Dockerfile         # Web container image (optional deployment)
│   │   ├── src/
│   │   │   ├── app/           # Pages and layouts
│   │   │   ├── components/    # React components
│   │   │   ├── lib/           # API client, utilities
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   └── store/         # Jotai state atoms
│   │   └── public/            # Static assets
│   │
│   └── api/                   # Fastify API (port 8080)
│       ├── Dockerfile         # API container image (optional deployment)
│       ├── src/
│       │   ├── routes/        # API endpoints
│       │   ├── services/      # Business logic
│       │   ├── plugins/       # Fastify plugins
│       │   ├── hooks/         # Request hooks (auth, validation)
│       │   └── config/        # Configuration files
│       ├── prisma/            # Database schema & migrations
│       └── emails/            # React Email templates
│
├── packages/
│   ├── types/                 # Shared types and Zod schemas
│   ├── utils/                 # Shared utilities
│   ├── ui/                    # Shared UI components
│   └── tailwind-config/       # Shared Tailwind configuration
│
├── deploy/
│   └── docker/
│       └── docker-compose.prod.yml  # Local production Docker stack (optional)
├── docker-compose.yml         # Development services (PostgreSQL)
├── .github/workflows/cd.yml   # Optional CD pipeline for Docker image publishing
├── turbo.json                 # Turborepo configuration
└── pnpm-workspace.yaml        # pnpm workspaces configuration
```

## Features

### Authentication & Authorization

Production-ready auth system powered by Better Auth:

- **Email/Password Auth**: User signup with email verification, secure password hashing, password reset flow, and password change functionality.
- **OAuth Integration**: Google and GitHub OAuth providers ready to enable with environment variables.
- **Role-Based Access Control**: Three user roles (user, admin, super_admin) with role-based route protection and API authorization.
- **Session Management**: 7-day sessions with automatic refresh, secure cookie-based authentication, and cross-domain support.
- **User Banning**: Ban users temporarily or permanently with custom reasons and automatic expiration handling.
- **Email Verification**: Send verification emails on signup with resend capability and verification status tracking.

**Included pages:** `/login`, `/signup`, `/forgot-password`, `/reset-password`

### Admin Dashboard

Complete admin control panel with real-time monitoring and management:

- **System Monitoring**: Real-time metrics dashboard with user growth trends, session activity, role distribution, and system health indicators. Auto-refresh functionality with configurable intervals.
- **User Management**: Full CRUD operations on users with pagination, sorting, and filtering. Create, edit, ban/unban users with expiration dates, and manage user roles.
- **Session Management**: View all active sessions across the platform, inspect session details (IP, device, timestamps), and revoke individual or all user sessions.

**Included pages:** `/admin`, `/admin/users`, `/admin/sessions`

### API Infrastructure

Battle-tested API architecture:

- **Comprehensive Routes**: RESTful API endpoints for users, sessions, uploads, stats, metrics, and admin operations.
- **Validation**: Automatic request/response validation with Zod schemas and type-safe route definitions.
- **Security**: Helmet security headers, CORS configuration, role-based rate limiting, and cookie signing.
- **Logging**: Structured logging with Pino featuring 4 verbosity levels, request ID tracing, and performance metrics.
- **Documentation**: Auto-generated OpenAPI specs with interactive Scalar API documentation.

### Developer Experience

Optimized workflows and tooling:

- **CLI Tool**: `create-blitzpack` interactive setup wizard for instant project scaffolding.
- **Comprehensive Scripts**: Development, build, test, lint, and database management commands.
- **Testing Suite**: Vitest-powered unit and integration tests with coverage reporting.
- **Git Hooks**: Pre-commit linting and formatting, pre-push type checking and testing.
- **Turborepo**: Smart caching, parallel execution, and dependency tracking.
- **Docker Compose**: PostgreSQL database containerized for consistent local development.
- **Optional Deployment Assets**: Dockerfiles for API/Web plus CD workflow for image publishing.

### Email System

Transactional email infrastructure with beautiful templates:

- **React Email Templates**: Pre-built email templates for verification, password reset, password change, welcome, and account deletion.
- **Resend Integration**: Production-ready email sending with Resend API.
- **Development Preview**: Console logging of emails in development with React Email dev server.
