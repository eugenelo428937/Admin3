import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { cn } from "@/components/admin/styles/cn";
import { Button } from "@/components/admin/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/admin/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/admin/ui/command";

export interface AsyncOption {
  value: string;
  label: string;
}

interface AsyncComboboxProps {
  selectedLabel?: string;
  value: string;
  onValueChange: (value: string, option: AsyncOption | null) => void;
  fetchOptions: (query: string) => Promise<AsyncOption[]>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  debounceMs?: number;
}

export function AsyncCombobox({
  selectedLabel,
  value,
  onValueChange,
  fetchOptions,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  className,
  debounceMs = 300,
}: AsyncComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [options, setOptions] = React.useState<AsyncOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const reqIdRef = React.useRef(0);

  React.useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      const myReq = ++reqIdRef.current;
      setLoading(true);
      fetchOptions(query)
        .then((opts) => {
          if (reqIdRef.current === myReq) setOptions(opts);
        })
        .catch(() => {
          if (reqIdRef.current === myReq) setOptions([]);
        })
        .finally(() => {
          if (reqIdRef.current === myReq) setLoading(false);
        });
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [query, open, fetchOptions, debounceMs]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "tw:w-full tw:justify-between tw:font-normal",
            !value && "tw:text-muted-foreground",
            className,
          )}
        >
          <span className="tw:truncate">{selectedLabel ?? placeholder}</span>
          <ChevronsUpDown className="tw:ml-2 tw:h-4 tw:w-4 tw:shrink-0 tw:opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="tw:w-[--radix-popover-trigger-width] tw:p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading ? (
              <div className="tw:flex tw:items-center tw:justify-center tw:py-4 tw:text-sm tw:text-muted-foreground">
                <Loader2 className="tw:mr-2 tw:h-4 tw:w-4 tw:animate-spin" />
                Searching...
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        onValueChange(
                          option.value === value ? "" : option.value,
                          option.value === value ? null : option,
                        );
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "tw:mr-2 tw:h-4 tw:w-4",
                          value === option.value
                            ? "tw:opacity-100"
                            : "tw:opacity-0",
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
