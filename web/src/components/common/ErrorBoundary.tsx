import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 'var(--space-6)',
            backgroundColor: 'var(--alert-concern-bg)',
            border: '1px solid var(--alert-concern-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--alert-concern-text)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-2)'
          }}
        >
          <AlertTriangle size={28} />
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'bold' }}>
            {this.props.fallbackTitle || 'Component Error'}
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
            Could not render this component. Details: {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: 'var(--space-1) var(--space-3)',
              backgroundColor: 'var(--alert-concern-text)',
              color: '#ffffff',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-xs)'
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
