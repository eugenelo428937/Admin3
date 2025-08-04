import axios from "axios";
import authService from "./authService";
import config from "../config";
import logger from "./loggerService";

const httpService = axios.create({
	baseURL: config.apiBaseUrl,
	withCredentials: true,
	headers: { "Content-Type": "application/json" },
});

// Function to get CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
// Function to get CSRF token from the backend
const fetchCsrfToken = async () => {
    try {
        const response = await axios.get(`${config.authUrl}/csrf/`, {
            withCredentials: true
        });
        
        // Log session establishment for debugging
        if (process.env.NODE_ENV === 'development' && response.data.sessionKey) {
            console.log('🔐 [httpService] Session established:', response.data.sessionKey);
        }
        
        return response.data.csrfToken;
    } catch (error) {
        logger.error("Error fetching CSRF token:", error);
        return null;
    }
};
httpService.interceptors.request.use(
	async (config) => {
		// Add CSRF token - only fetch if cookie doesn't exist AND it's required for the request
		let csrfToken = getCookie("csrftoken");
		
		// Only add CSRF token if we have one from cookie
		// Don't fetch new token to avoid creating new session
		if (csrfToken) {
			config.headers["X-CSRFToken"] = csrfToken;
		} else {
			// For POST/PUT/PATCH/DELETE requests that need CSRF, try to get token without creating new session
			const isModifyingRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase());
			if (isModifyingRequest && !config.url?.includes('/csrf/')) {
				// Try to fetch CSRF token only for non-CSRF endpoints
				try {
					csrfToken = await fetchCsrfToken();
					if (csrfToken) {
						config.headers["X-CSRFToken"] = csrfToken;
					}
				} catch (error) {
					console.warn("Failed to fetch CSRF token:", error);
					// Continue without CSRF token - let Django handle the error
				}
			}
		}

		const token = localStorage.getItem("token");
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

httpService.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;
        
        // Check if error.response exists and is a 401 error
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true;

			// Clear auth data if unauthorized
			localStorage.removeItem("token");
			localStorage.removeItem("user");
			localStorage.removeItem("isAuthenticated");

			try {
				const refreshToken = localStorage.getItem("refreshToken");
                if (!refreshToken) {
                    return Promise.reject(error);
                }
				const response = await authService.refreshToken(refreshToken);
				const newToken = response.data.token;
				localStorage.setItem("token", newToken);
				originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
				return httpService(originalRequest);
			} catch (refreshError) {
				// If refresh fails, logout
				localStorage.removeItem("token");
				localStorage.removeItem("refreshToken");
				localStorage.removeItem("user");
				localStorage.removeItem("isAuthenticated");					
				return Promise.reject(refreshError);
			}
		}
        
        // Handle network errors or other errors without response
        if (!error.response) {
            // Network error - server is likely not running
            console.error('Network Error: Could not connect to server. Please ensure the Django server is running on', config.apiBaseUrl);
        }
        
        return Promise.reject(error);
    }
);

// Create an axios instance with default configuration 
// const httpService = axios.create({
// 	baseURL: process.env.REACT_APP_API_URL || "http://127.0.0.1:8888",
// 	withCredentials: true,
// 	headers: { "Content-Type": "application/json" },
// });

// // Function to get CSRF token from the backend
// export const getCsrfToken = async () => {
//     try {
//         const response = await httpService.get("/api/auth/csrf/");
//         return response.data.csrfToken;
//     } catch (error) {
//         console.error("Error fetching CSRF token:", error);
//         throw error;
//     }
// };

// Add a request interceptor to include CSRF and Authorization headers on every request 
// httpService.interceptors.request.use(
//     async (config) => {
//         // Get CSRF token from cookies, if available
//         let csrfToken = getCookie("csrftoken");
        
//         // If no CSRF token in cookie, fetch it
//         if (!csrfToken) {
//             try {
//                 csrfToken = await getCsrfToken();
//             } catch (error) {
//                 console.error("Failed to fetch CSRF token:", error);
//             }
//         }

//         if (csrfToken) {
//             config.headers["X-CSRFToken"] = csrfToken;
//         }

//         // Get the Authorization token from localStorage, if available
//         const token = localStorage.getItem("token");
//         if (token) {
//             config.headers["Authorization"] = `Bearer ${token}`;
//         }
//         return config;
//     },
//     (error) => Promise.reject(error)
// );

export default httpService;
