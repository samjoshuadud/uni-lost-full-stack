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
import { getAuth } from "firebase/auth";
import ErrorDialog from "./dialogs/ErrorDialog";

export default function LoginButton() {
  const { user, isAdmin, signInWithGoogle, logout } = useAuth();
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
      await signInWithGoogle();
      setShowModal(false);
    } catch (error) {
      console.error('Sign-in error:', error);
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
          {isAdmin && " (Admin)"}
        </span>
        <Button 
          variant="ghost" 
          onClick={logout}
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