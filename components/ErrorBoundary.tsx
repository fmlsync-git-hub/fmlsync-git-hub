
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { addErrorLog } from '../services/firebase';
import { BugAntIcon } from './icons';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Log error to Firebase, ensure we only log strings
    addErrorLog(error.message, error.stack, errorInfo.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-text-primary p-4">
            <div className="text-center bg-surface p-8 rounded-lg shadow-lg border border-border-default max-w-lg">
                <BugAntIcon className="w-16 h-16 text-danger mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-text-primary">Something went wrong.</h1>
                <p className="mt-2 text-text-secondary">
                    An unexpected error has occurred. The development team has been notified.
                </p>
                <p className="mt-4 text-sm text-text-secondary">
                    Please try refreshing the page. If the problem persists, please contact support.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark transition-colors"
                >
                    Refresh Page
                </button>
            </div>
        </div>
      );
    }

    // Cast 'this' to 'any' to bypass TS error related to props access
    return (this as any).props.children;
  }
}

export default ErrorBoundary;