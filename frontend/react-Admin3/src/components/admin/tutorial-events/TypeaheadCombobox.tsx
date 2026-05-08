import * as React from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/components/admin/styles/cn';
import { Button } from '@/components/admin/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/admin/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/admin/ui/command';

interface Props {
  /** Current free-text value (also used as substring filter). */
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Maximum number of suggestions to display (default 5). */
  maxVisible?: number;
  /** Accessible label for the trigger button. */
  ariaLabel?: string;
  className?: string;
}

/**
 * A Combobox-styled typeahead for **free-text** filters: the value the user
 * types is the value submitted (substring match preserved on the backend),
 * but a popover with up to `maxVisible` matching suggestions is shown to
 * help with discovery. Visually identical to the regular Combobox so dense
 * filter panels stay consistent.
 */
export default function TypeaheadCombobox({
  value,
  onValueChange,
  options,
  placeholder = 'Type to search…',
  searchPlaceholder = 'Type to search…',
  emptyMessage = 'No matches.',
  maxVisible = 5,
  ariaLabel,
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);

  const visible = React.useMemo(() => {
    const q = value.trim().toLowerCase();
    let list = options;
    if (q) list = options.filter((c) => c.toLowerCase().includes(q));
    return list.slice(0, maxVisible);
  }, [options, value, maxVisible]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            'tw:w-full tw:justify-between tw:font-normal',
            !value && 'tw:text-muted-foreground',
            className,
          )}
        >
          <span className="tw:truncate">{value || placeholder}</span>
          <ChevronsUpDown className="tw:ml-2 tw:h-4 tw:w-4 tw:shrink-0 tw:opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="tw:w-[--radix-popover-trigger-width] tw:p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={value}
            onValueChange={onValueChange}
          />
          <CommandList>
            {visible.length === 0 ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : (
              <CommandGroup>
                {visible.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => {
                      onValueChange(opt);
                      setOpen(false);
                    }}
                  >
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
