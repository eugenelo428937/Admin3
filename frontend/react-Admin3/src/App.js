// src/App.js
import React, { Profiler, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
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
import ProfileForm from "./components/ProfileForm";
import TutorialProductList from "./components/TutorialProductList";
import ForgotPasswordForm from "./components/ForgotPasswordForm";
import ResetPasswordForm from "./components/ResetPasswordForm";
import AccountActivation from "./components/AccountActivation";
import ResendActivation from "./components/ResendActivation";
import EmailVerification from "./components/EmailVerification";

// Import custom Bootstrap CSS overrides
import "./styles/custom-bootstrap.css";

// Registration page component using ProfileForm
const RegistrationPage = () => {
	return (
		<div className="container py-4">
			<div className="row justify-content-center">
				<div className="col-md-12 col-lg-10 col-xl-8">
					<div className="card">
						<div className="card-header bg-success text-white">
							<h4 className="mb-0">
								<i className="bi bi-person-plus me-2"></i>
								Create Your Account
							</h4>
						</div>
						<div className="card-body">
							<ProfileForm
								mode="registration"
								title="Create Your ActEd Account"
								subtitle="Join thousands of students studying with ActEd. Create your account to access study materials, book tutorials, and track your progress."
								showSuccessMessage={true}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

function App() {
	// eslint-disable-next-line
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	// reCAPTCHA v3 configuration
	const RECAPTCHA_SITE_KEY =
		process.env.REACT_APP_RECAPTCHA_SITE_KEY ||
		"6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"; // Test key

	useEffect(() => {
		// Check if the user is authenticated
		const authStatus = localStorage.getItem("isAuthenticated");
		if (authStatus === "true") {
			setIsAuthenticated(true);
		}
	}, []);

	return (
		<GoogleReCaptchaProvider
			reCaptchaKey={RECAPTCHA_SITE_KEY}
			container={{
				parameters: {
					badge: "inline",
				},
			}}>
			<ErrorBoundary>
				<CartProvider>
					<AuthProvider>
						<ProductProvider>
							<VATProvider>
								<div className="App">
									<ActEdNavbar />
									<div className="px-3 px-lg-4 px-xl-5">
										<Routes>
											<Route
												path="/"
												element={<Navigate to="/home" replace />}
											/>
											<Route path="/home" element={<Home />} />
											<Route
												path="/profile"
												element={<ProfileForm mode="profile" />}
											/>
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
												element={
													<ProfileForm
														mode="registration"
														title="Create Your ActEd Account"
													/>
												}
											/>
											<Route
												path="/tutorials"
												element={<TutorialProductList />}
											/>
											<Route
												path="/auth/forgot-password"
												element={<ForgotPasswordForm />}
											/>
											<Route
												path="/auth/reset-password"
												element={<ResetPasswordForm />}
											/>
											<Route
												path="/auth/activate"
												element={<AccountActivation />}
											/>
											<Route
												path="/auth/resend-activation"
												element={<ResendActivation />}
											/>
											<Route
												path="/auth/email-verification"
												element={<EmailVerification />}
											/>
											<Route path="*" element={<NoMatch />} />
										</Routes>
									</div>
								</div>
							</VATProvider>
						</ProductProvider>
					</AuthProvider>
				</CartProvider>
			</ErrorBoundary>
		</GoogleReCaptchaProvider>
	);
}

export default App;
