/**
 * Top-level Application Router & Security Coordinator — SIH-121
 * Protects platform routes with cryptographic session verification.
 * Handles /legacy route forwarding and deep linking.
 */

import React, { useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { LoginPage } from '../features/auth/LoginPage';
import { useAuthStore } from '../store/useAuthStore';
import { useUrlSync } from '../hooks/useUrlSync';

export const AppRouter: React.FC = () => {
  const { isAuthenticated, checkSession } = useAuthStore();

  useUrlSync();

  useEffect(() => {
    // Validate session on mount and monitor expiration
    checkSession();

    // If the user navigates directly to /legacy on the client side, redirect to static legacy entry
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/legacy')) {
      window.location.href = '/legacy/index.html';
    }
  }, [checkSession]);

  // Security Gate: Render secured login portal when unauthenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AppShell />;
};

export default AppRouter;
