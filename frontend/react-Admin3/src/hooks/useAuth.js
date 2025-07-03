// src/hooks/useAuth.js
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, createContext, useContext, useCallback } from "react";
import authService from "../services/authService";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const navigate = useNavigate();
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	// New state variables for user roles
	const [isSuperuser, setIsSuperuser] = useState(false);
	const [isApprentice, setIsApprentice] = useState(false); // To be implemented
	const [isStudyPlus, setIsStudyPlus] = useState(false); // To be implemented

	// Helper function to update user role states
	const updateUserRoles = useCallback((userData) => {
		if (userData) {
			setIsSuperuser(userData.is_superuser || false);
			// TODO: Implement logic for isApprentice and isStudyPlus when backend support is ready
			setIsApprentice(false);
			setIsStudyPlus(false);
		} else {
			setIsSuperuser(false);
			setIsApprentice(false);
			setIsStudyPlus(false);
		}
	}, []);

	// Clear authentication state without navigation
	const clearAuthState = useCallback(async () => {
		try {
			// Clear localStorage directly instead of calling authService.logout
			localStorage.removeItem("token");
			localStorage.removeItem("refreshToken");
			localStorage.removeItem("user");
			localStorage.removeItem("isAuthenticated");

			//await authService.logout({ redirect: false });
			setIsAuthenticated(false);
			setUser(null);
			setError(null);
			// Clear user role states
			updateUserRoles(null);
		} catch (err) {
			setError(err.message);
		}
	}, [updateUserRoles]);

	const logout = useCallback(
		async ({ redirect = true } = {}) => {
			await clearAuthState();			
			if (redirect) {
				navigate("/");
			}
		},
		[navigate, clearAuthState]
	);

	const fetchUserDetails = useCallback(async () => {
		try {
			// Only fetch if we have a user in localStorage
			const storedUser = localStorage.getItem("user");
			if (!storedUser) {
				await clearAuthState();
				return;
			}

			//const userDetails = await authService.getUserDetails();
			//setUser(userDetails);
			//updateUserRoles(userDetails);
		} catch (err) {
			console.error("Error fetching user details:", err);			
			await clearAuthState();
		}
	}, [clearAuthState, updateUserRoles]);

	useEffect(() => {
		const initializeAuth = async () => {
			setIsLoading(true);
			try {
				const storedUser = localStorage.getItem("user");
				const storedAuth = localStorage.getItem("isAuthenticated");

				if (storedUser && storedAuth === "true") {
					const userData = JSON.parse(storedUser);
					setUser(userData);
					setIsAuthenticated(true);
					// Update user role states based on stored user data
					updateUserRoles(userData);

					// Verify token is still valid
					try {
						await authService.getUserDetails();
					} catch (e) {
						// If token is invalid, clear everything
						await clearAuthState();
					}
				}
			} catch (err) {
				setError(err.message);
				await clearAuthState();
			} finally {
				setIsLoading(false);
			}
		};

		initializeAuth();
	}, [clearAuthState, updateUserRoles]);

	const login = async (credentials) => {
		setIsLoading(true);
		setError(null);
		await clearAuthState();

		try {
			const result = await authService.login(credentials);

			if (result.status === "success") {
				setUser(result.user);
				setIsAuthenticated(true);
				setError(null);
				// Update user role states based on login result
				updateUserRoles(result.user);
				
				// Check for post-login redirect
				const redirectPath = localStorage.getItem("postLoginRedirect");
				if (redirectPath) {
					localStorage.removeItem("postLoginRedirect");
					navigate(redirectPath);
				} else {
					navigate("/");
				}
				return result;
			}
			// login error
			await clearAuthState();						
			setError(result.message);
			return result;
		} catch (err) {
			await clearAuthState();			
						
			const errorMessage = err.message || "Login failed";
			setError(errorMessage);
			return {
				status: "error",
				message: errorMessage,
			};
		} finally {
			setIsLoading(false);
		}
	};

	const register = async (userData) => {
		setIsLoading(true);
		setError(null);
		try {
			const result = await authService.register(userData);
			if (result.status === "success") {
				setUser(result.user);
				setIsAuthenticated(true);
				// Update user role states based on registration result
				updateUserRoles(result.user);
				//navigate("/");
				return result;
			}

			setError(result.message);
			return result;
		} catch (err) {
			const errorMessage = err.message || "Registration failed";
			setError(errorMessage);
			return {
				status: "error",
				message: errorMessage,
			};
		} finally {
			setIsLoading(false);
		}
	};

	// Fetch user details when authenticated
	useEffect(() => {
		if (isAuthenticated) {
			fetchUserDetails();
		}
	}, [isAuthenticated, fetchUserDetails]); // Include fetchUserDetails in dependencies

	const value = {
		isAuthenticated,
		user,
		isLoading,
		error,
		login,
		register,
		logout,
		// User role states
		isSuperuser,
		isApprentice,
		isStudyPlus,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
