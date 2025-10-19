// src/components/subjects/SubjectList.js
import React, { useState, useEffect } from 'react';
import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  Paper,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import { Link } from 'react-router-dom';
import subjectService from '../../../services/subjectService';

const AdminSubjectList = () => {
	const [subjects, setSubjects] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchSubjects();
	}, []);

	// src/components/subjects/SubjectList.js
	const fetchSubjects = async () => {
		try {
			const data = await subjectService.getAll();

			// Ensure subjects is always an array
			if (Array.isArray(data)) {
				setSubjects(data);
			} else if (data && data.results && Array.isArray(data.results)) {
				// If data is wrapped in an object with a results property
				setSubjects(data.results);
			} else if (data && typeof data === "object") {
				// If data is an object of subjects
				setSubjects(Object.values(data));
			} else {
				// Default to empty array if data format is unrecognized
				setSubjects([]);
				setError("Unexpected data format received from server");
				console.error("Unexpected data format:", data);
			}

			setLoading(false);
		} catch (err) {
			console.error("Error fetching subjects:", err);
			setError("Failed to fetch subjects. Please try again later.");
			setSubjects([]); // Ensure subjects is an array even on error
			setLoading(false);
		}
	};

	const handleDelete = async (id) => {
		if (window.confirm("Are you sure you want to delete this subject?")) {
			try {
				await subjectService.delete(id);
				setSubjects(subjects.filter((subject) => subject.id !== id));
			} catch (err) {
				setError("Failed to delete subject. Please try again later.");
			}
		}
	};

	if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

	return (
		<Container sx={{ mt: 4 }}>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
				<Typography variant="h4" component="h2">Subjects</Typography>
				<Box sx={{ display: 'flex', gap: 2 }}>
					<Button component={Link} to="/subjects/new" variant="contained">
						Add New Subject
					</Button>
					<Button component={Link} to="/subjects/import" variant="contained">
						Upload Subject
					</Button>
				</Box>
			</Box>

			{error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

			{subjects.length === 0 ? (
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
												to={`/subjects/${subject.id}`}
												variant="contained"
												color="info"
												size="small"
											>
												View
											</Button>
											<Button
												component={Link}
												to={`/subjects/${subject.id}/edit`}
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
		</Container>
	);
};

export default AdminSubjectList;
