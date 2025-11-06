// Simple client-side error logging utility
// Can be extended to send to external services like Sentry, LogRocket, etc.

interface ErrorLog {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  context?: Record<string, any>;
  stack?: string;
  userAgent?: string;
  url?: string;
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';
  private apiEndpoint = process.env.NEXT_PUBLIC_API_URL || 'https://api.chain-scope.dev';

  private createLog(level: ErrorLog['level'], message: string, context?: Record<string, any>, error?: Error): ErrorLog {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        environment: process.env.NODE_ENV,
      },
      stack: error?.stack,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };
  }

  private async sendToServer(log: ErrorLog) {
    // In production, you could send to your API or external service
    if (this.isProduction) {
      try {
        // For now, just log to console in production
        // TODO: Send to actual logging service
        console.error('[Logger]', log);

        // Example: Send to your API
        // await fetch(`${this.apiEndpoint}/api/logs`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(log),
        // });
      } catch (err) {
        // Fail silently - don't want logging errors to crash the app
        console.error('Failed to send log:', err);
      }
    }
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    const log = this.createLog('error', message, context, error);
    console.error(message, error, context);
    this.sendToServer(log);
  }

  warn(message: string, context?: Record<string, any>) {
    const log = this.createLog('warn', message, context);
    console.warn(message, context);
    if (this.isProduction) {
      this.sendToServer(log);
    }
  }

  info(message: string, context?: Record<string, any>) {
    const log = this.createLog('info', message, context);
    console.info(message, context);
  }

  // Track user actions for analytics
  track(event: string, properties?: Record<string, any>) {
    if (this.isProduction) {
      // TODO: Send to analytics service (Google Analytics, Mixpanel, etc.)
      console.log('[Analytics]', event, properties);
    }
  }
}

export const logger = new Logger();
