'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ModalErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
}

interface ModalErrorBoundaryState {
  hasError: boolean;
}

/**
 * Specialized error boundary for Modal components.
 * Modal crashes can leave the app in a bad state (scroll locked, backdrop stuck).
 * This boundary ensures cleanup happens even on error.
 */
export class ModalErrorBoundary extends Component<
  ModalErrorBoundaryProps,
  ModalErrorBoundaryState
> {
  override state: ModalErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ModalErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (process.env['NODE_ENV'] === 'development') {
      console.error('[Modal] Render error:', error, errorInfo);
    }
    // Ensure body scroll is restored on error
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'unset';
    }
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
