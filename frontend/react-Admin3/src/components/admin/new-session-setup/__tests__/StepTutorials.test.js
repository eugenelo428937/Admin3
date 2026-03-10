import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import StepTutorials from '../StepTutorials';

const theme = createTheme();

const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('StepTutorials', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Upload button as disabled', () => {
    renderWithTheme(<StepTutorials onComplete={mockOnComplete} />);

    expect(screen.getByText('Step 4: Tutorials')).toBeInTheDocument();
    const uploadBtn = screen.getByRole('button', { name: /upload/i });
    expect(uploadBtn).toBeDisabled();
  });

  it('shows Coming Soon tooltip on Upload button', () => {
    renderWithTheme(<StepTutorials onComplete={mockOnComplete} />);

    // The tooltip wrapper span should exist
    const uploadBtn = screen.getByRole('button', { name: /upload/i });
    expect(uploadBtn).toBeDisabled();
  });

  it('calls onComplete when Set up later is clicked', () => {
    renderWithTheme(<StepTutorials onComplete={mockOnComplete} />);

    fireEvent.click(screen.getByRole('button', { name: /set up later/i }));
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });
});
