// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { GroceryListDialog } from '../GroceryListDialog';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('@/hooks/usePlanner', () => ({
  useGroceryList: vi.fn(),
}));
vi.mock('@/lib/generatePDF', () => ({
  generateGroceryPDF: vi.fn(),
}));

import { toast } from 'sonner';
import { useGroceryList } from '@/hooks/usePlanner';
import { generateGroceryPDF } from '@/lib/generatePDF';

const items = [
  { name: 'Bulgur', quantity: '200g', category: 'Grains' },
  { name: 'Parsley', quantity: '1 bunch', category: 'Produce' },
];

function mockGroceryList(overrides: Partial<ReturnType<typeof useGroceryList>> = {}) {
  vi.mocked(useGroceryList).mockReturnValue({
    data: { items },
    isLoading: false,
    error: null,
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGroceryList();
});

describe('GroceryListDialog', () => {
  it('shows a loading state while the list is generating', () => {
    mockGroceryList({ data: undefined, isLoading: true });
    renderWithProviders(<GroceryListDialog open onOpenChange={vi.fn()} planId="p1" />);

    expect(screen.getByText(/generating your grocery list/i)).toBeInTheDocument();
  });

  it('shows an error message when the list fails to load', () => {
    mockGroceryList({ data: undefined, error: new Error('boom') });
    renderWithProviders(<GroceryListDialog open onOpenChange={vi.fn()} planId="p1" />);

    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('shows an empty state when there are no items', () => {
    mockGroceryList({ data: { items: [] } });
    renderWithProviders(<GroceryListDialog open onOpenChange={vi.fn()} planId="p1" />);

    expect(screen.getByText(/no grocery items to display/i)).toBeInTheDocument();
  });

  it('groups items by category and renders each one', () => {
    renderWithProviders(<GroceryListDialog open onOpenChange={vi.fn()} planId="p1" />);

    expect(screen.getByText('Grains')).toBeInTheDocument();
    expect(screen.getByText('Produce')).toBeInTheDocument();
    expect(screen.getByText('Bulgur')).toBeInTheDocument();
    expect(screen.getByText('Parsley')).toBeInTheDocument();
  });

  it('updates the checked-items count when an item is toggled', async () => {
    renderWithProviders(<GroceryListDialog open onOpenChange={vi.fn()} planId="p1" />);

    expect(screen.getByText('0 / 2')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('checkbox', { name: /bulgur/i }));

    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('downloads the PDF with the current items and checked state', async () => {
    renderWithProviders(<GroceryListDialog open onOpenChange={vi.fn()} planId="p1" />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('checkbox', { name: /bulgur/i }));
    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    expect(generateGroceryPDF).toHaveBeenCalledWith(
      items,
      new Set(['Bulgur-200g']),
      'en',
    );
    expect(toast.success).toHaveBeenCalledWith('Grocery list downloaded!');
  });

  it('copies a formatted list to the clipboard', async () => {
    renderWithProviders(<GroceryListDialog open onOpenChange={vi.fn()} planId="p1" />);

    // userEvent.setup() installs its own Clipboard stub on `navigator`
    // (jsdom has none natively), replacing anything defined beforehand —
    // so the spy has to be attached after setup(), not before.
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');
    await user.click(screen.getByRole('button', { name: /copy list/i }));

    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('Bulgur (200g)'));
    expect(toast.success).toHaveBeenCalledWith('Grocery list copied to clipboard!');
  });
});
