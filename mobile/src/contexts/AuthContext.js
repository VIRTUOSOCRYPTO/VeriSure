import React, { createContext, useState, useContext, useEffect } from 'react';
import apiService from '../services/apiService';
import storageService from '../services/storageService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const accessToken = await storageService.getAccessToken();
      if (accessToken) {
        const userData = await apiService.auth.getProfile();
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.log('Auth check error:', error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email, password, fullName, organization) => {
    try {
      await apiService.auth.register(email, password, fullName, organization);
      // After registration, login automatically
      await login(email, password);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed',
      };
    }
  };

  const login = async (email, password) => {
    try {
      await apiService.auth.login(email, password);
      const userData = await apiService.auth.getProfile();
      setUser(userData);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  };

  const logout = async () => {
    try {
      await apiService.auth.logout();
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateProfile = async (fullName, organization) => {
    try {
      await apiService.auth.updateProfile(fullName, organization);
      const updatedUser = await apiService.auth.getProfile();
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Update failed',
      };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await apiService.auth.changePassword(currentPassword, newPassword);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Password change failed',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        register,
        login,
        logout,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
