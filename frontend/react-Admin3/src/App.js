// src/App.js

import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Product from "./pages/Product";
import ActEdNavbar from "./components/ActEdNavbar";
import NoMatch from "./components/NoMatch";
import AdminExamSessionList from "./components/admin/exam-sessions/ExamSessionList";
import AdminExamSessionForm from "./components/admin/exam-sessions/ExamSessionForm";
import AdminSubjectList from "./components/admin/subjects/SubjectList";
import AdminSubjectForm from "./components/admin/subjects/SubjectForm";
import AdminSubjectDetail from "./components/admin/subjects/SubjectDetail";
import AdminSubjectImport from "./components/admin/subjects/SubjectImport";
import AdminProductList from "./components/admin/products/ProductList";
import AdminProductDetail from "./components/admin/products/ProductDetail";
import AdminProductForm from "./components/admin/products/ProductForm";
import AdminProductImport from "./components/admin/products/ProductImport";
import ProductList from "./components/ProductList";

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
						<Route path="/home" element={<Home />} />
						<Route path="/product" element={<ProductList />} />
						<Route
							path="/exam-sessions"
							element={<AdminExamSessionList />}
						/>
						<Route
							path="/exam-sessions/new"
							element={<AdminExamSessionForm />}
						/>
						<Route
							path="/exam-sessions/edit/:id"
							element={<AdminExamSessionForm />}
						/>
						<Route path="/subjects" element={<AdminSubjectList />} />
						<Route path="/subjects/new" element={<AdminSubjectForm />} />
						<Route
							path="/subjects/:id"
							element={<AdminSubjectDetail />}
						/>
						<Route
							path="/subjects/:id/edit"
							element={<AdminSubjectForm />}
						/>
						<Route
							path="/subjects/import"
							element={<AdminSubjectImport />}
						/>
						<Route path="*" element={<NoMatch />} />
						<Route path="/products" element={<AdminProductList />} />
						<Route
							path="/products/:id"
							element={<AdminProductDetail />}
						/>
						<Route path="/products/new" element={<AdminProductForm />} />
						<Route
							path="/products/edit/:id"
							element={<AdminProductForm />}
						/>
						<Route
							path="/products/import"
							element={<AdminProductImport />}
						/>
					</Routes>
				</div>
			</AuthProvider>
		</ErrorBoundary>
	);
}

export default App;
