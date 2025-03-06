// src/App.js

import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ActEdNavbar from "./components/ActEdNavbar";
import { AuthProvider } from "./hooks/useAuth";
import ExamSessionList from "./components/ExamSessionList";
import ExamSessionForm from "./components/ExamSessionForm";

function App() {
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	useEffect(() => {
		// Check if the user is authenticated
		const authStatus = localStorage.getItem("isAuthenticated");
		if (authStatus === "true") {
			setIsAuthenticated(true);
		}
	}, []);

	return (
		<AuthProvider>
			<div className="App">
				<ActEdNavbar />
				<h1>The Acturial Education Company</h1>
				<h2>E-Store</h2>

				<Routes>
					<Route
						path="/exam-sessions"
						element={<ExamSessionList />}
					/>
					<Route
						path="/exam-sessions/new"
						element={<ExamSessionForm />}
					/>
					<Route
						path="/exam-sessions/edit/:id"
						element={<ExamSessionForm />}
					/>
				</Routes>
			</div>
		</AuthProvider>
	);
}

export default App;
