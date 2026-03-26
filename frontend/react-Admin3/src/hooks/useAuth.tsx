// src/hooks/useAuth.ts
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, createContext, useContext, useCallback } from "react";
import authService from "../services/authService";
import type {
  AuthUser,
  LoginCredentials,
  AuthResult,
  RegistrationData,
  RegistrationResult,
  AuthContextValue,
} from "../types/auth";

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // User role states
  const [isSuperuser, setIsSuperuser] = useState<boolean>(false);
  const [isApprentice, setIsApprentice] = useState<boolean>(false);
  const [isStudyPlus, setIsStudyPlus] = useState<boolean>(false);

  // Helper function to update user role states
  const updateUserRoles = useCallback((userData: AuthUser | null) => {
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
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("isAuthenticated");

      setIsAuthenticated(false);
      setUser(null);
      setError(null);
      updateUserRoles(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, [updateUserRoles]);

  const logout = useCallback(
    async ({ redirect = true }: { redirect?: boolean } = {}) => {
      await clearAuthState();
      if (redirect) {
        navigate("/");
      }
    },
    [navigate, clearAuthState],
  );

  const fetchUserDetails = useCallback(async () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        await clearAuthState();
        return;
      }
    } catch (err: any) {
      console.error("Error fetching user details:", err);
      await clearAuthState();
    }
  }, [clearAuthState]);

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        // Check for machine token in URL fragment
        const hash = window.location.hash;
        if (hash.includes('machine_token=')) {
          const token = hash.split('machine_token=')[1];
          // Clear fragment immediately — before any network request
          window.history.replaceState({}, '', window.location.pathname);

          if (token) {
            const result = await authService.machineLogin(token);
            if (result.status === 'success' && result.user) {
              setUser(result.user);
              setIsAuthenticated(true);
              updateUserRoles(result.user);
              setIsLoading(false);
              return;
            }
            // Machine login failed — set error, fall through to normal flow
            setError(result.message || 'Auto-login failed. Please log in manually.');
          }
        }

        // Normal auth initialization: check localStorage
        const storedUser = localStorage.getItem("user");
        const storedAuth = localStorage.getItem("isAuthenticated");

        if (storedUser && storedAuth === "true") {
          const userData: AuthUser = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
          updateUserRoles(userData);

          // Verify token is still valid
          try {
            await authService.getUserDetails();
          } catch (e) {
            await clearAuthState();
          }
        }
      } catch (err: any) {
        setError(err.message);
        await clearAuthState();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [clearAuthState, updateUserRoles]);

  const login = async (credentials: LoginCredentials): Promise<AuthResult> => {
    setIsLoading(true);
    setError(null);
    await clearAuthState();

    try {
      const result = await authService.login(credentials);

      if (result.status === "success") {
        setUser(result.user!);
        setIsAuthenticated(true);
        setError(null);
        updateUserRoles(result.user!);

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
    } catch (err: any) {
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

  const register = async (userData: RegistrationData): Promise<RegistrationResult> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authService.register(userData);
      if (result.status === "success") {
        setUser(result.user!);
        setIsAuthenticated(true);
        updateUserRoles(result.user!);
        return result;
      }

      setError(result.message);
      return result;
    } catch (err: any) {
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
  }, [isAuthenticated, fetchUserDetails]);

  const value: AuthContextValue = {
    isAuthenticated,
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    isSuperuser,
    isApprentice,
    isStudyPlus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
