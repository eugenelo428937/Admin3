// src/components/subjects/SubjectList.js
import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import subjectService from '../../../services/subjectService';

const SubjectList = () => {
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

			// Check what data structure is being returned
			console.log("API Response:", data);

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

	if (loading) return <div className="text-center mt-5">Loading...</div>;

	return (
		<Container className="mt-4">
			<div className="d-flex justify-content-between align-items-center mb-4">
				<h2>Subjects</h2>
				<Link to="/subjects/new">
					<Button variant="primary">Add New Subject</Button>
				</Link>
				<Link to="/subjects/import">
					<Button variant="primary">Upload Subject</Button>
				</Link>
			</div>

			{error && <Alert variant="danger">{error}</Alert>}

			{subjects.length === 0 ? (
				<Alert variant="info">No subjects found.</Alert>
			) : (
				<Table
					striped
					bordered
					hover
					responsive>
					<thead>
						<tr>
							<th>Code</th>
							<th>Description</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{subjects.map((subject) => (
							<tr key={subject.id}>
								<td>{subject.code}</td>
								<td>{subject.description}</td>
								<td>{subject.active ? "Active" : "Inactive"}</td>
								<td>
									<Link
										to={`/subjects/${subject.id}`}
										className="btn btn-info btn-sm me-2">
										View
									</Link>
									<Link
										to={`/subjects/${subject.id}/edit`}
										className="btn btn-warning btn-sm me-2">
										Edit
									</Link>
									<Button
										variant="danger"
										size="sm"
										onClick={() => handleDelete(subject.id)}>
										Delete
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</Table>
			)}
		</Container>
	);
};

export default SubjectList;
