// src/App.js
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Provider } from 'react-redux';
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';
import theme from "./theme/theme";
import { bodyContainerStyles } from "./theme/styles";
import { store } from './store';
import { AuthProvider } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import ProfilePage from "./pages/ProfilePage";
import MainNavBar from "./components/Navigation/MainNavBar";
import NoMatch from "./components/NoMatch";
import { CartProvider } from "./contexts/CartContext";
import { ProductProvider } from "./contexts/ProductContext";
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
import TutorialSummaryBarContainer from "./components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer"; // T015
import ForgotPasswordForm from "./components/User/ForgotPasswordForm";
import ResetPasswordForm from "./components/User/ResetPasswordForm";
import AccountActivation from "./components/User/AccountActivation";
import ResendActivation from "./components/User/ResendActivation";
import EmailVerification from "./components/User/EmailVerification";
import StyleGuide from "./components/StyleGuide";
import MaterialThemeVisualizer from "./components/styleguide/MaterialThemeVisualizer";
import Registration from './pages/Registration';
import Footer from "./components/Footer";
import "./App.scss";

const system = createSystem(defaultConfig);

function App() {
	// eslint-disable-next-line
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	// reCAPTCHA v3 configuration
	const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

	// Validate reCAPTCHA configuration
	useEffect(() => {
		if (!RECAPTCHA_SITE_KEY) {
			console.error(
				'CRITICAL: REACT_APP_RECAPTCHA_SITE_KEY is not configured. ' +
				'reCAPTCHA v3 will not function. Please add it to your .env file.'
			);
		}
	}, [RECAPTCHA_SITE_KEY]);

	useEffect(() => {
		// Check if the user is authenticated
		const authStatus = localStorage.getItem("isAuthenticated");
		if (authStatus === "true") {
			setIsAuthenticated(true);
		}
	}, []);

	// Clear legacy filter cookies (Story 1.13 - Cookie Middleware Removal)
	useEffect(() => {
		// Clear any legacy filter cookies from before cookie middleware was removed
		document.cookie.split(";").forEach((c) => {
			if (c.trim().startsWith("filters_") || c.trim().startsWith("productFilters")) {
				document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
			}
		});
	}, []);

	// Handle reCAPTCHA badge: hide duplicates and scroll behavior for mobile
	useEffect(() => {
		let hasScrolled = false;

		// Function to hide duplicate badges (keep only the first one)
		const hideDuplicateBadges = () => {
			const badges = document.querySelectorAll('.grecaptcha-badge');
			if (badges.length > 1) {
				// Hide all badges except the first one
				badges.forEach((badge, index) => {
					if (index > 0) {
						badge.style.display = 'none';
					}
				});
			}
		};

		const handleScroll = () => {
			// Only apply on mobile (< 900px)
			if (window.innerWidth >= 900) return;

			// Target the first (visible) grecaptcha badge
			const badge = document.querySelector('.grecaptcha-badge');
			if (!badge) return;

			const currentScrollY = window.scrollY;

			// If user has scrolled more than 10px from top, hide the badge
			if (currentScrollY > 10 && !hasScrolled) {
				badge.classList.add('recaptcha-hidden');
				hasScrolled = true;
			} else if (currentScrollY <= 10 && hasScrolled) {
				// Show badge again when scrolled back to top
				badge.classList.remove('recaptcha-hidden');
				hasScrolled = false;
			}
		};

		// Check for duplicate badges periodically (Google may add badges dynamically)
		const checkInterval = setInterval(hideDuplicateBadges, 1000);

		// Initial check after a short delay for badges to load
		setTimeout(hideDuplicateBadges, 500);

		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			window.removeEventListener('scroll', handleScroll);
			clearInterval(checkInterval);
		};
	}, []);

	// App content wrapped conditionally with reCAPTCHA provider
	const AppContent = () => (
		<ErrorBoundary>
			<CartProvider>
				<AuthProvider>
					<ProductProvider>
						<TutorialChoiceProvider>
							<div className="App">
								<MainNavBar className="main-navbar" />
								<Container
									maxWidth={true}
									disableGutters={true}
									sx={bodyContainerStyles}>
									<Routes>
														<Route
															path="/"
															element={
																<Navigate to="/home" replace />
															}
														/>
														<Route
															path="/styleguide"
															element={<StyleGuide />}
														/>
														<Route
															path="/theme-visualizer"
															element={<MaterialThemeVisualizer />}
														/>
														<Route
															path="/home"
															element={<Home />}
														/>						
													{/* New wizard-based profile page (T038) */}
														<Route
															path="/profile"
															element={<ProfilePage />}
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
														<Route
															path="*"
															element={<NoMatch />}
														/>																
														<Route
															path="/register"
															element={<Registration />}
														/>
													</Routes>

									{/* T015: Global tutorial summary bars - visible across all routes */}
									<TutorialSummaryBarContainer />
								</Container>

								{/* Footer component */}
								<Footer />
							</div>
						</TutorialChoiceProvider>
					</ProductProvider>
				</AuthProvider>
			</CartProvider>
		</ErrorBoundary>
	);

	return (
		<Provider store={store}>
			<ChakraProvider value={system}>
				<ThemeProvider theme={theme}>
					<CssBaseline />
					{RECAPTCHA_SITE_KEY ? (
						<GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
							<AppContent />
						</GoogleReCaptchaProvider>
					) : (
						<AppContent />
					)}
				</ThemeProvider>
			</ChakraProvider>
		</Provider>
	);
}

export default App;
