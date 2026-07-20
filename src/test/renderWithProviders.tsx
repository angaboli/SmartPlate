import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makeStore } from '@/store/store';
import type { Language } from '@/store/slices/languageSlice';

// Mirrors src/components/providers/StoreProvider.tsx (Redux + TanStack
// Query) without the parts irrelevant to component tests (ThemeProvider,
// the 401-logout side effects on the query/mutation caches).
export function renderWithProviders(
  ui: ReactElement,
  { language = 'en' as Language } = {},
) {
  const store = makeStore(language);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  // Use RTL's `wrapper` option (rather than pre-wrapping `ui`) so that
  // `rerender()` re-applies the Provider/QueryClientProvider tree instead of
  // replacing it with the bare new element.
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </Provider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}
