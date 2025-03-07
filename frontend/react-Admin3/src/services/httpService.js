import axios from "axios";

// Helper function to get a cookie value by name 
function getCookie(name) { 
    let cookieValue = null; 
    if (document.cookie && document.cookie !== "") { 
        const cookies = document.cookie.split(";"); 
        for (let i = 0; i < cookies.length; i++) { 
            const cookie = cookies[i].trim(); 
            // Check if this cookie string begins with the name you want 
            if (cookie.substring(0, name.length + 1) === name + "=") {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                } 
            } 
        } 
        return cookieValue; 
    }

// Create an axios instance with default configuration 
const httpServiceProvider = axios.create({
	baseURL: process.env.REACT_APP_API_URL || "http://localhost:8888",
	withCredentials: true,
	headers: { "Content-Type": "application/json" },
});

// Add a request interceptor to include CSRF and Authorization headers on every request 
httpServiceProvider.interceptors.request.use(
	(config) => {
		// Get CSRF token from cookies, if available
		const csrfToken = getCookie("csrftoken");
		if (csrfToken) {
			config.headers["X-CSRFToken"] = csrfToken;
		}
		// Get the Authorization token from localStorage, if available
		const token = localStorage.getItem("token");
		if (token) {
			config.headers["Authorization"] = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

export default httpServiceProvider;
