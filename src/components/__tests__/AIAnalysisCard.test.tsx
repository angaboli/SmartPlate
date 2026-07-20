// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AIAnalysisCard } from '../AIAnalysisCard';

const baseData = {
  balance: 'excellent' as const,
  nutrients: [{ name: 'Protein', value: 40, target: 50, unit: 'g' }],
  missing: [] as string[],
  overconsumption: [] as string[],
};

describe('AIAnalysisCard', () => {
  it('shows the excellent balance label', () => {
    renderWithProviders(<AIAnalysisCard data={baseData} />);
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('shows the needs-improvement balance label for any other value', () => {
    renderWithProviders(<AIAnalysisCard data={{ ...baseData, balance: 'needs-improvement' }} />);
    expect(screen.getByText('Needs Improvement')).toBeInTheDocument();
  });

  it('renders the balance explanation only when provided', () => {
    const { rerender } = renderWithProviders(<AIAnalysisCard data={baseData} />);
    expect(screen.queryByText('Solid macro spread today.')).not.toBeInTheDocument();

    rerender(
      <AIAnalysisCard data={{ ...baseData, balanceExplanation: 'Solid macro spread today.' }} />,
    );
    expect(screen.getByText('Solid macro spread today.')).toBeInTheDocument();
  });

  it('renders each nutrient with its value and target', () => {
    renderWithProviders(<AIAnalysisCard data={baseData} />);
    expect(screen.getByText('Protein')).toBeInTheDocument();
    expect(screen.getByText('40g / 50g')).toBeInTheDocument();
  });

  it('only renders the "add more" section when there are missing items', () => {
    const { rerender } = renderWithProviders(<AIAnalysisCard data={baseData} />);
    expect(screen.queryByText('Add More')).not.toBeInTheDocument();

    rerender(<AIAnalysisCard data={{ ...baseData, missing: ['Fiber', 'Vitamin C'] }} />);
    expect(screen.getByText('Add More')).toBeInTheDocument();
    expect(screen.getByText('Fiber')).toBeInTheDocument();
    expect(screen.getByText('Vitamin C')).toBeInTheDocument();
  });

  it('only renders the "reduce" section when there is overconsumption', () => {
    const { rerender } = renderWithProviders(<AIAnalysisCard data={baseData} />);
    expect(screen.queryByText('Reduce')).not.toBeInTheDocument();

    rerender(<AIAnalysisCard data={{ ...baseData, overconsumption: ['Sodium'] }} />);
    expect(screen.getByText('Reduce')).toBeInTheDocument();
    expect(screen.getByText('Sodium')).toBeInTheDocument();
  });
});
