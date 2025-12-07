import * as Sentry from '@sentry/node';
import { config } from './config.js';

export function initSentry(): void {
  if (!config.sentryDsn) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing
    // Adjust this value in production for better performance
    tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,

    // Capture unhandled promise rejections
    integrations: [
      Sentry.onUnhandledRejectionIntegration(),
    ],

    // Don't send PII by default
    sendDefaultPii: false,

    // Filter out sensitive data from breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Don't log auth-related URLs in breadcrumbs
      if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
        const url = breadcrumb.data.url as string;
        if (url.includes('/auth/')) {
          breadcrumb.data.url = url.split('?')[0]; // Strip query params
        }
      }
      return breadcrumb;
    },

    // Filter sensitive data from events
    beforeSend(event) {
      // Remove any potential tokens from the event
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      return event;
    },
  });

  console.log('Sentry initialized successfully');
}

// Export Sentry for use in other files
export { Sentry };

// Helper to capture errors with additional context
export function captureError(error: Error, context?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

// Helper to capture messages
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

// Helper to set user context (call after authentication)
export function setUserContext(userId: string, teamId: string): void {
  Sentry.setUser({
    id: userId,
    // Don't include email/name to avoid PII
  });
  Sentry.setTag('team_id', teamId);
}

// Helper to clear user context (call on logout)
export function clearUserContext(): void {
  Sentry.setUser(null);
}
