import { X } from 'lucide-react';
import { Input } from '@/components/admin/ui/input';
import { Label } from '@/components/admin/ui/label';
import { Button } from '@/components/admin/ui/button';
import { Combobox } from '@/components/admin/ui/combobox';
import type { EventFilters, FilterOptions } from './types';

interface VM {
  filters: EventFilters;
  filterOptions: FilterOptions | null;
  setFilter: <K extends keyof EventFilters>(name: K, value: EventFilters[K]) => void;
  clearFilters: () => void;
}

const ALL_SITTINGS_SENTINEL = '__all__';
const MAX_VISIBLE = 10;

export default function TutorialEventFilterBar({ vm }: { vm: VM }) {
  const { filters, filterOptions, setFilter, clearFilters } = vm;

  const subjectOptions =
    filterOptions?.subjects.map((s) => ({
      value: s.code,
      label: `${s.code} — ${s.description}`,
    })) ?? [];
  const locationOptions =
    filterOptions?.locations.map((l) => ({
      value: String(l.id),
      label: l.name,
    })) ?? [];
  const venueOptions =
    filterOptions?.venues.map((v) => ({
      value: String(v.id),
      label: v.name,
    })) ?? [];
  const instructorOptions =
    filterOptions?.instructors.map((i) => ({
      value: String(i.id),
      label: i.name,
    })) ?? [];
  const sittingOptions = [
    { value: ALL_SITTINGS_SENTINEL, label: 'All sittings' },
    ...(filterOptions?.sittings.map((s) => ({
      value: String(s.id),
      label: s.session_code,
    })) ?? []),
  ];
  const eventCodeOptions = filterOptions?.event_codes ?? [];

  const sittingValue =
    filters.sitting_id === 'all'
      ? ALL_SITTINGS_SENTINEL
      : filters.sitting_id != null
        ? String(filters.sitting_id)
        : '';

  const subjectValue = filters.subject_codes[0] ?? '';
  const locationValue =
    filters.location_ids[0] != null ? String(filters.location_ids[0]) : '';
  const venueValue =
    filters.venue_ids[0] != null ? String(filters.venue_ids[0]) : '';
  const instructorValue =
    filters.instructor_id != null ? String(filters.instructor_id) : '';

  return (
    <aside className="tw:rounded-lg tw:border tw:bg-card tw:p-4 tw:space-y-4 tw:mb-4">
      <div className="tw:flex tw:items-center tw:justify-between">
        <h3 className="tw:font-semibold tw:text-sm">Filters</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="tw:text-admin-fg-muted"
        >
          <X className="tw:size-4" />
          Clear
        </Button>
      </div>

      {/* Row 1: Code (always shown) / Subject / Sitting */}
      <div className="tw:grid tw:grid-cols-1 tw:md:grid-cols-2 tw:lg:grid-cols-4 tw:gap-4">
        <div className="tw:space-y-1.5">
          <Label>Tutorial event code</Label>
          <Combobox
            options={eventCodeOptions.map((c) => ({ value: c, label: c }))}
            value={filters.code}
            onValueChange={(v) => setFilter('code', v)}
            placeholder="e.g. CP1"
            emptyMessage="No matching codes."
            maxVisible={MAX_VISIBLE}
            freeText
            ariaLabel="Tutorial event code"
          />
        </div>

        {filterOptions && (
          <>
            <div className="tw:space-y-1.5">
              <Label>Subject</Label>
              <Combobox
                options={subjectOptions}
                value={subjectValue}
                onValueChange={(v) => setFilter('subject_codes', v ? [v] : [])}
                placeholder="Any subject"
                emptyMessage="No subjects found."
                maxVisible={MAX_VISIBLE}
                ariaLabel="Subject"
              />
            </div>

            <div className="tw:space-y-1.5">
              <Label>Sitting</Label>
              <Combobox
                options={sittingOptions}
                value={sittingValue || ALL_SITTINGS_SENTINEL}
                onValueChange={(v) => {
                  // Combobox returns '' when an item is re-selected (toggle off).
                  // Treat that and the "All sittings" sentinel the same way.
                  if (!v || v === ALL_SITTINGS_SENTINEL) {
                    return setFilter('sitting_id', 'all');
                  }
                  setFilter('sitting_id', Number(v));
                }}
                placeholder="All sittings"
                emptyMessage="No sittings found."
                maxVisible={MAX_VISIBLE}
                ariaLabel="Sitting"
              />
            </div>
          </>
        )}
      </div>

      {/* Row 2: Location / Venue / Instructor */}
      {filterOptions && (
        <div className="tw:grid tw:grid-cols-1 tw:md:grid-cols-2 tw:lg:grid-cols-4 tw:gap-4">
          <div className="tw:space-y-1.5">
            <Label>Location</Label>
            <Combobox
              options={locationOptions}
              value={locationValue}
              onValueChange={(v) => setFilter('location_ids', v ? [Number(v)] : [])}
              placeholder="Any location"
              emptyMessage="No locations found."
              maxVisible={MAX_VISIBLE}
              ariaLabel="Location"
            />
          </div>

          <div className="tw:space-y-1.5">
            <Label>Venue</Label>
            <Combobox
              options={venueOptions}
              value={venueValue}
              onValueChange={(v) => setFilter('venue_ids', v ? [Number(v)] : [])}
              placeholder="Any venue"
              emptyMessage="No venues found."
              maxVisible={MAX_VISIBLE}
              ariaLabel="Venue"
            />
          </div>

          <div className="tw:space-y-1.5">
            <Label>Instructor</Label>
            <Combobox
              options={instructorOptions}
              value={instructorValue}
              onValueChange={(v) => setFilter('instructor_id', v ? Number(v) : null)}
              placeholder="Any instructor"
              emptyMessage="No instructors found."
              maxVisible={MAX_VISIBLE}
              ariaLabel="Instructor"
            />
          </div>
        </div>
      )}

      {/* Row 3: Date ranges */}
      <div className="tw:grid tw:grid-cols-1 tw:md:grid-cols-2 tw:lg:grid-cols-4 tw:gap-4">
        <div className="tw:space-y-1.5">
          <Label>Start date</Label>
          <div className="tw:flex tw:gap-2">
            <Input
              type="date"
              value={filters.start_from ?? ''}
              onChange={(e) => setFilter('start_from', e.target.value || null)}
            />
            <Input
              type="date"
              value={filters.start_to ?? ''}
              onChange={(e) => setFilter('start_to', e.target.value || null)}
            />
          </div>
        </div>

        <div className="tw:space-y-1.5">
          <Label>Finalisation date</Label>
          <div className="tw:flex tw:gap-2">
            <Input
              type="date"
              value={filters.finalisation_from ?? ''}
              onChange={(e) => setFilter('finalisation_from', e.target.value || null)}
            />
            <Input
              type="date"
              value={filters.finalisation_to ?? ''}
              onChange={(e) => setFilter('finalisation_to', e.target.value || null)}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
