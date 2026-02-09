'use client';

import { useState } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { makeStore, type AppStore } from '@/store/store';
import { logout } from '@/store/slices/authSlice';
import type { Language } from '@/store/slices/languageSlice';
import { ThemeProvider } from 'next-themes';

interface StoreProviderProps {
  initialLanguage?: Language;
  children: React.ReactNode;
}

export function StoreProvider({ initialLanguage = 'en', children }: StoreProviderProps) {
  const [store] = useState(() => makeStore(initialLanguage));

  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (
              error instanceof Error &&
              error.message === 'Unauthorized' &&
              typeof window !== 'undefined'
            ) {
              localStorage.removeItem('auth');
              document.cookie = 'accessToken=; path=/; max-age=0; samesite=lax';
              store.dispatch(logout());
              const path = window.location.pathname;
              if (path !== '/login' && path !== '/register' && path !== '/') {
                window.location.href = `/login?from=${encodeURIComponent(path)}`;
              }
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (
              error instanceof Error &&
              error.message === 'Unauthorized' &&
              typeof window !== 'undefined'
            ) {
              localStorage.removeItem('auth');
              document.cookie = 'accessToken=; path=/; max-age=0; samesite=lax';
              store.dispatch(logout());
              const path = window.location.pathname;
              if (path !== '/login' && path !== '/register' && path !== '/') {
                window.location.href = `/login?from=${encodeURIComponent(path)}`;
              }
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (error instanceof Error && error.message === 'Unauthorized') return false;
              return failureCount < 3;
            },
          },
        },
      }),
  );

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}
