import axios, { type InternalAxiosRequestConfig, type AxiosError } from "axios";
import authService from "./authService";
import config from "../config";
import logger from "./loggerService";

const httpService = axios.create({
    baseURL: (config as any).apiBaseUrl,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

// ─── CSRF Token Handling ─────────────────────────────────────────────

function getCookie(name: string): string | null {
    let cookieValue: string | null = null;
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

const fetchCsrfToken = async (): Promise<string | null> => {
    try {
        const response = await axios.get(`${(config as any).authUrl}/csrf/`, {
            withCredentials: true,
        });
        return response.data.csrfToken;
    } catch (error) {
        logger.error("Error fetching CSRF token:", error);
        return null;
    }
};

// ─── Request Interceptor ─────────────────────────────────────────────

httpService.interceptors.request.use(
    async (reqConfig: InternalAxiosRequestConfig) => {
        // Add CSRF token - only fetch if cookie doesn't exist AND it's required
        let csrfToken = getCookie("csrftoken");

        if (csrfToken) {
            reqConfig.headers["X-CSRFToken"] = csrfToken;
        } else {
            // For modifying requests, try to get CSRF token
            const isModifyingRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
                reqConfig.method?.toUpperCase() || ''
            );
            if (isModifyingRequest && !reqConfig.url?.includes('/csrf/')) {
                try {
                    csrfToken = await fetchCsrfToken();
                    if (csrfToken) {
                        reqConfig.headers["X-CSRFToken"] = csrfToken;
                    }
                } catch (error) {
                    // Continue without CSRF token - let Django handle the error
                }
            }
        }

        // Endpoints that should not include authorization headers
        const noAuthEndpoints = [
            '/activate/',
            '/send_activation/',
            '/verify_email/',
            '/password_reset_request/',
            '/password_reset_confirm/',
            '/login/',
            '/register/',
            '/csrf/',
        ];

        const skipAuth = noAuthEndpoints.some(
            (endpoint) => reqConfig.url?.includes(endpoint)
        );

        // Only add authorization header if we have a token AND it's not a no-auth endpoint
        const token = localStorage.getItem("token");
        if (token && !skipAuth) {
            reqConfig.headers.Authorization = `Bearer ${token}`;
        }

        return reqConfig;
    },
    (error: AxiosError) => Promise.reject(error)
);

// ─── Response Interceptor (Token Refresh) ────────────────────────────

httpService.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;

            // Clear auth data if unauthorized
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("isAuthenticated");

            try {
                const refreshToken = localStorage.getItem("refreshToken");
                if (!refreshToken) {
                    sessionStorage.setItem('authExpired', 'true');
                    window.location.href = '/';
                    return Promise.reject(error);
                }
                const response = await authService.refreshToken(refreshToken);
                const newToken = response.data.token;
                localStorage.setItem("token", newToken);
                originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
                return httpService(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem("token");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("user");
                localStorage.removeItem("isAuthenticated");
                sessionStorage.setItem('authExpired', 'true');
                window.location.href = '/';
                return Promise.reject(refreshError);
            }
        }

        // Handle network errors
        if (!error.response) {
            console.error(
                'Network Error: Could not connect to server. Please ensure the Django server is running on',
                (config as any).apiBaseUrl
            );
        }

        return Promise.reject(error);
    }
);

export default httpService;
