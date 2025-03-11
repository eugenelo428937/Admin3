import axios from "axios";
import authService from "./authService";

const httpService = axios.create({
	baseURL: process.env.REACT_APP_API_URL,
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

httpService.interceptors.request.use(
	(config) => {
		// Add CSRF token
		const csrfToken = getCookie("csrftoken");
		if (csrfToken) {
			config.headers["X-CSRFToken"] = csrfToken;
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
        
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const refreshToken = localStorage.getItem('refreshToken');
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
                window.location.href = "/login";
                return Promise.reject(refreshError);
            }
        }
        
        return Promise.reject(error);
    }
);

// Create an axios instance with default configuration 
// const httpService = axios.create({
// 	baseURL: process.env.REACT_APP_API_URL || "http://localhost:8888",
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
