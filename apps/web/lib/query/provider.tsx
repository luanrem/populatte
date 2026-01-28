/**
 * TanStack Query Provider
 *
 * Wraps the application with QueryClientProvider and configures React Query DevTools.
 */

'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

import { createQueryClient } from './client';

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for TanStack Query.
 *
 * Creates a stable QueryClient instance (survives re-renders) and provides
 * it to all child components. Also includes React Query DevTools in development.
 *
 * @param props - Component props
 * @param props.children - Child components to wrap
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create stable QueryClient instance - only created once, never re-created on re-render
  // This is critical to prevent query cache loss during component updates
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
