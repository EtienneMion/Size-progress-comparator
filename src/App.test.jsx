import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App.jsx';

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />);
    expect(screen.getByText(/grandi/i)).toBeInTheDocument();
  });

  it('renders both chart titles', () => {
    render(<App />);
    // The "time" chart title contains "des années".
    expect(screen.getByText(/des années/i)).toBeInTheDocument();
    // "âge" appears in several places (title, subtitle, labels), so assert
    // at least one occurrence rather than uniqueness.
    expect(screen.getAllByText(/âge/i).length).toBeGreaterThan(0);
  });

  it('lists the sample people', () => {
    render(<App />);
    // Each name appears both as a chart label and in its person card.
    for (const name of ['Hélène', 'Julien', 'Léa', 'Sacha']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });
});
