'use client';
import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center h-full p-8">
            <div className="max-w-md text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">Something went wrong</h2>
              <p className="text-sm text-gray-500 mb-4">An unexpected error occurred. Please try refreshing the page.</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-[#ec4899] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#db2777] transition shadow-sm"
              >
                Refresh page
              </button>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <pre className="mt-4 text-xs text-left bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              )}
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
