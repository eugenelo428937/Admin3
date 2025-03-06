// src/App.js

import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import Home from "./pages/Home";
import Product from "./pages/Product";
import ActEdNavbar from "./components/ActEdNavbar";
import NoMatch from "./components/NoMatch";
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
				<Routes>
					<Route
						path="/Home"
						element={<Home />}
					/>
					<Route
						path="/Product"
						element={<Product />}
					/>
					<Route
						path="./Exam-sessions"
						element={<ExamSessionList />}
					/>
					<Route
						path="./exam-sessions/new"
						element={<ExamSessionForm />}
					/>
					<Route
						path="./exam-sessions/edit/:id"
						element={<ExamSessionForm />}
					/>
					<Route
						path="*"
						element={<NoMatch />}
					/>
				</Routes>
			</div>
		</AuthProvider>
	);
}

export default App;
