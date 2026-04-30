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
import { X } from 'lucide-react';
import useMarkingSubmissionListVM from './useMarkingSubmissionListVM';
import type { MarkingSubmissionRow } from '@/services/adminMarkingSubmissionService';

const ALL_SENTINEL = '__all__';

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
    const markerOptions = [
        { value: ALL_SENTINEL, label: 'All markers' },
        ...vm.options.markers.map((m) => ({
            value: String(m.id),
            label: `${m.initial} — ${m.name}`,
        })),
    ];

    const filters = vm.filters;
    const selectedSubjects = filters.subject ?? [];

    return (
        <AdminPage>
            <AdminPageHeader title="Marking Submissions" />
            <AdminErrorAlert message={vm.error} />

            <div className="tw:grid tw:grid-cols-1 tw:lg:grid-cols-[280px_1fr] tw:gap-6">
                {/* Filter panel */}
                <aside className="tw:rounded-lg tw:border tw:bg-card tw:p-4 tw:space-y-4 tw:h-fit">
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
                        <Label>Subjects</Label>
                        <div className="tw:max-h-40 tw:overflow-y-auto tw:rounded tw:border tw:p-2 tw:space-y-1">
                            {subjectOptions.length === 0 ? (
                                <p className="tw:text-xs tw:text-admin-fg-muted">Loading…</p>
                            ) : subjectOptions.map((s) => {
                                const checked = selectedSubjects.includes(s.value);
                                return (
                                    <label
                                        key={s.value}
                                        className="tw:flex tw:items-center tw:gap-2 tw:text-sm tw:cursor-pointer"
                                    >
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={() => vm.toggleSubject(s.value)}
                                        />
                                        <span>{s.label}</span>
                                    </label>
                                );
                            })}
                        </div>
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

                    <label className="tw:flex tw:items-center tw:gap-2 tw:text-sm tw:cursor-pointer">
                        <Checkbox
                            checked={!!filters.voucher}
                            onCheckedChange={(c) => vm.setFilter('voucher', !!c)}
                        />
                        <span>Marking voucher only</span>
                    </label>

                    <div className="tw:space-y-1.5">
                        <Label>Marker</Label>
                        <AdminSelect
                            options={markerOptions}
                            value={filters.marker || ALL_SENTINEL}
                            onChange={(val) =>
                                vm.setFilter('marker', val === ALL_SENTINEL ? '' : val)
                            }
                            placeholder="All markers"
                        />
                    </div>

                    <div className="tw:space-y-1.5">
                        <Label htmlFor="marker_legacy_id">Marker legacy ID</Label>
                        <Input
                            id="marker_legacy_id"
                            value={filters.marker_legacy_id ?? ''}
                            onChange={(e) => vm.setFilter('marker_legacy_id', e.target.value)}
                            placeholder="mkref"
                        />
                    </div>

                    <div className="tw:space-y-1.5">
                        <Label htmlFor="marker_name">Marker name / initial</Label>
                        <Input
                            id="marker_name"
                            value={filters.marker_name ?? ''}
                            onChange={(e) => vm.setFilter('marker_name', e.target.value)}
                            placeholder="Initial or name"
                        />
                    </div>

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
