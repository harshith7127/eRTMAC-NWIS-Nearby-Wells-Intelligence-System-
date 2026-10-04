import React from 'react';
import { Info, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  type?: 'info' | 'warning';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionText,
  onAction,
  type = 'info'
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        textAlign: 'center',
        backgroundColor: 'var(--bg-surface-sunken)',
        border: '1px dashed var(--border-medium)',
        borderRadius: 'var(--radius-md)',
        margin: 'var(--space-3) 0',
        gap: 'var(--space-2)'
      }}
    >
      {type === 'warning' ? (
        <AlertCircle size={24} color="var(--alert-unknown-border)" />
      ) : (
        <Info size={24} color="var(--text-muted)" />
      )}
      {title && (
        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
          {title}
        </h4>
      )}
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', maxWidth: '340px', lineHeight: 1.4 }}>
        {message}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: 'var(--space-2)',
            padding: 'var(--space-1) var(--space-3)',
            backgroundColor: 'var(--color-brand-primary)',
            color: 'var(--color-brand-contrast)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-medium)'
          }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
