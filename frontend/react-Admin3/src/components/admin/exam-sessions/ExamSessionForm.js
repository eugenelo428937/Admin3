// src/components/ExamSessionForm.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  TextField,
  Button,
  Container,
  Alert,
  Box,
  Typography,
  FormControl,
  FormLabel
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import examSessionService from "../../../services/examSessionService";
import moment from 'moment';

const AdminExamSessionForm = () => {
	const navigate = useNavigate();
	const { id } = useParams();
	const [error, setError] = useState(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		session_code: "",
		start_date: "",
		end_date: "",
	});

	const fetchExamSession = useCallback(async () => {
		try {
			const data = await examSessionService.getById(id);
			setFormData({
				session_code: data.session_code,
				start_date: moment(data.start_date).format("YYYY-MM-DDTHH:mm"),
				end_date: moment(data.end_date).format("YYYY-MM-DDTHH:mm"),
			});
		} catch (err) {
			setError("Failed to fetch exam session");
		}
	}, [id]);

	useEffect(() => {
		if (id) {
			fetchExamSession();
		}
	}, [id, fetchExamSession]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (formData.end_date <= formData.start_date) {
			setError("End date must be after start date");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			if (id) {
				await examSessionService.update(id, formData);
			} else {
				await examSessionService.create(formData);
			}
			navigate("/exam-sessions");
		} catch (err) {
			setError("Failed to save exam session");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	return (
		<Container sx={{ mt: 4 }}>
			<Typography variant="h4" component="h2" sx={{ mb: 4 }}>
				{id ? "Edit" : "Create"} Exam Session
			</Typography>

			{error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

			<Box component="form" onSubmit={handleSubmit}>
				<FormControl fullWidth sx={{ mb: 3 }}>
					<FormLabel>Session Code</FormLabel>
					<TextField
						name="session_code"
						value={formData.session_code}
						onChange={handleChange}
						required
						disabled={isSubmitting}
						fullWidth
					/>
				</FormControl>

				<FormControl fullWidth sx={{ mb: 3 }}>
					<FormLabel>Start Date</FormLabel>
					<TextField
						type="datetime-local"
						name="start_date"
						value={formData.start_date}
						onChange={handleChange}
						required
						disabled={isSubmitting}
						fullWidth
						InputLabelProps={{ shrink: true }}
					/>
				</FormControl>

				<FormControl fullWidth sx={{ mb: 3 }}>
					<FormLabel>End Date</FormLabel>
					<TextField
						type="datetime-local"
						name="end_date"
						value={formData.end_date}
						onChange={handleChange}
						required
						disabled={isSubmitting}
						fullWidth
						InputLabelProps={{ shrink: true }}
					/>
				</FormControl>

				<Box sx={{ display: 'flex', gap: 2 }}>
					<Button variant="contained" type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Saving..." : id ? "Update" : "Create"} Exam Session
					</Button>
					<Button
						variant="outlined"
						onClick={() => navigate("/exam-sessions")}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
				</Box>
			</Box>
		</Container>
	);
};

export default AdminExamSessionForm;
