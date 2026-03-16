import React from 'react';
import useSubjectImportVM from './useSubjectImportVM';

const AdminSubjectImport: React.FC = () => {
	const vm = useSubjectImportVM();

	return (
		<div className="subject-import-container">
			<h2>Import Subjects</h2>
			<div className="import-form">
				<input
					type="file"
					accept=".csv"
					onChange={vm.handleFileChange}
					className="file-input"
				/>
				<button
					onClick={vm.handleImport}
					disabled={!vm.file || vm.loading}
					className="import-button">
					{vm.loading ? "Importing..." : "Import CSV"}
				</button>
			</div>
			{vm.message && <div className={`message ${vm.isError ? "error" : "success"}`}>{vm.message}</div>}
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

export default AdminSubjectImport;
