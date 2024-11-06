"use client"

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { app } from './firebase';

const auth = getAuth(app);

const AuthContext = createContext({
  user: null,
  userData: null,
  loading: true,
  isAdmin: false,
  makeAuthenticatedRequest: async () => {},
  refreshUserData: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = useCallback(async () => {
    console.log("refreshUserData called");
    if (!user) {
      console.log("No user found in refreshUserData");
      return;
    }
    
    try {
      console.log("Getting ID token for user:", user.uid);
      const idToken = await user.getIdToken();
      console.log("ID token obtained");

      console.log("Making request to protected endpoint");
      const response = await fetch('http://localhost:5067/api/auth/protected', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      console.log("Response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Received user data:", data);
        setUserData(data.user);
        return data.user;
      } else {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(errorText);
      }
    } catch (error) {
      console.error('Error in refreshUserData:', error);
      throw error;
    }
  }, [user]);

  const makeAuthenticatedRequest = useCallback(async (url, options = {}) => {
    if (!user) {
      throw new Error('No authenticated user');
    }

    const idToken = await user.getIdToken();
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${idToken}`
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error('Request failed');
    }

    return response.json();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const idToken = await user.getIdToken();
          const response = await fetch('http://localhost:5067/api/auth/protected', {
            headers: {
              'Authorization': `Bearer ${idToken}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUserData(data.user);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const contextValue = {
    user,
    userData,
    loading,
    isAdmin: userData?.isAdmin || false,
    makeAuthenticatedRequest,
    refreshUserData
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 