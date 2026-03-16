// src/App.js
import React, { Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Provider } from 'react-redux';
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, CircularProgress, Box } from "@mui/material";
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';
import theme from "./theme";
import { bodyContainerStyles } from "./theme/styles";
import { store } from './store';
import { AuthProvider } from "./hooks/useAuth.tsx";
import { ConfigProvider } from "./contexts/ConfigContext.js";
import ErrorBoundary from "./components/ErrorBoundary.js";
import Home from "./pages/Home.js";
import MainNavBar from "./components/Navigation/MainNavBar.js";
import NoMatch from "./components/NoMatch.js";
import { CartProvider } from "./contexts/CartContext.tsx";
import { ProductProvider } from "./contexts/ProductContext.js";
import { TutorialChoiceProvider } from "./contexts/TutorialChoiceContext.js";
import { Container } from "@mui/material";
import Footer from "./components/Footer";
import "./App.scss";

// --- Lazy-loaded routes (code-split into separate chunks) ---

// Public pages
const ProfilePage = React.lazy(() => import("./pages/ProfilePage.js"));
const ProductList = React.lazy(() => import("./components/Product/ProductList.js"));
const CheckoutPage = React.lazy(() => import("./components/Ordering/CheckoutPage.tsx"));
const OrderHistory = React.lazy(() => import("./components/User/OrderHistory.tsx"));
const TutorialSummaryBarContainer = React.lazy(() => import("./components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js"));
const ForgotPasswordForm = React.lazy(() => import("./components/User/ForgotPasswordForm.tsx"));
const ResetPasswordForm = React.lazy(() => import("./components/User/ResetPasswordForm.tsx"));
const AccountActivation = React.lazy(() => import("./components/User/AccountActivation.tsx"));
const ResendActivation = React.lazy(() => import("./components/User/ResendActivation.tsx"));
const EmailVerification = React.lazy(() => import("./components/User/EmailVerification.tsx"));
const StyleGuide = React.lazy(() => import("./pages/StyleGuide.js"));
const MaterialThemeVisualizer = React.lazy(() => import("./components/styleguide/MaterialThemeVisualizer.js"));
const Registration = React.lazy(() => import('./pages/Registration.js'));

// Admin: Exam Sessions, Subjects, Products (US2)
const AdminExamSessionList = React.lazy(() => import("./components/admin/exam-sessions/ExamSessionList.tsx"));
const AdminExamSessionForm = React.lazy(() => import("./components/admin/exam-sessions/ExamSessionForm.tsx"));
const AdminSubjectList = React.lazy(() => import("./components/admin/subjects/SubjectList.tsx"));
const AdminSubjectForm = React.lazy(() => import("./components/admin/subjects/SubjectForm.tsx"));
const AdminSubjectDetail = React.lazy(() => import("./components/admin/subjects/SubjectDetail.tsx"));
const AdminSubjectImport = React.lazy(() => import("./components/admin/subjects/SubjectImport.tsx"));
const AdminProductList = React.lazy(() => import("./components/admin/products/ProductList.js"));
const AdminProductDetail = React.lazy(() => import("./components/admin/products/ProductDetail.js"));
const AdminProductForm = React.lazy(() => import("./components/admin/products/ProductForm.js"));
const AdminProductImport = React.lazy(() => import("./components/admin/products/ProductImport.js"));

// Admin: Catalog (US3)
const AdminExamSessionSubjectList = React.lazy(() => import("./components/admin/exam-session-subjects/ExamSessionSubjectList.js"));
const AdminExamSessionSubjectForm = React.lazy(() => import("./components/admin/exam-session-subjects/ExamSessionSubjectForm.js"));
const AdminProductVariationList = React.lazy(() => import("./components/admin/product-variations/ProductVariationList.js"));
const AdminProductVariationForm = React.lazy(() => import("./components/admin/product-variations/ProductVariationForm.js"));
const AdminProductBundleList = React.lazy(() => import("./components/admin/product-bundles/ProductBundleList.js"));
const AdminProductBundleForm = React.lazy(() => import("./components/admin/product-bundles/ProductBundleForm.js"));

// Admin: Store (US4)
const AdminStoreProductList = React.lazy(() => import("./components/admin/store-products/StoreProductList.js"));
const AdminStoreProductForm = React.lazy(() => import("./components/admin/store-products/StoreProductForm.js"));
const AdminRecommendationList = React.lazy(() => import("./components/admin/recommendations/RecommendationList.js"));
const AdminRecommendationForm = React.lazy(() => import("./components/admin/recommendations/RecommendationForm.js"));
const AdminPriceList = React.lazy(() => import("./components/admin/prices/PriceList.js"));
const AdminPriceForm = React.lazy(() => import("./components/admin/prices/PriceForm.js"));
const AdminStoreBundleList = React.lazy(() => import("./components/admin/store-bundles/StoreBundleList.js"));
const AdminStoreBundleForm = React.lazy(() => import("./components/admin/store-bundles/StoreBundleForm.js"));

// Admin: New Session Setup wizard
const NewSessionSetup = React.lazy(() => import("./components/admin/new-session-setup/NewSessionSetup.js"));

// Admin: Users & Staff (US5)
const AdminUserProfileList = React.lazy(() => import("./components/admin/user-profiles/UserProfileList.js"));
const AdminUserProfileForm = React.lazy(() => import("./components/admin/user-profiles/UserProfileForm.js"));
const AdminStaffList = React.lazy(() => import("./components/admin/staff/StaffList.js"));
const AdminStaffForm = React.lazy(() => import("./components/admin/staff/StaffForm.js"));

// Admin: Email System (US6)
const EmailSettingsList = React.lazy(() => import("./components/admin/email/settings/EmailSettingsList"));
const EmailTemplateList = React.lazy(() => import("./components/admin/email/templates/EmailTemplateList"));
const EmailTemplateForm = React.lazy(() => import("./components/admin/email/templates/EmailTemplateForm"));
const EmailQueueList = React.lazy(() => import("./components/admin/email/queue/EmailQueueList"));
const EmailQueueDetail = React.lazy(() => import("./components/admin/email/queue/EmailQueueDetail"));
const EmailQueueDuplicateForm = React.lazy(() => import("./components/admin/email/queue/EmailQueueDuplicateForm"));
const EmailAttachmentList = React.lazy(() => import("./components/admin/email/attachments/EmailAttachmentList"));
const EmailAttachmentForm = React.lazy(() => import("./components/admin/email/attachments/EmailAttachmentForm"));
const EmailContentRuleList = React.lazy(() => import("./components/admin/email/content-rules/EmailContentRuleList"));
const EmailContentRuleForm = React.lazy(() => import("./components/admin/email/content-rules/EmailContentRuleForm"));
const EmailPlaceholderList = React.lazy(() => import("./components/admin/email/placeholders/EmailPlaceholderList"));
const EmailPlaceholderForm = React.lazy(() => import("./components/admin/email/placeholders/EmailPlaceholderForm"));
const ClosingSalutationList = React.lazy(() => import("./components/admin/email/closing-salutations/ClosingSalutationList"));
const ClosingSalutationForm = React.lazy(() => import("./components/admin/email/closing-salutations/ClosingSalutationForm"));

const system = createSystem(defaultConfig);

const LazyFallback = () => (
	<Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
		<CircularProgress />
	</Box>
);

function App() {
	// eslint-disable-next-line
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	// reCAPTCHA v3 configuration
	const RECAPTCHA_SITE_KEY = import.meta.env?.VITE_RECAPTCHA_SITE_KEY;

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
			<ConfigProvider>
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
									<Suspense fallback={<LazyFallback />}>
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
									</Suspense>
								</Container>

								{/* Footer component */}
								<Footer sx={{mt:5}}/>
							</div>
						</TutorialChoiceProvider>
					</ProductProvider>
				</AuthProvider>
			</CartProvider>
			</ConfigProvider>
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
