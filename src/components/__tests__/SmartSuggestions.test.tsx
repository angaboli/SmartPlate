// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SmartSuggestions } from '../SmartSuggestions';

describe('SmartSuggestions', () => {
  it('renders the section title', () => {
    renderWithProviders(<SmartSuggestions suggestions={[]} />);
    expect(screen.getByText('Smart AI Suggestions')).toBeInTheDocument();
  });

  it('renders a title and description for every suggestion', () => {
    renderWithProviders(
      <SmartSuggestions
        suggestions={[
          { type: 'improve', title: 'Add more fiber', description: 'Try whole grains.' },
          { type: 'swap', title: 'Swap the sauce', description: 'Use olive oil instead.' },
          { type: 'add', title: 'Add a side', description: 'A green salad works well.' },
        ]}
      />,
    );

    expect(screen.getByText('Add more fiber')).toBeInTheDocument();
    expect(screen.getByText('Try whole grains.')).toBeInTheDocument();
    expect(screen.getByText('Swap the sauce')).toBeInTheDocument();
    expect(screen.getByText('Use olive oil instead.')).toBeInTheDocument();
    expect(screen.getByText('Add a side')).toBeInTheDocument();
    expect(screen.getByText('A green salad works well.')).toBeInTheDocument();
  });
});
