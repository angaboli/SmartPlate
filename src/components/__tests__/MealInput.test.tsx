// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { MealInput } from '../MealInput';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { toast } from 'sonner';

function makeFile(name: string, type: string, sizeBytes: number) {
  const file = new File([new Uint8Array(sizeBytes)], name, { type });
  return file;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MealInput', () => {
  it('disables the analyze button until meal text is entered', async () => {
    const onAnalyze = vi.fn();
    renderWithProviders(<MealInput onAnalyze={onAnalyze} onScanPhoto={vi.fn()} />);

    const analyzeButton = screen.getByRole('button', { name: /analyze with ai/i });
    expect(analyzeButton).toBeDisabled();

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/grilled chicken/i), 'Pasta');

    expect(analyzeButton).toBeEnabled();
  });

  it('calls onAnalyze with the typed text and the default meal type (lunch)', async () => {
    const onAnalyze = vi.fn();
    renderWithProviders(<MealInput onAnalyze={onAnalyze} onScanPhoto={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/grilled chicken/i), 'Pasta');
    await user.click(screen.getByRole('button', { name: /analyze with ai/i }));

    expect(onAnalyze).toHaveBeenCalledWith('Pasta', 'lunch');
  });

  it('switches meal type before analyzing', async () => {
    const onAnalyze = vi.fn();
    renderWithProviders(<MealInput onAnalyze={onAnalyze} onScanPhoto={vi.fn()} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /breakfast/i }));
    await user.type(screen.getByPlaceholderText(/grilled chicken/i), 'Oatmeal');
    await user.click(screen.getByRole('button', { name: /analyze with ai/i }));

    expect(onAnalyze).toHaveBeenCalledWith('Oatmeal', 'breakfast');
  });

  it('appends a quick-add item to the meal text', async () => {
    renderWithProviders(<MealInput onAnalyze={vi.fn()} onScanPhoto={vi.fn()} />);

    const user = userEvent.setup();
    await user.click(screen.getByText('Chicken breast'));
    await user.click(screen.getByText('Broccoli'));

    expect(screen.getByPlaceholderText(/grilled chicken/i)).toHaveValue(
      'Chicken breast, Broccoli',
    );
  });

  it('calls onScanPhoto for a valid image file', async () => {
    const onScanPhoto = vi.fn();
    renderWithProviders(<MealInput onAnalyze={vi.fn()} onScanPhoto={onScanPhoto} />);

    const file = makeFile('meal.jpg', 'image/jpeg', 1000);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, file);

    expect(onScanPhoto).toHaveBeenCalledWith(file, 'lunch');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('rejects a disallowed image type without calling onScanPhoto', async () => {
    // Not using userEvent.upload() here: it enforces the input's `accept`
    // attribute and silently drops a file whose type doesn't match, so a
    // GIF would never reach the change handler under test. Dispatching
    // the event directly exercises the component's own MIME check.
    const onScanPhoto = vi.fn();
    renderWithProviders(<MealInput onAnalyze={vi.fn()} onScanPhoto={onScanPhoto} />);

    const file = makeFile('meal.gif', 'image/gif', 1000);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onScanPhoto).not.toHaveBeenCalled();
  });

  it('rejects an oversized image without calling onScanPhoto', async () => {
    const onScanPhoto = vi.fn();
    renderWithProviders(<MealInput onAnalyze={vi.fn()} onScanPhoto={onScanPhoto} />);

    const file = makeFile('meal.jpg', 'image/jpeg', 3 * 1024 * 1024);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, file);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onScanPhoto).not.toHaveBeenCalled();
  });

  it('shows the scanning state and disables both buttons while scanning', () => {
    renderWithProviders(<MealInput onAnalyze={vi.fn()} onScanPhoto={vi.fn()} scanning />);

    expect(screen.getByRole('button', { name: /scanning photo/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /analyze with ai/i })).toBeDisabled();
  });

  it('shows the analyzing state and disables both buttons while loading', () => {
    renderWithProviders(<MealInput onAnalyze={vi.fn()} onScanPhoto={vi.fn()} loading />);

    expect(screen.getByRole('button', { name: /analyzing/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /scan a photo/i })).toBeDisabled();
  });
});
