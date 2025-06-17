// src/App.js
import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import ActEdNavbar from "./components/ActEdNavbar";
import NoMatch from "./components/NoMatch";
import { CartProvider } from "./contexts/CartContext";
import { ProductProvider } from "./contexts/ProductContext";
import { VATProvider } from "./contexts/VATContext";
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
import CheckoutPage from "./components/CheckoutPage";
import OrderHistory from "./components/OrderHistory";
import RegisterForm from "./components/RegisterForm";
import TutorialProductList from "./components/TutorialProductList";

// Import custom Bootstrap CSS overrides
import "./styles/custom-bootstrap.css";
import liftkit from "@chainlift/liftkit-css";

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
			<CartProvider>
				<AuthProvider>
					<ProductProvider>
						<VATProvider>
							<div className="App">
								<ActEdNavbar />
								<div className="px-3 px-lg-4 px-xl-5">									
									<Routes>
										<Route path="/home" element={<Home />} />
										<Route
											path="/products"
											element={<ProductList />}
										/>
										<Route
											path="admin/exam-sessions"
											element={<AdminExamSessionList />}
										/>
										<Route
											path="admin/exam-sessions/new"
											element={<AdminExamSessionForm />}
										/>
										<Route
											path="/exam-sessions/edit/:id"
											element={<AdminExamSessionForm />}
										/>
										<Route
											path="admin/subjects"
											element={<AdminSubjectList />}
										/>
										<Route
											path="admin/subjects/new"
											element={<AdminSubjectForm />}
										/>
										<Route
											path="admin/subjects/:id"
											element={<AdminSubjectDetail />}
										/>
										<Route
											path="admin/subjects/:id/edit"
											element={<AdminSubjectForm />}
										/>
										<Route
											path="admin/subjects/import"
											element={<AdminSubjectImport />}
										/>
										<Route path="*" element={<NoMatch />} />
										<Route
											path="admin/products"
											element={<AdminProductList />}
										/>
										<Route
											path="admin/products/:id"
											element={<AdminProductDetail />}
										/>
										<Route
											path="admin/products/new"
											element={<AdminProductForm />}
										/>
										<Route
											path="admin/products/edit/:id"
											element={<AdminProductForm />}
										/>
										<Route
											path="admin/products/import"
											element={<AdminProductImport />}
										/>
										<Route
											path="/checkout"
											element={<CheckoutPage />}
										/>
										<Route
											path="/orders"
											element={<OrderHistory />}
										/>
										<Route
											path="/register"
											element={<RegisterForm />}
										/>
										<Route
											path="/tutorials"
											element={<TutorialProductList />}
										/>
									</Routes>
								</div>
							</div>
						</VATProvider>
					</ProductProvider>
				</AuthProvider>
			</CartProvider>
		</ErrorBoundary>
	);
}

export default App;
