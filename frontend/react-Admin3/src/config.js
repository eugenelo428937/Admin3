// frontend/react_Admin3/src/config.js

const config = {
	apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
	authUrl:
		process.env.REACT_APP_API_BASE_URL + process.env.REACT_APP_API_AUTH_URL,
	userUrl:
		process.env.REACT_APP_API_BASE_URL + process.env.REACT_APP_API_USER_URL,
	examSessionUrl:
		process.env.REACT_APP_API_BASE_URL +
		process.env.REACT_APP_API_EXAM_SESSION_URL,
	productsUrl:
		process.env.REACT_APP_API_BASE_URL +
		process.env.REACT_APP_API_PRODUCT_URL,
	subjectUrl:
		process.env.REACT_APP_API_BASE_URL +
		process.env.REACT_APP_API_SUBJECT_URL,
	examSessionSubjectUrl:
		process.env.REACT_APP_API_BASE_URL +
		process.env.REACT_APP_API_EXAM_SESSION_SUBJECT_URL,
	cartUrl:
		process.env.REACT_APP_API_BASE_URL + process.env.REACT_APP_API_CART_URL,
	countryUrl:
		process.env.REACT_APP_API_BASE_URL +
		process.env.REACT_APP_API_COUNTRIES_URL,
	markingUrl:
		process.env.REACT_APP_API_BASE_URL +
		process.env.REACT_APP_API_MARKING_URL,
	tutorialUrl:
		process.env.REACT_APP_API_BASE_URL +
		process.env.REACT_APP_API_TUTORIAL_URL,
	isDevelopment: process.env.NODE_ENV === "development",
	isUAT: process.env.REACT_APP_ENV === "uat",
	pageSize: process.env.REACT_APP_API_PAGE_SIZE,
	enableDebugLogs: true,
};

// Development environment detected

export default config;
