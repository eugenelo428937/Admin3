// src/components/admin/subjects/SubjectList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Alert, Paper, Typography, Box, CircularProgress, TablePagination
} from '@mui/material';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import subjectService from '../../../services/subjectService';

const AdminSubjectList = () => {
	const { isSuperuser } = useAuth();
	const [subjects, setSubjects] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(50);
	const [totalCount, setTotalCount] = useState(0);

	const fetchSubjects = useCallback(async () => {
		try {
			setLoading(true);
			const { results, count } = await subjectService.list({
				page: page + 1,
				page_size: rowsPerPage,
			});
			setSubjects(results);
			setTotalCount(count);
			setError(null);
		} catch (err) {
			console.error("Error fetching subjects:", err);
			setError("Failed to fetch subjects. Please try again later.");
			setSubjects([]);
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage]);

	useEffect(() => {
		fetchSubjects();
	}, [fetchSubjects]);

	const handleDelete = async (id) => {
		if (window.confirm("Are you sure you want to delete this subject?")) {
			try {
				await subjectService.delete(id);
				fetchSubjects();
			} catch (err) {
				setError("Failed to delete subject. Please try again later.");
			}
		}
	};

	const handleChangePage = (event, newPage) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	if (!isSuperuser) return <Navigate to="/" replace />;
	if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

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

			{error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

			{subjects.length === 0 && !error ? (
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
							{subjects.map((subject) => (
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
												onClick={() => handleDelete(subject.id)}
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
			{totalCount > rowsPerPage && (
				<TablePagination
					component="div"
					count={totalCount}
					page={page}
					onPageChange={handleChangePage}
					rowsPerPage={rowsPerPage}
					onRowsPerPageChange={handleChangeRowsPerPage}
					rowsPerPageOptions={[25, 50, 100]}
				/>
			)}
		</Container>
	);
};

export default AdminSubjectList;
