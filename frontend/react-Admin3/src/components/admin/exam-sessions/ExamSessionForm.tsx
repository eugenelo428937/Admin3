import React from 'react';
import {
  TextField, Button, Container, Alert, Box, Typography,
  FormControl, FormLabel
} from '@mui/material';
import { Navigate } from 'react-router-dom';
import useExamSessionFormVM from './useExamSessionFormVM';

const AdminExamSessionForm: React.FC = () => {
	const vm = useExamSessionFormVM();

	if (!vm.isSuperuser) return <Navigate to="/" replace />;

	return (
		<Container sx={{ mt: 4 }}>
			<Typography variant="h4" component="h2" sx={{ mb: 4 }}>
				{vm.isEditMode ? "Edit" : "Create"} Exam Session
			</Typography>

			{vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

			<Box component="form" onSubmit={vm.handleSubmit}>
				<FormControl fullWidth sx={{ mb: 3 }}>
					<FormLabel>Session Code</FormLabel>
					<TextField
						name="session_code"
						value={vm.formData.session_code}
						onChange={vm.handleChange}
						required
						disabled={vm.isSubmitting}
						fullWidth
					/>
				</FormControl>

				<FormControl fullWidth sx={{ mb: 3 }}>
					<FormLabel>Start Date</FormLabel>
					<TextField
						type="datetime-local"
						name="start_date"
						value={vm.formData.start_date}
						onChange={vm.handleChange}
						required
						disabled={vm.isSubmitting}
						fullWidth
						InputLabelProps={{ shrink: true }}
					/>
				</FormControl>

				<FormControl fullWidth sx={{ mb: 3 }}>
					<FormLabel>End Date</FormLabel>
					<TextField
						type="datetime-local"
						name="end_date"
						value={vm.formData.end_date}
						onChange={vm.handleChange}
						required
						disabled={vm.isSubmitting}
						fullWidth
						InputLabelProps={{ shrink: true }}
					/>
				</FormControl>

				<Box sx={{ display: 'flex', gap: 2 }}>
					<Button variant="contained" type="submit" disabled={vm.isSubmitting}>
						{vm.isSubmitting ? "Saving..." : vm.isEditMode ? "Update" : "Create"} Exam Session
					</Button>
					<Button
						variant="outlined"
						onClick={vm.handleCancel}
						disabled={vm.isSubmitting}
					>
						Cancel
					</Button>
				</Box>
			</Box>
		</Container>
	);
};

export default AdminExamSessionForm;
