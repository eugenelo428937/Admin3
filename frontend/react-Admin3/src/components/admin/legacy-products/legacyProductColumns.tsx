import React from 'react';
import type { LegacyProduct } from '../../../types/legacy-product.types';

const FORMAT_BADGES: Record<string, { label: string; className: string }> = {
  P: { label: 'Printed', className: 'tw:bg-blue-100 tw:text-blue-800' },
  C: { label: 'eBook', className: 'tw:bg-purple-100 tw:text-purple-800' },
  M: { label: 'Marking', className: 'tw:bg-amber-100 tw:text-amber-800' },
  T: { label: 'Tutorial', className: 'tw:bg-green-100 tw:text-green-800' },
};

export const legacyProductColumns = [
  {
    key: 'full_code' as keyof LegacyProduct,
    header: 'Code',
    className: 'tw:font-mono tw:text-xs',
  },
  {
    key: 'legacy_product_name' as keyof LegacyProduct,
    header: 'Product Name',
  },
  {
    key: 'subject_code' as keyof LegacyProduct,
    header: 'Subject',
    className: 'tw:font-medium',
  },
  {
    key: 'session_code' as keyof LegacyProduct,
    header: 'Session',
  },
  {
    key: 'delivery_format' as keyof LegacyProduct,
    header: 'Format',
    render: (value: string) => {
      const badge = FORMAT_BADGES[value] ?? { label: value, className: 'tw:bg-gray-100 tw:text-gray-800' };
      return (
        <span className={`tw:inline-block tw:rounded tw:px-2 tw:py-0.5 tw:text-xs tw:font-medium ${badge.className}`}>
          {badge.label}
        </span>
      );
    },
  },
];
