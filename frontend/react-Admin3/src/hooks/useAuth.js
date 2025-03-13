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

    // Define logout as useCallback to prevent unnecessary re-renders
    const logout = useCallback(async () => {
        try {
            await authService.logout();
            setIsAuthenticated(false);
            setUser(null);
            setError(null);
            navigate("/");
        } catch (err) {
            setError(err.message);
        }
    }, [navigate]); // Include navigate in dependencies

    // Fetch user details function with useCallback
    const fetchUserDetails = useCallback(async () => {
        try {
            const userDetails = await authService.getUserDetails();
            setUser(userDetails);
        } catch (err) {
            console.error("Error fetching user details:", err);
            // If we can't fetch user details, user might be logged out
            logout();
        }
    }, [logout]); // Include logout in dependencies

    // Single initialization useEffect
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

                    // Verify token is still valid
                    try {
                        await authService.getUserDetails();
                    } catch (e) {
                        // If token is invalid, clear everything
                        await logout();
                    }
                }
            } catch (err) {
                setError(err.message);
                await logout();
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, [logout]); // Include logout in dependencies

    const login = async (credentials) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await authService.login(credentials);
            
            if (result.status === 'success') {
                setUser(result.user);
                setIsAuthenticated(true);
                navigate("/");
                return result;
            } 
            
            // Handle error response
            setError(result.message);
            setIsAuthenticated(false);
            // Clear any potentially partially stored data
            await logout();
            return result;
            
        } catch (err) {
            const errorMessage = err.message || "Login failed";
            setError(errorMessage);
            setIsAuthenticated(false);
            // Clear any potentially partially stored data
            await logout();
            return {
                status: 'error',
                message: errorMessage
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
            if (result.status === 'success') {
                setUser(result.user);
                setIsAuthenticated(true);
                navigate("/");
                return result;
            }
            
            setError(result.message);
            return result;
            
        } catch (err) {
            const errorMessage = err.message || "Registration failed";
            setError(errorMessage);
            return {
                status: 'error',
                message: errorMessage
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
