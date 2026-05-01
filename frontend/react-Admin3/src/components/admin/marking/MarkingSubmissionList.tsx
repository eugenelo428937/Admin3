import React from 'react';
import { Navigate } from 'react-router-dom';
import {
    AdminPage,
    AdminPageHeader,
    AdminDataTable,
    AdminErrorAlert,
} from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import { Label } from '@/components/admin/ui/label';
import { Button } from '@/components/admin/ui/button';
import { Checkbox } from '@/components/admin/ui/checkbox';
import { Badge } from '@/components/admin/ui/badge';
import { AdminSelect } from '@/components/admin/composed/AdminSelect';
import { Combobox } from '@/components/admin/ui/combobox';
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
import { Check, ChevronsUpDown, X } from 'lucide-react';
import useMarkingSubmissionListVM from './useMarkingSubmissionListVM';
import type { MarkingSubmissionRow } from '@/services/adminMarkingSubmissionService';

const ALL_SENTINEL = '__all__';

interface SubjectOption { value: string; label: string }

const SubjectMultiCombobox: React.FC<{
    options: SubjectOption[];
    selected: string[];
    onToggle: (code: string) => void;
    onClear: () => void;
}> = ({ options, selected, onToggle, onClear }) => {
    const [open, setOpen] = React.useState(false);
    const triggerLabel = selected.length === 0
        ? 'All subjects'
        : selected.length === 1
            ? selected[0]
            : `${selected.length} subjects selected`;

    return (
        <div className="tw:space-y-1.5">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="tw:w-full tw:justify-between tw:font-normal"
                    >
                        <span className="tw:truncate">{triggerLabel}</span>
                        <ChevronsUpDown className="tw:ml-2 tw:h-4 tw:w-4 tw:shrink-0 tw:opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="tw:w-[--radix-popover-trigger-width] tw:p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Search subject…" />
                        <CommandList>
                            <CommandEmpty>No subjects found.</CommandEmpty>
                            <CommandGroup>
                                {options.map((opt) => {
                                    const isSelected = selected.includes(opt.value);
                                    return (
                                        <CommandItem
                                            key={opt.value}
                                            value={opt.label}
                                            onSelect={() => onToggle(opt.value)}
                                        >
                                            <Check
                                                className={`tw:mr-2 tw:h-4 tw:w-4 ${isSelected ? 'tw:opacity-100' : 'tw:opacity-0'}`}
                                            />
                                            {opt.label}
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {selected.length > 0 && (
                <div className="tw:flex tw:flex-wrap tw:gap-1">
                    {selected.map((code) => (
                        <Badge
                            key={code}
                            variant="secondary"
                            className="tw:cursor-pointer"
                            onClick={() => onToggle(code)}
                        >
                            {code}
                            <X className="tw:ml-1 tw:h-3 tw:w-3" />
                        </Badge>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="tw:h-6 tw:px-2 tw:text-xs"
                        onClick={onClear}
                    >
                        Clear
                    </Button>
                </div>
            )}
        </div>
    );
};

const formatDate = (value: string | null | undefined): string => {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleDateString();
    } catch {
        return value;
    }
};

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    new: 'outline',
    allocated: 'secondary',
    marked: 'default',
    feedback_received: 'default',
};

const MarkingSubmissionList: React.FC = () => {
    const vm = useMarkingSubmissionListVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;

    const subjectOptions = vm.options.subjects.map((s) => ({
        value: s.code,
        label: s.code + (s.description ? ` — ${s.description}` : ''),
    }));
    const sequenceOptions = [
        { value: ALL_SENTINEL, label: 'All sequences' },
        ...vm.options.sequences.map((n) => ({ value: String(n), label: String(n) })),
    ];
    const markerOptions = vm.options.markers.map((m) => ({
        value: String(m.id),
        label: `${m.initial} — ${m.name}`,
    }));

    const filters = vm.filters;
    const selectedSubjects = filters.subject ?? [];

    return (
        <AdminPage>
            <AdminPageHeader title="Marking Submissions" />
            <AdminErrorAlert message={vm.error} />

            <div className="tw:space-y-6">
                {/* Filter panel */}
                <aside className="tw:rounded-lg tw:border tw:bg-card tw:p-4 tw:space-y-4">
                    <div className="tw:flex tw:items-center tw:justify-between">
                        <h3 className="tw:font-semibold tw:text-sm">Filters</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={vm.clearFilters}
                            className="tw:text-admin-fg-muted"
                        >
                            <X className="tw:size-4" />
                            Clear
                        </Button>
                    </div>

                    {/* Row 1: Student ref / name / email */}
                    <div className="tw:grid tw:grid-cols-1 tw:md:grid-cols-2 tw:lg:grid-cols-4 tw:gap-4">
                        <div className="tw:space-y-1.5">
                            <Label htmlFor="student_ref">Student ref</Label>
                            <Input
                                id="student_ref"
                                value={filters.student_ref ?? ''}
                                onChange={(e) => vm.setFilter('student_ref', e.target.value)}
                                placeholder="e.g. 86048"
                            />
                        </div>
                        <div className="tw:space-y-1.5">
                            <Label htmlFor="student_name">Student name</Label>
                            <Input
                                id="student_name"
                                value={filters.student_name ?? ''}
                                onChange={(e) => vm.setFilter('student_name', e.target.value)}
                                placeholder="First or last name"
                            />
                        </div>
                        <div className="tw:space-y-1.5">
                            <Label htmlFor="student_email">Student email</Label>
                            <Input
                                id="student_email"
                                value={filters.student_email ?? ''}
                                onChange={(e) => vm.setFilter('student_email', e.target.value)}
                                placeholder="email contains…"
                            />
                        </div>
                    </div>

                    {/* Row 2: Subject / Product code / Sequence / Voucher */}
                    <div className="tw:grid tw:grid-cols-1 tw:md:grid-cols-2 tw:lg:grid-cols-4 tw:gap-4">
                        <div className="tw:space-y-1.5">
                            <Label>Subjects</Label>
                            <SubjectMultiCombobox
                                options={subjectOptions}
                                selected={selectedSubjects}
                                onToggle={vm.toggleSubject}
                                onClear={() => vm.setFilter('subject', [])}
                            />
                        </div>
                        <div className="tw:space-y-1.5">
                            <Label htmlFor="product_code">Product code</Label>
                            <Input
                                id="product_code"
                                value={filters.product_code ?? ''}
                                onChange={(e) => vm.setFilter('product_code', e.target.value)}
                                placeholder="e.g. CM2/MX/2025-04"
                            />
                        </div>
                        <div className="tw:space-y-1.5">
                            <Label>Sequence</Label>
                            <AdminSelect
                                options={sequenceOptions}
                                value={filters.sequence || ALL_SENTINEL}
                                onChange={(val) =>
                                    vm.setFilter('sequence', val === ALL_SENTINEL ? '' : val)
                                }
                                placeholder="All sequences"
                            />
                        </div>
                        <div className="tw:flex tw:items-end">
                            <label className="tw:flex tw:items-center tw:gap-2 tw:text-sm tw:cursor-pointer tw:pb-2">
                                <Checkbox
                                    checked={!!filters.voucher}
                                    onCheckedChange={(c) => vm.setFilter('voucher', !!c)}
                                />
                                <span>Marking voucher only</span>
                            </label>
                        </div>
                    </div>

                    {/* Row 3: Marker / Marker ref */}
                    <div className="tw:grid tw:grid-cols-1 tw:md:grid-cols-2 tw:lg:grid-cols-4 tw:gap-4">
                        <div className="tw:space-y-1.5">
                            <Label>Marker</Label>
                            <Combobox
                                options={markerOptions}
                                value={filters.marker ?? ''}
                                onValueChange={(val) => vm.setFilter('marker', val)}
                                placeholder="All markers"
                                searchPlaceholder="Search marker…"
                                emptyMessage="No markers found."
                            />
                        </div>
                        <div className="tw:space-y-1.5">
                            <Label htmlFor="marker_legacy_id">Marker ref</Label>
                            <Input
                                id="marker_legacy_id"
                                value={filters.marker_legacy_id ?? ''}
                                onChange={(e) => vm.setFilter('marker_legacy_id', e.target.value)}
                                placeholder="mkref"
                            />
                        </div>
                    </div>

                    {/* Row 4: Date ranges */}
                    <div className="tw:grid tw:grid-cols-1 tw:md:grid-cols-2 tw:lg:grid-cols-4 tw:gap-4">
                        {[
                            ['Submission date', 'submission_date'],
                            ['Allocate date', 'allocate_date'],
                            ['Graded date', 'graded_date'],
                            ['Feedback date', 'feedback_date'],
                        ].map(([label, key]) => (
                            <div key={key} className="tw:space-y-1.5">
                                <Label>{label}</Label>
                                <div className="tw:flex tw:gap-2">
                                    <Input
                                        type="date"
                                        value={(filters as any)[`${key}_gte`] ?? ''}
                                        onChange={(e) =>
                                            vm.setFilter(`${key}_gte` as any, e.target.value)
                                        }
                                    />
                                    <Input
                                        type="date"
                                        value={(filters as any)[`${key}_lte`] ?? ''}
                                        onChange={(e) =>
                                            vm.setFilter(`${key}_lte` as any, e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Data table */}
                <div>
                    <AdminDataTable
                        columns={[
                            { key: 'student_ref', header: 'Ref' },
                            { key: 'student_name', header: 'Name' },
                            { key: 'subject_code', header: 'Subject',
                                render: (v) => v ?? '—' },
                            { key: 'product_code', header: 'Product code',
                                render: (v) => v ?? '—' },
                            { key: 'paper_name', header: 'Paper' },
                            { key: 'sequences', header: 'Seq',
                                render: (v) => v ?? '—' },
                            { key: 'is_voucher', header: 'Voucher',
                                render: (v: boolean) => v ? <Badge variant="secondary">MV</Badge> : '—' },
                            { key: 'submission_date', header: 'Submitted',
                                render: (v) => formatDate(v) },
                            { key: 'status', header: 'Status',
                                render: (_v: string, row: MarkingSubmissionRow) => (
                                    <Badge variant={STATUS_BADGE[row.status] ?? 'outline'}>
                                        {row.status_label}
                                    </Badge>
                                )
                            },
                        ]}
                        data={vm.rows}
                        loading={vm.loading}
                        emptyMessage="No marking submissions found"
                        pagination={{
                            page: vm.page,
                            pageSize: vm.rowsPerPage,
                            total: vm.totalCount,
                            onPageChange: vm.handleChangePage,
                            onPageSizeChange: vm.handleChangeRowsPerPage,
                            pageSizeOptions: [25, 50, 100, 200],
                        }}
                    />
                </div>
            </div>
        </AdminPage>
    );
};

export default MarkingSubmissionList;
