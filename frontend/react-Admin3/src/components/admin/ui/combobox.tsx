import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/components/admin/styles/cn"
import { Button } from "@/components/admin/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/admin/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/admin/ui/command"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedLabel = React.useMemo(
    () => options.find((opt) => opt.value === value)?.label,
    [options, value]
  )

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
            className
          )}
        >
          <span className="tw:truncate">
            {selectedLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="tw:ml-2 tw:h-4 tw:w-4 tw:shrink-0 tw:opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="tw:w-[--radix-popover-trigger-width] tw:p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value === value ? "" : option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "tw:mr-2 tw:h-4 tw:w-4",
                      value === option.value ? "tw:opacity-100" : "tw:opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
