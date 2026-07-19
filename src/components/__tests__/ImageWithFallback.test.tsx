// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageWithFallback } from '../ImageWithFallback';

describe('ImageWithFallback', () => {
  it('renders the image when src is provided', () => {
    render(<ImageWithFallback src="https://example.com/pic.jpg" alt="A recipe" />);

    const img = screen.getByRole('img', { name: 'A recipe' });
    expect(img).toHaveAttribute('src', 'https://example.com/pic.jpg');
  });

  it('renders the fallback placeholder when src is empty', () => {
    render(<ImageWithFallback src="" alt="Missing" />);

    expect(screen.queryByRole('img', { name: 'Missing' })).not.toBeInTheDocument();
    expect(screen.getByAltText('Error loading image')).toBeInTheDocument();
  });

  it('falls back to the placeholder when the image fails to load', () => {
    render(<ImageWithFallback src="https://example.com/broken.jpg" alt="Broken" />);

    const img = screen.getByRole('img', { name: 'Broken' });
    fireEvent.error(img);

    expect(screen.queryByRole('img', { name: 'Broken' })).not.toBeInTheDocument();
    expect(screen.getByAltText('Error loading image')).toBeInTheDocument();
  });

  it('recovers once a new, valid src is provided after a previous error', () => {
    const { rerender } = render(
      <ImageWithFallback src="https://example.com/broken.jpg" alt="Broken" />,
    );
    fireEvent.error(screen.getByRole('img', { name: 'Broken' }));
    expect(screen.getByAltText('Error loading image')).toBeInTheDocument();

    rerender(<ImageWithFallback src="https://example.com/good.jpg" alt="Good" />);

    expect(screen.getByRole('img', { name: 'Good' })).toHaveAttribute(
      'src',
      'https://example.com/good.jpg',
    );
  });
});
