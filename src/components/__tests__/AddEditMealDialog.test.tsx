// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AddEditMealDialog } from '../AddEditMealDialog';
import type { Meal } from '@/hooks/usePlanner';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AddEditMealDialog', () => {
  it('adds a meal with the default meal type and day', async () => {
    const onSave = vi.fn();
    renderWithProviders(<AddEditMealDialog open onOpenChange={vi.fn()} onSave={onSave} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/meal name/i), 'Oatmeal');
    await user.click(screen.getByRole('button', { name: /^add meal$/i }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Oatmeal',
      mealType: 'breakfast',
      dayIndex: 0,
    });
  });

  it('includes calories when provided and omits them when blank', async () => {
    const onSave = vi.fn();
    renderWithProviders(<AddEditMealDialog open onOpenChange={vi.fn()} onSave={onSave} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/meal name/i), 'Oatmeal');
    await user.type(screen.getByLabelText(/calories/i), '350');
    await user.click(screen.getByRole('button', { name: /^add meal$/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Oatmeal', calories: 350 }),
    );
  });

  it('does not submit when the name is blank', async () => {
    const onSave = vi.fn();
    renderWithProviders(<AddEditMealDialog open onOpenChange={vi.fn()} onSave={onSave} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^add meal$/i }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not submit when calories is negative', async () => {
    const onSave = vi.fn();
    renderWithProviders(<AddEditMealDialog open onOpenChange={vi.fn()} onSave={onSave} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/meal name/i), 'Oatmeal');
    await user.type(screen.getByLabelText(/calories/i), '-5');
    await user.click(screen.getByRole('button', { name: /^add meal$/i }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('lets the user pick a different meal type and day before saving', async () => {
    // Neither <Select> trigger has a programmatic label association (the
    // <Label> isn't wired to it via htmlFor/id), so query by position:
    // Meal Type renders first, Day second.
    const onSave = vi.fn();
    renderWithProviders(<AddEditMealDialog open onOpenChange={vi.fn()} onSave={onSave} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/meal name/i), 'Salad');

    const [mealTypeSelect, daySelect] = screen.getAllByRole('combobox');
    await user.click(mealTypeSelect);
    await user.click(await screen.findByRole('option', { name: 'Lunch' }));

    await user.click(daySelect);
    await user.click(await screen.findByRole('option', { name: 'Tuesday' }));

    await user.click(screen.getByRole('button', { name: /^add meal$/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ mealType: 'lunch', dayIndex: 1 }),
    );
  });

  it('prefills from editingMeal, hides the day picker, and reports an update', async () => {
    const onSave = vi.fn();
    const editingMeal: Meal = {
      id: 'm1',
      name: 'Grilled chicken',
      calories: 400,
      type: 'dinner',
    } as Meal;

    renderWithProviders(
      <AddEditMealDialog open onOpenChange={vi.fn()} onSave={onSave} editingMeal={editingMeal} />,
    );

    expect(screen.getByLabelText(/meal name/i)).toHaveValue('Grilled chicken');
    expect(screen.getByLabelText(/calories/i)).toHaveValue(400);
    expect(screen.queryByText(/^day$/i)).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /update meal/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Grilled chicken', calories: 400, mealType: 'dinner' }),
    );
  });

  it('disables the submit button and shows a saving label while pending', () => {
    renderWithProviders(
      <AddEditMealDialog open onOpenChange={vi.fn()} onSave={vi.fn()} isLoading />,
    );

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
