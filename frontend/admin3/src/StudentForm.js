// src/StudentForm.js

import React, { useState } from "react";
import axios from "axios";

const StudentForm = () => {
	const [formData, setFormData] = useState({
		firstname: "",
		lastname: "",
		password: "",
	});

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData({
			...formData,
			[name]: value,
		});
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		axios
			.post("https://localhost:8888/students/create_student/", formData)
			.then((response) => {
				alert(response.data.message);
			})
			.catch((error) => {
				console.error("There was an error creating the student!", error);
			});
	};

	return (
		<form onSubmit={handleSubmit}>
			<div>
				<label>First Name:</label>
				<input
					type="text"
					name="firstname"
					value={formData.firstname}
					onChange={handleChange}
					required
				/>
			</div>
			<div>
				<label>Last Name:</label>
				<input
					type="text"
					name="lastname"
					value={formData.lastname}
					onChange={handleChange}
					required
				/>
			</div>
			<div>
				<label>Password:</label>
				<input
					type="password"
					name="password"
					value={formData.password}
					onChange={handleChange}
					required
				/>
			</div>
			<button type="submit">Create Student</button>
		</form>
	);
};

export default StudentForm;
