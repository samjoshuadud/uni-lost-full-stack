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

  const makeAuthenticatedRequest = async (endpoint, options = {}) => {
    if (!user) {
      console.log('No user found for authenticated request');
      return null;
    }

    try {
      const email = user.email;
      const url = `http://localhost:5067${endpoint}`;
      console.log('Making authenticated request:', {
        url,
        email,
        displayName: user.displayName,
        uid: user.uid
      });
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${email}`,
          'DisplayName': user.displayName || email,
          'FirebaseUID': user.uid,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        return null;
      }

      const data = await response.json();
      console.log('API Response data:', data);
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return null;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      console.log('Starting Google sign in...');
      
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;
      console.log('Google sign in successful:', {
        email: email,
        displayName: result.user.displayName,
        uid: result.user.uid
      });
      
      // First check if it's a UMAK email
      const isUmakEmail = email.endsWith('@umak.edu.ph');
      console.log('Is UMAK email:', isUmakEmail);
      
      // Add a small delay to ensure Firebase user is set
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Make the request with the result.user instead of waiting for useAuthState
      const response = await fetch('http://localhost:5067/api/Auth/protected', {
        headers: {
          'Authorization': `Bearer ${email}`,
          'DisplayName': result.user.displayName || email,
          'FirebaseUID': result.user.uid,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Protected response:', data);

      if (!response.ok) {
        console.error('Protected endpoint error:', response.status);
        await signOut(auth);
        showError(
          'Authentication Failed',
          data.message || 'Failed to verify your account. Please try again.'
        );
        return;
      }

      if (!isUmakEmail) {
        // If not UMAK email, check if it's a development email
        const isDevelopmentEmail = data.settings?.developmentEmails
          ?.some(devEmail => devEmail.toLowerCase() === email.toLowerCase());
        
        console.log('Development email check:', {
          isDevelopmentEmail,
          availableDevelopmentEmails: data.settings?.developmentEmails
        });

        if (!isDevelopmentEmail) {
          console.log('Email not allowed, signing out...');
          await signOut(auth);
          showError(
            'Email Not Allowed',
            'Please use your UMAK email address (@umak.edu.ph)'
          );
          return;
        }
      }

      // If we get here, the email is allowed
      console.log('Authentication successful:', {
        isAdmin: data.user?.isAdmin,
        email: data.user?.email
      });

      // Set admin status if the authentication was successful
      if (data.user?.isAdmin) {
        setIsAdmin(true);
      }

    } catch (error) {
      console.error('Sign in error:', error);
      // Only sign out and show error if it wasn't a popup closed error
      if (error.code !== 'auth/popup-closed-by-user') {
        await signOut(auth);
        showError(
          'Sign In Failed',
          'An error occurred while signing in. Please try again.'
        );
      }
    }
  };

  const logout = async () => {
    try {
      // Clear any intervals or subscriptions first
      setIsAdmin(false);  // Clear admin status first
      await signOut(auth);  // Then sign out
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Check user role whenever user changes
  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        try {
          const response = await makeAuthenticatedRequest('/api/Auth/protected');
          if (response?.user?.isAdmin) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('Error checking user role:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setIsLoading(false);
    };

    checkUserRole();
  }, [user]);

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