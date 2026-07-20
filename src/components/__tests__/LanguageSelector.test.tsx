// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LanguageSelector } from '../LanguageSelector';

// The `focus:bg-accent` variant class is always present on menu items, so
// checking for the (unprefixed) selected-language `bg-accent` class must
// look at the exact class list, not just a substring match.
function classes(el: Element | null) {
  return el?.className.split(/\s+/) ?? [];
}

describe('LanguageSelector', () => {
  it('highlights the current language and lets the user switch it', async () => {
    renderWithProviders(<LanguageSelector />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    const menu = screen.getByRole('menu');
    expect(classes(within(menu).getByText('English').closest('[role="menuitem"]'))).toContain(
      'bg-accent',
    );
    expect(classes(within(menu).getByText('Français').closest('[role="menuitem"]'))).not.toContain(
      'bg-accent',
    );

    await user.click(within(menu).getByText('Français'));

    await user.click(screen.getByRole('button'));
    const reopenedMenu = screen.getByRole('menu');
    expect(
      classes(within(reopenedMenu).getByText('Français').closest('[role="menuitem"]')),
    ).toContain('bg-accent');
  });
});
