// Initialize Sentry first
import { initSentry, SentryErrorBoundary } from './lib/sentry';
initSentry();

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Fallback UI for error boundary
function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h1>
        <p className="text-muted-foreground mb-4">
          We've been notified and are working on a fix.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SentryErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </SentryErrorBoundary>
  </React.StrictMode>
);
