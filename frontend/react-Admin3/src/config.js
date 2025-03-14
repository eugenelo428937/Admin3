// frontend/react-Admin3/src/config.js
const config = {
	apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
	authUrl: process.env.REACT_APP_API_BASE_URL + process.env.REACT_APP_API_AUTH_URL,
	userUrl: process.env.REACT_APP_API_BASE_URL + process.env.REACT_APP_API_USER_URL,
	examSessionUrl: process.env.REACT_APP_API_BASE_URL + process.env.REACT_APP_API_EXAM_SESSION_URL,
	productUrl: process.env.REACT_APP_API_BASE_URL + process.env.REACT_APP_API_PRODUCT_URL,
	subjectUrl: process.env.REACT_APP_API_BASE_URL + process.env.REACT_APP_API_SUBJECT_URL,
	isDevelopment: process.env.NODE_ENV === "development",
	enableDebugLogs: true,
};

if (config.isDevelopment) {	
	console.log("environment:", config.isDevelopment);
	console.log("Debug logs enabled:", config.enableDebugLogs);	
}

export default config;
