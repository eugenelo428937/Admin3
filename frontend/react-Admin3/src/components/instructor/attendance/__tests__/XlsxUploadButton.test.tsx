import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import XlsxUploadButton from '../XlsxUploadButton';

describe('XlsxUploadButton', () => {
  it('calls onUpload with the selected file', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    render(<XlsxUploadButton onUpload={onUpload} />);
    const input = screen.getByTestId('xlsx-upload-input') as HTMLInputElement;
    const file = new File(['x'], 'r.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it('respects the disabled prop', () => {
    render(<XlsxUploadButton onUpload={vi.fn()} disabled />);
    const button = screen.getByRole('button', { name: /upload/i });
    expect(button).toBeDisabled();
  });
});
