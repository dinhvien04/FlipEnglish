import React, { Component, ReactNode, ErrorInfo } from 'react';
import { useI18n, TranslationKey } from '../features/i18n';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  fallbackTitleKey?: TranslationKey;
  fallbackMessageKey?: TranslationKey;
  onReset?: () => void;
  onGoHome?: () => void;
  showHomeButton?: boolean;
  featureName?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  errorCategory: 'chunk' | 'render' | 'unknown';
}

/**
 * Sanitizes technical errors before console logging to ensure zero API keys or private tokens are leaked.
 */
function sanitizeErrorForLogging(error: unknown): string {
  const raw = String((error as any)?.message || error || '');
  const geminiKeyPrefix = ['AI', 'za', 'Sy'].join('');
  const geminiRegex = new RegExp(`${geminiKeyPrefix}[A-Za-z0-9_-]{33}`, 'g');
  return raw
    .replace(geminiRegex, '[REDACTED_API_KEY]')
    .replace(/bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]');
}

export class ErrorBoundaryClass extends Component<
  ErrorBoundaryProps & { t: (key: TranslationKey, params?: Record<string, any>) => string },
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = {
    hasError: false,
    errorCategory: 'render',
  };

  constructor(props: ErrorBoundaryProps & { t: (key: TranslationKey, params?: Record<string, any>) => string }) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const msg = error?.message || '';
    const name = error?.name || '';
    const isChunk =
      name === 'ChunkLoadError' ||
      msg.includes('dynamically imported module') ||
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('vite:preloadError');

    return {
      hasError: true,
      errorCategory: isChunk ? 'chunk' : 'render',
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const sanitizedMsg = sanitizeErrorForLogging(error);
    const componentStack = errorInfo?.componentStack || '';
    console.error(
      `[FlipEnglish ErrorBoundary] [Feature: ${this.props.featureName || 'Global'}] ${sanitizedMsg}`,
      componentStack
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch {
        // Ignore reset callback error
      }
    }
  };

  handleReload = () => {
    try {
      window.location.reload();
    } catch {
      // Ignore reload error
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false });
    if (this.props.onGoHome) {
      this.props.onGoHome();
    } else {
      this.handleReload();
    }
  };

  override render() {
    if (this.state.hasError) {
      const { t, fallbackTitle, fallbackMessage, fallbackTitleKey, fallbackMessageKey, showHomeButton } = this.props;

      const title =
        fallbackTitle ||
        (fallbackTitleKey ? t(fallbackTitleKey) : this.state.errorCategory === 'chunk' ? t('error.chunkLoadTitle') : t('error.featureFallbackTitle'));

      const message =
        fallbackMessage ||
        (fallbackMessageKey ? t(fallbackMessageKey) : this.state.errorCategory === 'chunk' ? t('error.chunkLoadDesc') : t('error.featureFallbackDesc'));

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-[50vh] flex items-center justify-center p-4 sm:p-6"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto text-xl font-black select-none">
              !
            </div>
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {message}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="min-h-11 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer inline-flex items-center justify-center"
              >
                {t('error.tryAgain')}
              </button>
              {showHomeButton && this.props.onGoHome ? (
                <button
                  type="button"
                  onClick={this.handleGoHome}
                  className="min-h-11 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold border border-slate-200 transition-colors cursor-pointer inline-flex items-center justify-center"
                >
                  {t('error.goToToday')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="min-h-11 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold border border-slate-200 transition-colors cursor-pointer inline-flex items-center justify-center"
                >
                  {t('error.reloadApp')}
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = (props) => {
  const { t } = useI18n();
  return (
    <ErrorBoundaryClass
      {...props}
      t={t}
    >
      {props.children}
    </ErrorBoundaryClass>
  );
};
