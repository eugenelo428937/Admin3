import * as React from 'react';
import { cn } from '@/components/admin/styles/cn';

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <div data-slot="tabs" className={cn('tw:w-full', className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            _value: value,
            _onValueChange: onValueChange,
          });
        }
        return child;
      })}
    </div>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  _value?: string;
  _onValueChange?: (value: string) => void;
}

function TabsList({ children, className, _value, _onValueChange }: TabsListProps) {
  return (
    <div
      data-slot="tabs-list"
      role="tablist"
      className={cn(
        'tw:inline-flex tw:w-full tw:items-center tw:gap-1 tw:border-b tw:border-admin-border',
        className,
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const triggerValue = (child.props as any).value;
          return React.cloneElement(child as React.ReactElement<any>, {
            _selected: _value === triggerValue,
            _onSelect: () => _onValueChange?.(triggerValue),
          });
        }
        return child;
      })}
    </div>
  );
}

interface TabsTriggerProps {
  children: React.ReactNode;
  value: string;
  className?: string;
  disabled?: boolean;
  _selected?: boolean;
  _onSelect?: () => void;
}

function TabsTrigger({
  children,
  className,
  disabled = false,
  _selected,
  _onSelect,
}: TabsTriggerProps) {
  return (
    <button
      data-slot="tabs-trigger"
      role="tab"
      type="button"
      aria-selected={_selected}
      disabled={disabled}
      onClick={_onSelect}
      className={cn(
        'tw:relative tw:px-4 tw:py-2 tw:text-sm tw:font-medium tw:transition-colors tw:outline-none tw:-mb-px',
        'tw:disabled:pointer-events-none tw:disabled:opacity-50',
        _selected
          ? 'tw:text-admin-fg tw:border-b-2 tw:border-primary'
          : 'tw:text-admin-fg-muted tw:hover:text-admin-fg tw:border-b-2 tw:border-transparent',
        className,
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  children: React.ReactNode;
  value: string;
  className?: string;
  _value?: string;
}

function TabsContent({ children, value, className, _value }: TabsContentProps) {
  if (_value !== value) return null;
  return (
    <div
      data-slot="tabs-content"
      role="tabpanel"
      className={cn('tw:pt-6', className)}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
export type { TabsProps, TabsListProps, TabsTriggerProps, TabsContentProps };
