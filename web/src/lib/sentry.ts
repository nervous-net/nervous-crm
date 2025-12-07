import * as Sentry from '@sentry/react';

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.PROD ? 'production' : 'development',

    // Set tracesSampleRate to capture performance data
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Capture replay sessions for debugging
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text content for privacy
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Don't send PII
    sendDefaultPii: false,

    // Filter out noisy errors
    ignoreErrors: [
      // Network errors that aren't actionable
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      // User-initiated navigation
      'AbortError',
      // Browser extensions
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
    ],

    // Filter sensitive data from events
    beforeSend(event) {
      // Remove any potential tokens from URLs
      if (event.request?.url) {
        event.request.url = event.request.url.split('?')[0];
      }
      return event;
    },
  });

  console.log('Sentry initialized successfully');
}

// Export Sentry for use in components
export { Sentry };

// Error boundary component for React
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Helper to capture errors with context
export function captureError(error: Error, context?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

// Helper to set user context (call after login)
export function setUserContext(userId: string): void {
  Sentry.setUser({ id: userId });
}

// Helper to clear user context (call on logout)
export function clearUserContext(): void {
  Sentry.setUser(null);
}
