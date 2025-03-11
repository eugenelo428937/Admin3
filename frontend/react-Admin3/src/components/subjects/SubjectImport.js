import React, { useState } from 'react';
import { readString } from 'react-papaparse';
import subjectService from "../../services/subjectService";
import "../../css/navbar.css";

const SubjectImport = () => {
	const [file, setFile] = useState(null);
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);

	const handleFileChange = (e) => {
		setFile(e.target.files[0]);
		setMessage("");
	};

	const handleImport = () => {
		if (!file) {
			setMessage("Please select a CSV file");
			return;
		}

		setLoading(true);
		const reader = new FileReader();

		reader.onload = async (event) => {
			try {
				const csvData = event.target.result;
				const results = readString(csvData, {
					header: false,
					skipEmptyLines: true,
					complete: (results) => results,
				});

				// Skip header row and map data to match Subject model
				const subjects = results.data
					.slice(1)
					.map((row) => ({
						code: row[0],
						description: row[1],
						active: row[2]?.toLowerCase() === "true",
					}))
					.filter((subject) => subject.code); // Filter out empty rows

				const data = await subjectService.bulkImport(subjects);
				setMessage(`Successfully imported ${subjects.length} subjects`);
			} catch (error) {
				setMessage("Error processing file: " + error.message);
			} finally {
				setLoading(false);
			}
		};

		reader.readAsText(file);
	};

	return (
		<div className="subject-import-container">
			<h2>Import Subjects</h2>
			<div className="import-form">
				<input
					type="file"
					accept=".csv"
					onChange={handleFileChange}
					className="file-input"
				/>
				<button
					onClick={handleImport}
					disabled={!file || loading}
					className="import-button">
					{loading ? "Importing..." : "Import CSV"}
				</button>
			</div>
			{message && <div className={`message ${message.includes("Error") ? "error" : "success"}`}>{message}</div>}
			<div className="import-instructions">
				<h3>CSV Format:</h3>
				<p>Your CSV file should have the following columns:</p>
				<ol>
					<li>Code (required)</li>
					<li>Description (required)</li>
					<li>Active (optional, default: true)</li>
				</ol>
				<p>Example: MATH101,Basic Mathematics,true</p>
			</div>
		</div>
	);
};

export default SubjectImport;
