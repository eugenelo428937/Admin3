import { useRef, useState } from 'react';
import { Button } from '../../admin/ui/button';

interface Props {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

/**
 * File-picker shaped as a Button.
 *
 * The native <input type="file"> is hidden; the visible <Button> proxies
 * clicks to the input. After each upload the input value is cleared so
 * the same file can be re-selected (otherwise the change event won't
 * fire on identical filenames).
 */
export default function XlsxUploadButton({ onUpload, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      await onUpload(file);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="tw:inline-flex">
      <input
        ref={inputRef}
        data-testid="xlsx-upload-input"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="tw:hidden"
        onChange={onChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Uploading…' : 'Upload xlsx'}
      </Button>
    </div>
  );
}
