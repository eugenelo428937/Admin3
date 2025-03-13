// src/App.js

import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Product from "./pages/Product";
import ActEdNavbar from "./components/ActEdNavbar";
import NoMatch from "./components/NoMatch";
import ExamSessionList from "./components/exam-sessions/ExamSessionList";
import ExamSessionForm from "./components/exam-sessions/ExamSessionForm";
import SubjectList from "./components/subjects/SubjectList";
import SubjectForm from "./components/subjects/SubjectForm";
import SubjectDetail from "./components/subjects/SubjectDetail";
import SubjectImport from "./components/subjects/SubjectImport";
import ProductList from "./components/products/ProductList";
import ProductDetail from "./components/products/ProductDetail";
import ProductForm from "./components/products/ProductForm";
import ProductImport from "./components/products/ProductImport";

function App() {
	// eslint-disable-next-line
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	useEffect(() => {
		// Check if the user is authenticated
		const authStatus = localStorage.getItem("isAuthenticated");
		if (authStatus === "true") {
			setIsAuthenticated(true);
		}
	}, []);

	return (
		<ErrorBoundary>
			<AuthProvider>
				<div className="App">
					<ActEdNavbar />
					<Routes>
						<Route
							path="/home"
							element={<Home />}
						/>
						<Route
							path="/product"
							element={<Product />}
						/>
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
						<Route
							path="/subjects"
							element={<SubjectList />}
						/>
						<Route
							path="/subjects/new"
							element={<SubjectForm />}
						/>
						<Route
							path="/subjects/:id"
							element={<SubjectDetail />}
						/>
						<Route
							path="/subjects/:id/edit"
							element={<SubjectForm />}
						/>
						<Route
							path="/subjects/import"
							element={<SubjectImport />}
						/>
						<Route
							path="*"
							element={<NoMatch />}
						/>
						<Route
							path="/products"
							element={<ProductList />}
						/>
						<Route
							path="/products/:id"
							element={<ProductDetail />}
						/>
						<Route
							path="/products/new"
							element={<ProductForm />}
						/>
						<Route
							path="/products/edit/:id"
							element={<ProductForm />}
						/>
						<Route
							path="/products/import"
							element={<ProductImport />}
						/>
					</Routes>
				</div>
			</AuthProvider>
		</ErrorBoundary>
	);
}

export default App;
