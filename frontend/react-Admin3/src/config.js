// frontend/react_Admin3/src/config.js

const config = {
	apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
	authUrl:
		import.meta.env.VITE_API_BASE_URL + import.meta.env.VITE_API_AUTH_URL,
	userUrl:
		import.meta.env.VITE_API_BASE_URL + import.meta.env.VITE_API_USER_URL,
	examSessionUrl:
		import.meta.env.VITE_API_BASE_URL +
		import.meta.env.VITE_API_EXAM_SESSION_URL,
	productsUrl:
		import.meta.env.VITE_API_BASE_URL +
		import.meta.env.VITE_API_PRODUCT_URL,
	catalogUrl:
		import.meta.env.VITE_API_BASE_URL +
		import.meta.env.VITE_API_CATALOG_URL,
	subjectUrl:
		import.meta.env.VITE_API_BASE_URL +
		import.meta.env.VITE_API_SUBJECT_URL,
	examSessionSubjectUrl:
		import.meta.env.VITE_API_BASE_URL +
		import.meta.env.VITE_API_EXAM_SESSION_SUBJECT_URL,
	cartUrl:
		import.meta.env.VITE_API_BASE_URL + import.meta.env.VITE_API_CART_URL,
	countryUrl:
		import.meta.env.VITE_API_BASE_URL +
		import.meta.env.VITE_API_COUNTRIES_URL,
	markingUrl:
		import.meta.env.VITE_API_BASE_URL +
		import.meta.env.VITE_API_MARKING_URL,
	tutorialUrl:
		import.meta.env.VITE_API_BASE_URL +
		import.meta.env.VITE_API_TUTORIAL_URL,
	isDevelopment: import.meta.env.MODE === "development",
	isUAT: import.meta.env.VITE_ENV === "uat" || import.meta.env.VITE_ENVIRONMENT === "uat",
	pageSize: import.meta.env.VITE_API_PAGE_SIZE,
	enableDebugLogs: true,
};

// Development environment detected

export default config;
