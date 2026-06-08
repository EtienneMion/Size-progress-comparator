import { render, screen, fireEvent } from '@testing-library/react';
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

  describe('age range filter', () => {
    it('renders the age interval controls', () => {
      render(<App />);
      expect(screen.getByText(/Intervalle d'âges/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Âge minimum')).toBeInTheDocument();
      expect(screen.getByLabelText('Âge maximum')).toBeInTheDocument();
    });

    it('shows a reset button once the range is narrowed and restores it on click', () => {
      render(<App />);
      // No reset button while the filter spans the full data range.
      expect(screen.queryByText(/Tout afficher/i)).not.toBeInTheDocument();

      const minInput = screen.getByLabelText('Âge minimum');
      fireEvent.change(minInput, { target: { value: '5' } });
      expect(minInput).toHaveValue(5);

      const reset = screen.getByText(/Tout afficher/i);
      expect(reset).toBeInTheDocument();
      fireEvent.click(reset);
      expect(screen.queryByText(/Tout afficher/i)).not.toBeInTheDocument();
    });

    it('keeps the max above the min when narrowing', () => {
      render(<App />);
      const minInput = screen.getByLabelText('Âge minimum');
      const maxInput = screen.getByLabelText('Âge maximum');
      fireEvent.change(maxInput, { target: { value: '10' } });
      // Asking for a min beyond the max clamps it to the max.
      fireEvent.change(minInput, { target: { value: '50' } });
      expect(minInput).toHaveValue(10);
    });
  });
});
