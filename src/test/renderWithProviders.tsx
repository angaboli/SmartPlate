import type { ReactElement } from 'react';
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

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </Provider>,
  );
}
