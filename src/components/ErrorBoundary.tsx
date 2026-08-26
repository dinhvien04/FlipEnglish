import React, { Component, ReactNode, ErrorInfo } from 'react';
import { useI18n } from '../features/i18n';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-[50vh] flex items-center justify-center p-6"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto text-xl font-black">
              !
            </div>
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                {this.props.fallbackTitle || 'A newer version or network interruption occurred'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {this.props.fallbackMessage ||
                  'The requested screen could not be loaded. Please check your network connection and retry.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="min-h-11 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer inline-flex items-center justify-center"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="min-h-11 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold border border-slate-200 transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                Reload App
              </button>
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
      fallbackTitle={props.fallbackTitle || t('error.chunkLoadTitle')}
      fallbackMessage={props.fallbackMessage || t('error.chunkLoadDesc')}
      onReset={props.onReset}
    >
      {props.children}
    </ErrorBoundaryClass>
  );
};
