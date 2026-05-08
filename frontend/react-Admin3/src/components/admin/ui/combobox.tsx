import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/components/admin/styles/cn"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/admin/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  /** Kept for API back-compat; no longer used (CommandInput is gone). */
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  /**
   * When set, slices the visible suggestion list to this many entries
   * (after substring filtering). Use to keep dense filter panels compact.
   */
  maxVisible?: number
  /**
   * When true, the typed text IS the value (substring filter). The
   * popover only suggests matching options to help discovery — the user
   * is free to submit any free-text value. Use this for substring-search
   * filters such as event codes.
   */
  freeText?: boolean
  /** Accessible name for the combobox input. */
  ariaLabel?: string
}

/**
 * Input-as-trigger Combobox: the user types directly in the combobox
 * itself; the popover acts only as a suggestion list, not as the
 * editor. Mirrors the Radix combobox pattern referenced in the shadcn
 * docs (https://ui.shadcn.com/docs/components/radix/combobox).
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  emptyMessage = "No results found.",
  className,
  maxVisible,
  freeText = false,
  ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)

  // What the input should display when not actively being edited.
  const displayValue = React.useMemo(() => {
    if (freeText) return value
    return options.find((o) => o.value === value)?.label ?? ""
  }, [freeText, value, options])

  const [inputValue, setInputValue] = React.useState(displayValue)

  // Keep the input in sync with external value changes (e.g. clearFilters).
  React.useEffect(() => {
    setInputValue(displayValue)
  }, [displayValue])

  // Filter visible options by the typed substring. Skip filtering when
  // the typed text exactly matches the currently selected label
  // (otherwise opening a popover with a value already chosen would
  // narrow the list to that single item).
  const visible = React.useMemo(() => {
    const q = inputValue.trim().toLowerCase()
    let list = options
    if (q && q !== displayValue.toLowerCase()) {
      list = options.filter((o) => o.label.toLowerCase().includes(q))
    } else if (q && freeText) {
      // In freeText mode, filter even when q === value, because there's
      // no "current selection" to special-case.
      list = options.filter((o) => o.label.toLowerCase().includes(q))
    }
    return maxVisible != null ? list.slice(0, maxVisible) : list
  }, [options, inputValue, maxVisible, freeText, displayValue])

  const selectOption = (opt: ComboboxOption) => {
    if (freeText) {
      onValueChange(opt.value)
      setInputValue(opt.value)
    } else {
      const selectedAlready = opt.value === value
      onValueChange(selectedAlready ? "" : opt.value)
      setInputValue(selectedAlready ? "" : opt.label)
    }
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setInputValue(next)
    if (!open) setOpen(true)
    setActiveIndex(0)
    if (freeText) {
      onValueChange(next)
    } else if (next === "") {
      // Constrained-mode: emptying the field clears the current selection.
      onValueChange("")
    }
  }

  const handleBlur = () => {
    // Revert stale typing in constrained mode if no option was picked.
    if (!freeText && inputValue !== displayValue) {
      setInputValue(displayValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setActiveIndex(0)
        return
      }
      setActiveIndex((prev) => Math.min(visible.length - 1, prev + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(0, prev - 1))
    } else if (e.key === "Enter") {
      if (open && activeIndex >= 0 && visible[activeIndex]) {
        e.preventDefault()
        selectOption(visible[activeIndex])
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault()
        setOpen(false)
        setActiveIndex(-1)
      }
    }
  }

  const listboxId = React.useId()

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverAnchor asChild>
        <div className={cn("tw:relative", className)}>
          <input
            type="text"
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={
              open && activeIndex >= 0 && visible[activeIndex]
                ? `${listboxId}-option-${activeIndex}`
                : undefined
            }
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            autoComplete="off"
            data-slot="combobox-input"
            className={cn(
              "tw:h-9 tw:w-full tw:min-w-0 tw:rounded-md tw:border tw:border-input tw:bg-transparent tw:px-3 tw:py-1 tw:pr-8 tw:text-base tw:shadow-xs tw:outline-none",
              "tw:placeholder:text-muted-foreground",
              "tw:focus-visible:border-ring tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50",
              "tw:disabled:pointer-events-none tw:disabled:cursor-not-allowed tw:disabled:opacity-50",
              "tw:md:text-sm tw:dark:bg-input/30",
            )}
          />
          <button
            type="button"
            aria-label="Toggle suggestions"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOpen((o) => !o)}
            className="tw:absolute tw:right-2 tw:top-1/2 tw:-translate-y-1/2 tw:flex tw:items-center tw:justify-center tw:opacity-50 tw:hover:opacity-100"
          >
            <ChevronsUpDown className="tw:h-4 tw:w-4" />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="tw:w-[--radix-popover-trigger-width] tw:p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {visible.length === 0 ? (
          <div className="tw:px-3 tw:py-2 tw:text-sm tw:text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <ul
            role="listbox"
            id={listboxId}
            className="tw:max-h-60 tw:overflow-y-auto tw:py-1"
          >
            {visible.map((opt, i) => {
              const isSelected = !freeText && value === opt.value
              return (
                <li
                  key={opt.value}
                  id={`${listboxId}-option-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  // Prevent input blur on click, which would close the popover
                  // before our onClick handler runs.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectOption(opt)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "tw:flex tw:items-center tw:gap-2 tw:px-3 tw:py-2 tw:text-sm tw:cursor-pointer",
                    i === activeIndex && "tw:bg-accent tw:text-accent-foreground",
                  )}
                >
                  <Check
                    className={cn(
                      "tw:h-4 tw:w-4 tw:shrink-0",
                      isSelected ? "tw:opacity-100" : "tw:opacity-0",
                    )}
                  />
                  <span className="tw:truncate">{opt.label}</span>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
