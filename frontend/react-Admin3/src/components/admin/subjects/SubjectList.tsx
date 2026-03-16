import React from 'react';
import {
  Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Alert, Paper, Typography, Box, CircularProgress, TablePagination
} from '@mui/material';
import { Link, Navigate } from 'react-router-dom';
import useSubjectListVM from './useSubjectListVM';

const AdminSubjectList: React.FC = () => {
	const vm = useSubjectListVM();

	if (!vm.isSuperuser) return <Navigate to="/" replace />;
	if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

	return (
		<Container sx={{ mt: 4 }}>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
				<Typography variant="h4" component="h2">Subjects</Typography>
				<Box sx={{ display: 'flex', gap: 2 }}>
					<Button component={Link} to="/admin/subjects/new" variant="contained">
						Add New Subject
					</Button>
					<Button component={Link} to="/admin/subjects/import" variant="contained">
						Upload Subject
					</Button>
				</Box>
			</Box>

			{vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

			{vm.subjects.length === 0 && !vm.error ? (
				<Alert severity="info">No subjects found.</Alert>
			) : (
				<TableContainer component={Paper}>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell>Code</TableCell>
								<TableCell>Description</TableCell>
								<TableCell>Status</TableCell>
								<TableCell>Actions</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{vm.subjects.map((subject) => (
								<TableRow key={subject.id} hover>
									<TableCell>{subject.code}</TableCell>
									<TableCell>{subject.description}</TableCell>
									<TableCell>{subject.active ? "Active" : "Inactive"}</TableCell>
									<TableCell>
										<Box sx={{ display: 'flex', gap: 1 }}>
											<Button
												component={Link}
												to={`/admin/subjects/${subject.id}`}
												variant="contained"
												color="info"
												size="small"
											>
												View
											</Button>
											<Button
												component={Link}
												to={`/admin/subjects/${subject.id}/edit`}
												variant="contained"
												color="warning"
												size="small"
											>
												Edit
											</Button>
											<Button
												variant="contained"
												color="error"
												size="small"
												onClick={() => vm.handleDelete(subject.id)}
											>
												Delete
											</Button>
										</Box>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
			)}
			{vm.totalCount > vm.rowsPerPage && (
				<TablePagination
					component="div"
					count={vm.totalCount}
					page={vm.page}
					onPageChange={vm.handleChangePage}
					rowsPerPage={vm.rowsPerPage}
					onRowsPerPageChange={vm.handleChangeRowsPerPage}
					rowsPerPageOptions={[25, 50, 100]}
				/>
			)}
		</Container>
	);
};

export default AdminSubjectList;
