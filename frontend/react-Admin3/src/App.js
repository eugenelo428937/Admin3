// src/App.js
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Typography } from "@mui/material";
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';
import theme from "./theme/theme";
import { AuthProvider } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import UserProfile from "./pages/UserProfile";
import MainNavBar from "./components/Navigation/MainNavBar";
import NoMatch from "./components/NoMatch";
import { CartProvider } from "./contexts/CartContext";
import { ProductProvider } from "./contexts/ProductContext";
import { VATProvider } from "./contexts/VATContext";
import { TutorialChoiceProvider } from "./contexts/TutorialChoiceContext";
import { Container } from "@mui/material";
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
import ProductList from "./components/Product/ProductList";
import CheckoutPage from "./components/Ordering/CheckoutPage";
import OrderHistory from "./components/User/OrderHistory";
import ProfileForm from "./components/User/ProfileForm";
import TutorialProductList from "./components/Product/ProductCard/Tutorial/TutorialProductList";
import ForgotPasswordForm from "./components/User/ForgotPasswordForm";
import ResetPasswordForm from "./components/User/ResetPasswordForm";
import AccountActivation from "./components/User/AccountActivation";
import ResendActivation from "./components/User/ResendActivation";
import EmailVerification from "./components/User/EmailVerification";
import TutorialChoicePanel from "./components/Product/ProductCard/Tutorial/TutorialChoicePanel";
import ProductCardVariations from "./components/sandbox/ProductCardVariations";
import StyleGuide from "./components/StyleGuide";
import "./App.css";

const system = createSystem(defaultConfig);

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
		<ChakraProvider value={system}>
			<ThemeProvider theme={theme}>
				<CssBaseline />
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
									<TutorialChoiceProvider>
										<div className="App">
											<MainNavBar className="main-navbar" />
											<Container
												maxWidth={false}
												className="body-container">
												<Routes>
													<Route
														path="/"
														element={
															<Navigate to="/home" replace />
														}
													/>
													<Route
														path="/style-guide"
														element={<StyleGuide />}
													/>
													<Route path="/home" element={<Home />} />
													<Route
														path="/profile"
														element={<UserProfile />}
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
														path="/auth/verify-email"
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
													<Route
														path="/product-card-variations"
														element={<ProductCardVariations />}
													/>
												</Routes>
											</Container>

											{/* Tutorial Choice Panel */}
											<TutorialChoicePanel />
										</div>
									</TutorialChoiceProvider>
								</VATProvider>
							</ProductProvider>
						</AuthProvider>
					</CartProvider>
					</ErrorBoundary>
				</GoogleReCaptchaProvider>
			</ThemeProvider>
		</ChakraProvider>
	);
}

export default App;
