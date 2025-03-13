// src/hooks/useAuth.js
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, createContext, useContext } from "react";
import authService from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const navigate = useNavigate();
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	// Add error boundary state
	const [authError, setAuthError] = useState(null);
  useEffect(() => {
        const initializeAuth = async () => {
            setIsLoading(true);
            try {
                const storedUser = localStorage.getItem('user');
                const storedAuth = localStorage.getItem('isAuthenticated');
                
                if (storedUser && storedAuth === 'true') {
                    const userData = JSON.parse(storedUser);
                    setUser(userData);
                    setIsAuthenticated(true);
                    
                    // Verify token is still valid
                    try {
                        await authService.getUserDetails();
                    } catch (e) {
                        // If token is invalid, clear everything
                        logout();
                    }
                }
            } catch (err) {
                setAuthError(err.message);
                logout();
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);
    
	useEffect(() => {
		const storedUser = localStorage.getItem("user");
		const storedAuth = localStorage.getItem("isAuthenticated");

		if (storedUser && storedAuth === "true") {
			const userData = JSON.parse(storedUser);
      setUser(JSON.parse(storedUser));
			setIsAuthenticated(true);     
		}

		setIsLoading(false);
	}, []);

	const login = async (credentials) => {
		setIsLoading(true);
		setError(null);
		try {
			const userData = await authService.login(credentials);
			if (!userData) {
				throw new Error("Login failed: No user data received");
			} else if (userData.status === "error") {
				throw new Error(userData.message);
			}
		
			setUser(userData);
			setIsAuthenticated(true);
			navigate("/");
			return userData;
		} catch (err) {
			const errorMessage = err.response?.data?.message || err.message || "Login failed";
			setError(errorMessage);
			setIsAuthenticated(false);			
			// Clear any potentially partially stored data
			localStorage.removeItem("token");
			localStorage.removeItem("user");
			localStorage.removeItem("isAuthenticated");
			throw new Error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	const register = async (userData) => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await authService.register(userData);
			setUser(data.user);
			setIsAuthenticated(true);
			navigate("/");
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
			navigate("/");
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

	const value = {
		isAuthenticated,
		user,
		isLoading,
		error,
		login,
		register,
		logout,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
