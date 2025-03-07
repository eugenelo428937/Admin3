// frontend/react-Admin3/src/components/SubjectImport.js
import React, { useState } from 'react';
import Papa from 'papaparse'; // You'll need to install this: npm install papaparse
import "../../css/navbar.css";

const SubjectImport = () => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const getCookie = (name) => {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setMessage('');
    };

    const handleImport = () => {
        if (!file) {
            setMessage('Please select a CSV file');
            return;
        }

        setLoading(true);
        Papa.parse(file, {
            complete: async (results) => {
                try {
                    // Skip header row and map data to match Subject model
                    const subjects = results.data.slice(1).map(row => ({
                        code: row[0],
                        description: row[1],
                        active: row[2]?.toLowerCase() === 'true'
                    })).filter(subject => subject.code); // Filter out empty rows

                    const response = await fetch('http://localhost:8888/subjects/bulk-import/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCookie('csrftoken'),
                        },
                        credentials: 'include',
                        body: JSON.stringify({ subjects }),
                    });

                    const data = await response.json();
                    
                    if (response.ok) {
                        setMessage(`Successfully imported ${subjects.length} subjects`);
                    } else {
                        setMessage(`Error: ${data.message || 'Failed to import subjects'}`);
                    }
                } catch (error) {
                    setMessage('Error processing file: ' + error.message);
                } finally {
                    setLoading(false);
                }
            },
            header: false,
            skipEmptyLines: true,
        });
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
                    className="import-button"
                >
                    {loading ? 'Importing...' : 'Import CSV'}
                </button>
            </div>
            {message && (
                <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}
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
