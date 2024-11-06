"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/AuthContext"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import ErrorDialog from "./dialogs/ErrorDialog";

export default function LoginButton() {
  const { user, userData } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const storedError = localStorage.getItem("authError");
    if (storedError) {
      setErrorMessage(storedError);
      setShowErrorDialog(true);
      localStorage.removeItem("authError");
    }
  }, []);

  const handleContinue = async () => {
    try {
      setIsLoading(true);
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      
      // Get the result from Google sign in
      const result = await signInWithPopup(auth, provider);
      
      // Check if email is allowed
      const response = await fetch('http://localhost:5067/api/auth/protected', {
        headers: {
          'Authorization': `Bearer ${await result.user.getIdToken()}`
        }
      });

      if (!response.ok) {
        // If not allowed, sign out and show error dialog
        await auth.signOut();
        
        // Get the error message from the response
        const message = response.status === 401 
          ? "Please use your UMAK email address (@umak.edu.ph) to sign in."
          : "An error occurred during sign in. Please try again.";
        
        setErrorMessage(message);
        localStorage.setItem("authError", message);
        setShowErrorDialog(true);
        setShowModal(false);
        return;
      }

      // If successful, close the modal
      setShowModal(false);
    } catch (error) {
      console.error('Google sign-in error:', error);
      const auth = getAuth();
      if (auth.currentUser) {
        await auth.signOut();
      }
      const message = "An error occurred during sign in. Please try again.";
      setErrorMessage(message);
      localStorage.setItem("authError", message);
      setShowErrorDialog(true);
      setShowModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Show user info if logged in
  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">
          {user.email} 
          {userData?.isAdmin && " (Admin)"}
        </span>
        <Button 
          variant="ghost" 
          onClick={async () => {
            const auth = getAuth();
            await auth.signOut();
          }}
        >
          Logout
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button 
        variant="secondary" 
        onClick={() => setShowModal(true)} 
        className="bg-white text-zinc-950"
      >
        Sign in with Google
      </Button>

      {/* Initial Login Modal */}
      <Dialog 
        open={showModal} 
        onOpenChange={(open) => {
          if (!isLoading) {
            setShowModal(open);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Important Notice</DialogTitle>
            <DialogDescription className="space-y-4">
              <span className="block text-red-500 font-semibold">
                Please use your existing UMAK email address (@umak.edu.ph).
              </span>
              <span className="block">
                You will not be able to proceed if you use any other email domain.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowModal(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleContinue}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Checking...
                </>
              ) : (
                "Continue to Login"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <ErrorDialog
        open={showErrorDialog}
        onClose={() => {
          setShowErrorDialog(false);
          setShowModal(true);
          setErrorMessage("");
          localStorage.removeItem("authError");
        }}
        title="Sign In Failed"
        message={errorMessage}
      />
    </>
  );
} 