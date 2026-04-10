import React from 'react';
import { Navigate } from 'react-router-dom';
import {
    AdminPage,
    AdminPageHeader,
    AdminDataTable,
    AdminErrorAlert,
    AdminFilterBar,
} from '@/components/admin/composed';
import useStudentListVM from './useStudentListVM';

const StudentList: React.FC = () => {
    const vm = useStudentListVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;

    return (
        <AdminPage>
            <AdminPageHeader title="Students" />
            <AdminErrorAlert message={vm.error} />

            <AdminFilterBar
                filters={[
                    { key: 'ref', label: 'Ref', type: 'search', placeholder: 'Student ref...' },
                    { key: 'name', label: 'Name', type: 'search', placeholder: 'First or last name...' },
                    { key: 'email', label: 'Email', type: 'search', placeholder: 'Email address...' },
                    { key: 'phone', label: 'Phone', type: 'search', placeholder: 'Phone number...' },
                    { key: 'address', label: 'Address', type: 'search', placeholder: 'Address...' },
                ]}
                values={vm.search}
                onChange={vm.handleSearchChange}
                onClear={vm.handleClearSearch}
            />

            <AdminDataTable
                columns={[
                    { key: 'student_ref', header: 'Ref', sortable: true },
                    { key: 'first_name', header: 'First Name', sortable: true },
                    { key: 'last_name', header: 'Last Name', sortable: true },
                    { key: 'email', header: 'Email' },
                ]}
                data={vm.students}
                loading={vm.loading}
                emptyMessage="No students found"
                pagination={{
                    page: vm.page,
                    pageSize: vm.rowsPerPage,
                    total: vm.totalCount,
                    onPageChange: vm.handleChangePage,
                    onPageSizeChange: vm.handleChangeRowsPerPage,
                    pageSizeOptions: [25, 50, 100],
                }}
            />
        </AdminPage>
    );
};

export default StudentList;
