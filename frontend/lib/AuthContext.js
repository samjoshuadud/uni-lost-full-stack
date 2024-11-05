// AuthContext.js

"use client"

import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import ErrorDialog from '@/app/components/dialogs/ErrorDialog';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, loading, error] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState({ title: '', message: '' });

  const showError = (title, message) => {
    setErrorMessage({ title, message });
    setErrorDialogOpen(true);
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      try {
        // Check email domain
        const email = result.user.email;
        
        // Make API call to check if email is allowed
        const response = await fetch('http://localhost:5067/api/auth/test-connection');
        if (!response.ok) {
          throw new Error('Failed to verify email access');
        }
        
        const data = await response.json();
        const isUmakEmail = email.endsWith('@umak.edu.ph');
        const isDevelopmentEmail = data.settings.developmentEmails.includes(email);
        
        if (!isUmakEmail && !isDevelopmentEmail) {
          await signOut(auth);
          showError(
            'Email Not Allowed',
            'Please use your UMAK email address (@umak.edu.ph)'
          );
        }
      } catch (error) {
        // If there's an error checking email access, sign out and show error
        await signOut(auth);
        showError(
          'Sign In Failed',
          'Please use your UMAK email address (@umak.edu.ph)'
        );
      }
    } catch (error) {
      // Only show error dialog if it's not a popup closed error
      if (error.code !== 'auth/popup-closed-by-user') {
        showError(
          'Sign In Failed',
          'An error occurred while signing in. Please try again.'
        );
      }
    }
  };

  const makeAuthenticatedRequest = async (url, options = {}) => {
    if (!user) return;

    try {
      const token = await user.getIdToken(true);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Handle unauthorized silently - will be caught by auth state change
        if (response.status === 401) {
          return null;
        }
        throw new Error('Request failed');
      }

      return await response.json();
    } catch (error) {
      // Log error but don't show to user
      console.error('API request failed:', error);
      return null;
    }
  };

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        setIsLoading(true);
        try {
          const response = await makeAuthenticatedRequest('http://localhost:5067/api/auth/protected');
          if (response) {
            setIsAdmin(response.user.isAdmin);
          }
        } catch (error) {
          console.error('Error checking user role:', error);
          setIsAdmin(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsAdmin(false);
        setIsLoading(false);
      }
    };

    checkUserRole();
  }, [user]);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      // Log error but don't show to user
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading: loading || isLoading,
      error,
      isAdmin,
      signInWithGoogle,
      logout,
      makeAuthenticatedRequest
    }}>
      {children}
      <ErrorDialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        title={errorMessage.title}
        message={errorMessage.message}
      />
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);