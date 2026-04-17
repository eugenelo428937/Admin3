import { useState, useEffect, useCallback } from 'react';
import productService from '../services/productService';

export type ActiveFilter = 'all' | 'active' | 'inactive';

export interface FilterGroupOption {
    id: number;
    name: string;
    code: string;
    display_order: number;
    is_default: boolean;
    parent_id: number | null;
}

export interface FilterConfigEntry {
    name: string;
    label: string;
    filter_type: string;
    filter_key: string;
    display_order: number;
    filter_groups: FilterGroupOption[];
}

/**
 * Fetches filter configurations from the backend and returns
 * structured entries for dynamic AdminToggleGroup rendering.
 *
 * Each FilterConfigEntry represents one row of toggles.
 * The toggle options come from filter_groups linked via
 * the FilterConfigurationGroup junction table.
 */
export const useAdminProductFilters = () => {
    const [filterConfigs, setFilterConfigs] = useState<FilterConfigEntry[]>([]);
    const [filtersLoading, setFiltersLoading] = useState(true);

    const fetchFilterConfigs = useCallback(async () => {
        try {
            setFiltersLoading(true);
            const config = await productService.getFilterConfiguration();

            const entries: FilterConfigEntry[] = [];

            for (const [configName, rawConfig] of Object.entries(config)) {
                const fc = rawConfig as any;
                // Only include configs that have filter_groups
                if (fc.filter_groups && fc.filter_groups.length > 0) {
                    entries.push({
                        name: configName,
                        label: fc.label || configName,
                        filter_type: fc.filter_type,
                        filter_key: fc.filter_key,
                        display_order: fc.display_order ?? 0,
                        filter_groups: fc.filter_groups.map((g: any) => ({
                            id: g.id,
                            name: g.name,
                            code: g.code || '',
                            display_order: g.display_order ?? 0,
                            is_default: g.is_default ?? false,
                            parent_id: g.parent_id ?? null,
                        })),
                    });
                }
            }

            // Sort by display_order
            entries.sort((a, b) => a.display_order - b.display_order);
            setFilterConfigs(entries);
        } catch (err) {
            console.error('Failed to load filter configurations:', err);
        } finally {
            setFiltersLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFilterConfigs();
    }, [fetchFilterConfigs]);

    return { filterConfigs, filtersLoading };
};
