// src/hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from "react";
import authService from '../services/authService';

export const AuthContext = createContext(null);

export const useAuth = () => {
	const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
	const [user, setUser] = useState(authService.getCurrentUser());
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const login = async (credentials) => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await authService.login(credentials);
			setIsAuthenticated(true);
			await fetchUserDetails();
			return data;
		} catch (err) {
			setError(err.message);
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	const register = async (userData) => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await authService.register(userData);
			setIsAuthenticated(true);
			setUser(data.user);
			return data;
		} catch (err) {
			setError(err.message);
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	const logout = async () => {
		try {
			await authService.logout();
			setIsAuthenticated(false);
			setUser(null);
		} catch (err) {
			setError(err.message);
		}
	};

	const fetchUserDetails = async () => {
		try {
			const userDetails = await authService.getUserDetails();
			setUser(userDetails);
		} catch (err) {
			console.error("Error fetching user details:", err);
		}
	};

	// Fetch user details when authenticated
	useEffect(() => {
		if (isAuthenticated) {
			fetchUserDetails();
		}
	}, [isAuthenticated]);

	return {
		isAuthenticated,
		user,
		isLoading,
		error,
		login,
		register,
		logout,
	}
};
