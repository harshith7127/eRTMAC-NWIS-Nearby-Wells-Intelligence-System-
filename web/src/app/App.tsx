import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './router';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import '../styles/globals.css';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary fallbackTitle="Application Shell Error">
        <AppRouter />
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
