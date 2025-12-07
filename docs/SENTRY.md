# Sentry Error Tracking

This document explains how to set up and use Sentry for error tracking in Nevous CRM.

## Overview

Sentry is configured for both the backend (Node.js/Fastify) and frontend (React) to capture and report errors automatically.

## Setup

### 1. Create a Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new project (select Node.js for backend, React for frontend)
3. Copy your DSN from **Project Settings → Client Keys**

### 2. Configure Environment Variables

Add the following to your environment:

```bash
# Backend - add to .env or Fly.io secrets
SENTRY_DSN=https://your-key@sentry.io/your-project-id

# Frontend - add to .env (must be present at build time)
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
```

### 3. Deploy

For Fly.io deployment:

```bash
# Set backend secret
fly secrets set SENTRY_DSN=https://your-key@sentry.io/your-project-id

# Frontend DSN must be set at build time
# Add to your build command or CI environment
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id npm run build
```

## Features

### Backend (`src/lib/sentry.ts`)

- **Automatic error capture**: All unhandled errors are reported
- **Request context**: URL, method, user ID, and team ID are included
- **Privacy protection**: Auth headers and cookies are filtered out
- **Graceful shutdown**: Sentry flushes before process exit

### Frontend (`web/src/lib/sentry.ts`)

- **Error boundary**: Catches React component errors with fallback UI
- **Session replay**: Records user sessions for debugging (masked for privacy)
- **Browser tracing**: Performance monitoring for page loads
- **Noise filtering**: Ignores network errors and browser extension issues

## Usage

### Manually Capturing Errors

```typescript
// Backend
import { captureError } from './lib/sentry.js';

try {
  // risky operation
} catch (error) {
  captureError(error as Error, { 
    context: 'additional info',
    userId: 'user123'
  });
}
```

```typescript
// Frontend
import { captureError } from './lib/sentry';

try {
  // risky operation
} catch (error) {
  captureError(error as Error, { component: 'MyComponent' });
}
```

### Setting User Context

After login, set the user context to associate errors with users:

```typescript
// Backend
import { setUserContext } from './lib/sentry.js';
setUserContext(userId, teamId);

// Frontend
import { setUserContext } from './lib/sentry';
setUserContext(userId);
```

On logout, clear the context:

```typescript
import { clearUserContext } from './lib/sentry';
clearUserContext();
```

## Configuration Options

### Sample Rates

Adjust in `src/lib/sentry.ts` (backend) or `web/src/lib/sentry.ts` (frontend):

```typescript
// Capture 10% of transactions in production, 100% in development
tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,

// Capture 10% of sessions, 100% of sessions with errors
replaysSessionSampleRate: 0.1,
replaysOnErrorSampleRate: 1.0,
```

### Ignored Errors (Frontend)

Common noise is filtered out by default:

- Network errors (`Failed to fetch`, `Load failed`)
- User-initiated aborts (`AbortError`)
- Browser extension errors

Add more to the `ignoreErrors` array if needed.

## Troubleshooting

### Errors not appearing in Sentry

1. Check that the DSN is correctly set
2. Verify the environment variable is loaded (check logs for "Sentry initialized successfully")
3. Ensure the error isn't being caught and handled silently
4. Check Sentry's rate limits haven't been exceeded

### Frontend DSN not working

The `VITE_SENTRY_DSN` must be present at **build time**, not runtime. Rebuild after setting the variable.

### Too many errors

Adjust the sample rates or add specific errors to `ignoreErrors`.
