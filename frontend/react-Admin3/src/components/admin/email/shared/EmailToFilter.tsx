import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface EmailToFilterProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    debounceMs?: number;
}

const EmailToFilter: React.FC<EmailToFilterProps> = ({
    value,
    onChange,
    placeholder = 'Filter by recipient...',
    debounceMs = 300,
}) => {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (localValue !== value) {
                onChange(localValue);
            }
        }, debounceMs);
        return () => clearTimeout(timer);
    }, [localValue, debounceMs, onChange, value]);

    return (
        <div className="tw:flex tw:items-center tw:gap-2">
            <Search className="tw:size-4 tw:text-admin-fg-muted tw:shrink-0" />
            <input
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder={placeholder}
                className="tw:h-8 tw:w-full tw:rounded-md tw:border tw:border-admin-border tw:bg-transparent tw:px-3 tw:text-sm tw:placeholder:text-admin-fg-muted focus:tw:outline-none focus:tw:ring-1 focus:tw:ring-admin-ring"
            />
        </div>
    );
};

export default EmailToFilter;
