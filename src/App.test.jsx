import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App.jsx';

describe('App', () => {
  // Each test starts from a clean slate so persisted state never leaks across.
  beforeEach(() => localStorage.clear());

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

  describe('chart configuration', () => {
    it('keeps the config panel collapsed until opened', () => {
      render(<App />);
      expect(screen.getByText(/Configurer le graphique/i)).toBeInTheDocument();
      // Controls live inside the collapsed body.
      expect(screen.queryByLabelText('Afficher les points')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText(/Configurer le graphique/i));
      expect(screen.getByLabelText('Afficher les points')).toBeInTheDocument();
    });

    it('toggles the "show points" switch', () => {
      render(<App />);
      fireEvent.click(screen.getByText(/Configurer le graphique/i));
      const toggle = screen.getByLabelText('Afficher les points');
      // Points are shown by default.
      expect(toggle).toHaveAttribute('aria-checked', 'true');
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('exposes a colour picker per person and updates the colour', () => {
      render(<App />);
      fireEvent.click(screen.getByText(/Configurer le graphique/i));
      const colorInput = screen.getByLabelText('Couleur de Hélène');
      expect(colorInput).toBeInTheDocument();
      fireEvent.change(colorInput, { target: { value: '#123456' } });
      expect(colorInput).toHaveValue('#123456');
    });
  });

  describe('persistence', () => {
    it('restores data changes across reloads via localStorage', () => {
      const { unmount } = render(<App />);
      fireEvent.click(screen.getByText(/Configurer le graphique/i));
      fireEvent.change(screen.getByLabelText('Couleur de Hélène'), {
        target: { value: '#123456' },
      });
      // Unmount + remount simulates a page reload.
      unmount();
      render(<App />);
      fireEvent.click(screen.getByText(/Configurer le graphique/i));
      expect(screen.getByLabelText('Couleur de Hélène')).toHaveValue('#123456');
    });

    it('falls back to the sample data when nothing is stored', () => {
      render(<App />);
      for (const name of ['Hélène', 'Julien', 'Léa', 'Sacha']) {
        expect(screen.getAllByText(name).length).toBeGreaterThan(0);
      }
    });

    it('restores the "show points" preference across reloads', () => {
      const { unmount } = render(<App />);
      fireEvent.click(screen.getByText(/Configurer le graphique/i));
      fireEvent.click(screen.getByLabelText('Afficher les points'));
      unmount();
      render(<App />);
      fireEvent.click(screen.getByText(/Configurer le graphique/i));
      expect(screen.getByLabelText('Afficher les points')).toHaveAttribute(
        'aria-checked', 'false'
      );
    });

    it('restores the age interval preference across reloads', () => {
      const { unmount } = render(<App />);
      fireEvent.change(screen.getByLabelText('Âge minimum'), { target: { value: '7' } });
      unmount();
      render(<App />);
      expect(screen.getByLabelText('Âge minimum')).toHaveValue(7);
      // A narrowed range was restored, so the reset affordance is present.
      expect(screen.getByText(/Tout afficher/i)).toBeInTheDocument();
    });
  });

  describe('import / export', () => {
    it('exports the data as a downloadable JSON file', () => {
      const createObjectURL = vi.fn(() => 'blob:fake');
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});

      render(<App />);
      fireEvent.click(screen.getByText(/Exporter/i));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);

      clickSpy.mockRestore();
      vi.unstubAllGlobals();
    });

    it('imports people from a JSON file', async () => {
      render(<App />);
      const payload = [
        {
          id: 'imp1', name: 'Robin', birthDate: '2000-01-01', color: '#123456',
          measurements: [{ date: '2005-01-01', height: 110 }],
        },
      ];
      const file = new File([JSON.stringify(payload)], 'data.json', {
        type: 'application/json',
      });
      fireEvent.change(screen.getByLabelText('Importer un fichier de données'), {
        target: { files: [file] },
      });

      await waitFor(() =>
        expect(screen.getAllByText('Robin').length).toBeGreaterThan(0)
      );
      // The previous sample person is gone after a full replace.
      expect(screen.queryByText('Hélène')).not.toBeInTheDocument();
    });

    it('shows an error when the imported file is not valid JSON', async () => {
      render(<App />);
      const file = new File(['not json at all'], 'bad.json', {
        type: 'application/json',
      });
      fireEvent.change(screen.getByLabelText('Importer un fichier de données'), {
        target: { files: [file] },
      });

      await waitFor(() =>
        expect(screen.getByRole('alert')).toBeInTheDocument()
      );
      // Existing data is left untouched on a failed import.
      expect(screen.getAllByText('Hélène').length).toBeGreaterThan(0);
    });
  });
});
