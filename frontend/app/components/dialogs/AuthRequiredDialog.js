"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/AuthContext"
import { GoogleIcon } from "../icons/GoogleIcon"
import { WarningIcon } from "../icons/WarningIcon"
import Image from "next/image"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { useState } from "react"

export default function AuthRequiredDialog({ open, onOpenChange }) {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      onOpenChange(false);
    } catch (error) {
      console.error('Sign-in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] p-0 bg-white overflow-hidden border-2 border-yellow-400 rounded-lg">
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>Sign in to UniLostAndFound</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>
        
        {/* Header with Logo */}
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg">
            <Image src="/logo/logo.png" alt="UniLostAndFound" width={64} height={64} />
          </div>
          <h2 className="text-2xl font-bold text-[#0052cc]">UniLostAndFound</h2>
        </div>

        {/* Welcome Message */}
        <div className="px-8 pb-6 text-center">
          <p className="text-gray-600 mb-4 text-sm">
            Welcome back! Please sign in with your UMAK account to access the lost and found system.
          </p>

          {/* Notice Box */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
            <div className="text-sm text-[#0052cc] flex flex-col items-center gap-2">
              <WarningIcon className="w-6 h-6" />
              <p className="text-center">
                Important Notice: Please use your existing UMAK Google account (@umak.edu.ph). You will not be able to proceed if you use any other email domain.
              </p>
            </div>
          </div>

          {/* Sign in Button */}
          <Button 
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 flex items-center justify-center gap-2 h-11"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span>Checking...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="w-5 h-5" />
                <span>Continue with Google</span>
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 text-center">
          <p className="text-sm text-gray-500">
            University of Makati © A.D. 1972
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 