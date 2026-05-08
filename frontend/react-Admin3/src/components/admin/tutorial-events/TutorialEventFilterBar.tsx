import { Input } from '@/components/admin/ui/input';
import { Label } from '@/components/admin/ui/label';
import { Button } from '@/components/admin/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/admin/ui/select';
import type { EventFilters, FilterOptions } from './types';

interface VM {
  filters: EventFilters;
  filterOptions: FilterOptions | null;
  setFilter: <K extends keyof EventFilters>(name: K, value: EventFilters[K]) => void;
  clearFilters: () => void;
}

export default function TutorialEventFilterBar({ vm }: { vm: VM }) {
  const { filters, filterOptions, setFilter, clearFilters } = vm;

  return (
    <div className="tw:mb-4 tw:rounded-lg tw:border tw:border-[var(--border)] tw:bg-[var(--card)]">
      <div className="tw:grid tw:gap-4 tw:p-4 md:tw:grid-cols-3 lg:tw:grid-cols-4">
        <div className="tw:space-y-1">
          <Label htmlFor="filter-code">Code</Label>
          <Input
            id="filter-code"
            placeholder="e.g. CP1"
            value={filters.code}
            onChange={e => setFilter('code', e.target.value)}
          />
        </div>

        <div className="tw:space-y-1">
          <Label htmlFor="filter-start-from">Start from</Label>
          <Input
            id="filter-start-from"
            type="date"
            value={filters.start_from ?? ''}
            onChange={e => setFilter('start_from', e.target.value || null)}
          />
        </div>

        <div className="tw:space-y-1">
          <Label htmlFor="filter-start-to">Start to</Label>
          <Input
            id="filter-start-to"
            type="date"
            value={filters.start_to ?? ''}
            onChange={e => setFilter('start_to', e.target.value || null)}
          />
        </div>

        <div className="tw:space-y-1">
          <Label htmlFor="filter-finalisation-from">Finalisation from</Label>
          <Input
            id="filter-finalisation-from"
            type="date"
            value={filters.finalisation_from ?? ''}
            onChange={e => setFilter('finalisation_from', e.target.value || null)}
          />
        </div>

        <div className="tw:space-y-1">
          <Label htmlFor="filter-finalisation-to">Finalisation to</Label>
          <Input
            id="filter-finalisation-to"
            type="date"
            value={filters.finalisation_to ?? ''}
            onChange={e => setFilter('finalisation_to', e.target.value || null)}
          />
        </div>

        {filterOptions && (
          <>
            <div className="tw:space-y-1">
              <Label htmlFor="filter-subject">Subject</Label>
              <Select
                value={filters.subject_codes[0] ?? ''}
                onValueChange={v => setFilter('subject_codes', v ? [v] : [])}
              >
                <SelectTrigger id="filter-subject" aria-label="Subject">
                  <SelectValue placeholder="Any subject" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.subjects.map(s => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.code} — {s.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="tw:space-y-1">
              <Label htmlFor="filter-location">Location</Label>
              <Select
                value={filters.location_ids[0] != null ? String(filters.location_ids[0]) : ''}
                onValueChange={v => setFilter('location_ids', v ? [Number(v)] : [])}
              >
                <SelectTrigger id="filter-location" aria-label="Location">
                  <SelectValue placeholder="Any location" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.locations.map(l => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="tw:space-y-1">
              <Label htmlFor="filter-venue">Venue</Label>
              <Select
                value={filters.venue_ids[0] != null ? String(filters.venue_ids[0]) : ''}
                onValueChange={v => setFilter('venue_ids', v ? [Number(v)] : [])}
              >
                <SelectTrigger id="filter-venue" aria-label="Venue">
                  <SelectValue placeholder="Any venue" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.venues.map(vn => (
                    <SelectItem key={vn.id} value={String(vn.id)}>{vn.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="tw:space-y-1">
              <Label htmlFor="filter-instructor">Instructor</Label>
              <Select
                value={filters.instructor_id != null ? String(filters.instructor_id) : ''}
                onValueChange={v => setFilter('instructor_id', v ? Number(v) : null)}
              >
                <SelectTrigger id="filter-instructor" aria-label="Instructor">
                  <SelectValue placeholder="Any instructor" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.instructors.map(i => (
                    <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="tw:space-y-1">
              <Label htmlFor="filter-sitting">Sitting</Label>
              <Select
                value={
                  filters.sitting_id === null
                    ? ''
                    : filters.sitting_id === 'all'
                      ? 'all'
                      : String(filters.sitting_id)
                }
                onValueChange={v => {
                  if (v === '') return setFilter('sitting_id', null);
                  if (v === 'all') return setFilter('sitting_id', 'all');
                  setFilter('sitting_id', Number(v));
                }}
              >
                <SelectTrigger id="filter-sitting" aria-label="Sitting">
                  <SelectValue placeholder="Current sitting (default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sittings</SelectItem>
                  {filterOptions.sittings.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.session_code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="md:tw:col-span-3 lg:tw:col-span-4">
          <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
        </div>
      </div>
    </div>
  );
}
