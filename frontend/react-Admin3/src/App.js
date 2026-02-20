// src/App.js
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Provider } from 'react-redux';
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';
import theme from "./theme";
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

// Existing admin components
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

// US3: New catalog admin components
import AdminExamSessionSubjectList from "./components/admin/exam-session-subjects/ExamSessionSubjectList";
import AdminExamSessionSubjectForm from "./components/admin/exam-session-subjects/ExamSessionSubjectForm";
import AdminProductVariationList from "./components/admin/product-variations/ProductVariationList";
import AdminProductVariationForm from "./components/admin/product-variations/ProductVariationForm";
import AdminProductBundleList from "./components/admin/product-bundles/ProductBundleList";
import AdminProductBundleForm from "./components/admin/product-bundles/ProductBundleForm";

// US4: Store admin components
import AdminStoreProductList from "./components/admin/store-products/StoreProductList";
import AdminStoreProductForm from "./components/admin/store-products/StoreProductForm";
import AdminRecommendationList from "./components/admin/recommendations/RecommendationList";
import AdminRecommendationForm from "./components/admin/recommendations/RecommendationForm";
import AdminPriceList from "./components/admin/prices/PriceList";
import AdminPriceForm from "./components/admin/prices/PriceForm";
import AdminStoreBundleList from "./components/admin/store-bundles/StoreBundleList";
import AdminStoreBundleForm from "./components/admin/store-bundles/StoreBundleForm";

// New Session Setup wizard
import NewSessionSetup from "./components/admin/new-session-setup/NewSessionSetup";

// US5: User admin components
import AdminUserProfileList from "./components/admin/user-profiles/UserProfileList";
import AdminUserProfileForm from "./components/admin/user-profiles/UserProfileForm";
import AdminStaffList from "./components/admin/staff/StaffList";
import AdminStaffForm from "./components/admin/staff/StaffForm";

// US6: Email System admin components
import EmailSettingsList from "./components/admin/email/settings/EmailSettingsList";
import EmailTemplateList from "./components/admin/email/templates/EmailTemplateList";
import EmailTemplateForm from "./components/admin/email/templates/EmailTemplateForm";
import EmailQueueList from "./components/admin/email/queue/EmailQueueList";
import EmailQueueDetail from "./components/admin/email/queue/EmailQueueDetail";
import EmailQueueDuplicateForm from "./components/admin/email/queue/EmailQueueDuplicateForm";
import EmailAttachmentList from "./components/admin/email/attachments/EmailAttachmentList";
import EmailAttachmentForm from "./components/admin/email/attachments/EmailAttachmentForm";
import EmailContentRuleList from "./components/admin/email/content-rules/EmailContentRuleList";
import EmailContentRuleForm from "./components/admin/email/content-rules/EmailContentRuleForm";
import EmailPlaceholderList from "./components/admin/email/placeholders/EmailPlaceholderList";
import EmailPlaceholderForm from "./components/admin/email/placeholders/EmailPlaceholderForm";
import ClosingSalutationList from "./components/admin/email/closing-salutations/ClosingSalutationList";
import ClosingSalutationForm from "./components/admin/email/closing-salutations/ClosingSalutationForm";

// Public pages
import ProductList from "./components/Product/ProductList";
import CheckoutPage from "./components/Ordering/CheckoutPage";
import OrderHistory from "./components/User/OrderHistory";
import TutorialSummaryBarContainer from "./components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer"; // T015
import ForgotPasswordForm from "./components/User/ForgotPasswordForm";
import ResetPasswordForm from "./components/User/ResetPasswordForm";
import AccountActivation from "./components/User/AccountActivation";
import ResendActivation from "./components/User/ResendActivation";
import EmailVerification from "./components/User/EmailVerification";
import StyleGuide from "./pages/StyleGuide";
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
										<Route path="/" element={<Navigate to="/home" replace />} />
										<Route path="/styleguide" element={<StyleGuide />} />
										<Route path="/theme-visualizer" element={<MaterialThemeVisualizer />} />
										<Route path="/home" element={<Home />} />
										<Route path="/profile" element={<ProfilePage />} />
										<Route path="/products" element={<ProductList />} />

										{/* Admin: Exam Sessions (US2) */}
										<Route path="/admin/exam-sessions" element={<AdminExamSessionList />} />
										<Route path="/admin/exam-sessions/new" element={<AdminExamSessionForm />} />
										<Route path="/admin/exam-sessions/:id/edit" element={<AdminExamSessionForm />} />

										{/* Admin: Subjects (US2) */}
										<Route path="/admin/subjects" element={<AdminSubjectList />} />
										<Route path="/admin/subjects/new" element={<AdminSubjectForm />} />
										<Route path="/admin/subjects/:id" element={<AdminSubjectDetail />} />
										<Route path="/admin/subjects/:id/edit" element={<AdminSubjectForm />} />
										<Route path="/admin/subjects/import" element={<AdminSubjectImport />} />

										{/* Admin: Products (US2/US3) */}
										<Route path="/admin/products" element={<AdminProductList />} />
										<Route path="/admin/products/new" element={<AdminProductForm />} />
										<Route path="/admin/products/:id" element={<AdminProductDetail />} />
										<Route path="/admin/products/:id/edit" element={<AdminProductForm />} />
										<Route path="/admin/products/import" element={<AdminProductImport />} />

										{/* Admin: Exam Session Subjects (US3) */}
										<Route path="/admin/exam-session-subjects" element={<AdminExamSessionSubjectList />} />
										<Route path="/admin/exam-session-subjects/new" element={<AdminExamSessionSubjectForm />} />
										<Route path="/admin/exam-session-subjects/:id/edit" element={<AdminExamSessionSubjectForm />} />

										{/* Admin: Product Variations (US3) */}
										<Route path="/admin/product-variations" element={<AdminProductVariationList />} />
										<Route path="/admin/product-variations/new" element={<AdminProductVariationForm />} />
										<Route path="/admin/product-variations/:id/edit" element={<AdminProductVariationForm />} />

										{/* Admin: Product Bundles (US3) */}
										<Route path="/admin/product-bundles" element={<AdminProductBundleList />} />
										<Route path="/admin/product-bundles/new" element={<AdminProductBundleForm />} />
										<Route path="/admin/product-bundles/:id/edit" element={<AdminProductBundleForm />} />

										{/* Admin: Store Products (US4) */}
										<Route path="/admin/store-products" element={<AdminStoreProductList />} />
										<Route path="/admin/store-products/new" element={<AdminStoreProductForm />} />
										<Route path="/admin/store-products/:id/edit" element={<AdminStoreProductForm />} />

										{/* Admin: Recommendations (US4) */}
										<Route path="/admin/recommendations" element={<AdminRecommendationList />} />
										<Route path="/admin/recommendations/new" element={<AdminRecommendationForm />} />
										<Route path="/admin/recommendations/:id/edit" element={<AdminRecommendationForm />} />

										{/* Admin: Prices (US4) */}
										<Route path="/admin/prices" element={<AdminPriceList />} />
										<Route path="/admin/prices/new" element={<AdminPriceForm />} />
										<Route path="/admin/prices/:id/edit" element={<AdminPriceForm />} />

										{/* Admin: Store Bundles (US4) */}
										<Route path="/admin/store-bundles" element={<AdminStoreBundleList />} />
										<Route path="/admin/store-bundles/new" element={<AdminStoreBundleForm />} />
										<Route path="/admin/store-bundles/:id/edit" element={<AdminStoreBundleForm />} />

										{/* Admin: User Profiles (US5) */}
										<Route path="/admin/user-profiles" element={<AdminUserProfileList />} />
										<Route path="/admin/user-profiles/:id/edit" element={<AdminUserProfileForm />} />

										{/* Admin: Staff (US5) */}
										<Route path="/admin/staff" element={<AdminStaffList />} />
										<Route path="/admin/staff/new" element={<AdminStaffForm />} />
										<Route path="/admin/staff/:id/edit" element={<AdminStaffForm />} />

										{/* Admin: New Session Setup Wizard */}
										<Route path="/admin/new-session-setup" element={<NewSessionSetup />} />
										<Route path="/admin/new-session-setup/:sessionId" element={<NewSessionSetup />} />

										{/* Admin: Email Settings (US6) */}
									<Route path="/admin/email/settings" element={<EmailSettingsList />} />

									{/* Admin: Email Templates (US6) */}
									<Route path="/admin/email/templates" element={<EmailTemplateList />} />
									<Route path="/admin/email/templates/new" element={<EmailTemplateForm />} />
									<Route path="/admin/email/templates/:id/edit" element={<EmailTemplateForm />} />

									{/* Admin: Email Queue (US6) */}
									<Route path="/admin/email/queue" element={<EmailQueueList />} />
									<Route path="/admin/email/queue/:id" element={<EmailQueueDetail />} />
									<Route path="/admin/email/queue/:id/duplicate" element={<EmailQueueDuplicateForm />} />

									{/* Admin: Email Attachments (US6) */}
									<Route path="/admin/email/attachments" element={<EmailAttachmentList />} />
									<Route path="/admin/email/attachments/new" element={<EmailAttachmentForm />} />
									<Route path="/admin/email/attachments/:id/edit" element={<EmailAttachmentForm />} />

									{/* Admin: Email Content Rules (US6) */}
									<Route path="/admin/email/content-rules" element={<EmailContentRuleList />} />
									<Route path="/admin/email/content-rules/new" element={<EmailContentRuleForm />} />
									<Route path="/admin/email/content-rules/:id/edit" element={<EmailContentRuleForm />} />

									{/* Admin: Email Placeholders (US6) */}
									<Route path="/admin/email/placeholders" element={<EmailPlaceholderList />} />
									<Route path="/admin/email/placeholders/new" element={<EmailPlaceholderForm />} />
									<Route path="/admin/email/placeholders/:id/edit" element={<EmailPlaceholderForm />} />

									{/* Admin: Email Closing Salutations (US6) */}
									<Route path="/admin/email/closing-salutations" element={<ClosingSalutationList />} />
									<Route path="/admin/email/closing-salutations/new" element={<ClosingSalutationForm />} />
									<Route path="/admin/email/closing-salutations/:id/edit" element={<ClosingSalutationForm />} />

									{/* Public routes */}
										<Route path="/checkout" element={<CheckoutPage />} />
										<Route path="/orders" element={<OrderHistory />} />
										<Route path="/auth/forgot-password" element={<ForgotPasswordForm />} />
										<Route path="/auth/reset-password" element={<ResetPasswordForm />} />
										<Route path="/auth/activate" element={<AccountActivation />} />
										<Route path="/auth/verify-email" element={<AccountActivation />} />
										<Route path="/auth/resend-activation" element={<ResendActivation />} />
										<Route path="/auth/email-verification" element={<EmailVerification />} />
										<Route path="/register" element={<Registration />} />
										<Route path="*" element={<NoMatch />} />
									</Routes>

									{/* T015: Global tutorial summary bars - visible across all routes */}
									<TutorialSummaryBarContainer />
								</Container>

								{/* Footer component */}
								<Footer sx={{mt:5}}/>
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
