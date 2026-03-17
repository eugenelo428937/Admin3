// frontend/react_Admin3/src/config.ts

interface ImportMetaEnv {
  VITE_API_BASE_URL?: string;
  VITE_API_AUTH_URL?: string;
  VITE_API_USER_URL?: string;
  VITE_API_EXAM_SESSION_URL?: string;
  VITE_API_PRODUCT_URL?: string;
  VITE_API_CATALOG_URL?: string;
  VITE_API_SUBJECT_URL?: string;
  VITE_API_EXAM_SESSION_SUBJECT_URL?: string;
  VITE_API_CART_URL?: string;
  VITE_API_COUNTRIES_URL?: string;
  VITE_API_MARKING_URL?: string;
  VITE_API_TUTORIAL_URL?: string;
  VITE_API_EMAIL_URL?: string;
  VITE_API_PAGE_SIZE?: string;
  VITE_ENV?: string;
  VITE_ENVIRONMENT?: string;
  MODE?: string;
}

interface AppConfig {
  apiBaseUrl: string | undefined;
  authUrl: string;
  userUrl: string;
  examSessionUrl: string;
  productsUrl: string;
  catalogUrl: string;
  subjectUrl: string;
  examSessionSubjectUrl: string;
  cartUrl: string;
  countryUrl: string;
  markingUrl: string;
  tutorialUrl: string;
  emailUrl: string;
  isDevelopment: boolean;
  isUAT: boolean;
  pageSize: string | undefined;
  enableDebugLogs: boolean;
}

const env = import.meta.env;

const config: AppConfig = {
	apiBaseUrl: env.VITE_API_BASE_URL,
	authUrl:
		(env.VITE_API_BASE_URL || '') + (env.VITE_API_AUTH_URL || ''),
	userUrl:
		(env.VITE_API_BASE_URL || '') + (env.VITE_API_USER_URL || ''),
	examSessionUrl:
		(env.VITE_API_BASE_URL || '') +
		(env.VITE_API_EXAM_SESSION_URL || ''),
	productsUrl:
		(env.VITE_API_BASE_URL || '') +
		(env.VITE_API_PRODUCT_URL || ''),
	catalogUrl:
		(env.VITE_API_BASE_URL || '') +
		(env.VITE_API_CATALOG_URL || ''),
	subjectUrl:
		(env.VITE_API_BASE_URL || '') +
		(env.VITE_API_SUBJECT_URL || ''),
	examSessionSubjectUrl:
		(env.VITE_API_BASE_URL || '') +
		(env.VITE_API_EXAM_SESSION_SUBJECT_URL || ''),
	cartUrl:
		(env.VITE_API_BASE_URL || '') + (env.VITE_API_CART_URL || ''),
	countryUrl:
		(env.VITE_API_BASE_URL || '') +
		(env.VITE_API_COUNTRIES_URL || ''),
	markingUrl:
		(env.VITE_API_BASE_URL || '') +
		(env.VITE_API_MARKING_URL || ''),
	tutorialUrl:
		(env.VITE_API_BASE_URL || '') +
		(env.VITE_API_TUTORIAL_URL || ''),
	emailUrl:
		(env.VITE_API_BASE_URL || '') +
		(env.VITE_API_EMAIL_URL || ''),
	isDevelopment: env.MODE === "development",
	isUAT: env.VITE_ENV === "uat" || env.VITE_ENVIRONMENT === "uat",
	pageSize: env.VITE_API_PAGE_SIZE,
	enableDebugLogs: true,
};

// Development environment detected

export default config;
