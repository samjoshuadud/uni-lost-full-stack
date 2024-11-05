// login-button.js

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
import { useState } from "react"

export default function LoginButton() {
  const { user, userData, signInWithGoogle, logout, isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const handleContinue = async () => {
    setShowModal(false);
    await signInWithGoogle();
  };

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">
          {user.email} 
          {isAdmin && " (Admin)"}
          {userData?.role && ` - ${userData.role}`}
        </span>
        <Button variant="ghost" onClick={logout}>
          Logout
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setShowModal(true)} className="bg-white text-zinc-950">
        Sign in with Google
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
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
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleContinue}>
              Continue to Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 