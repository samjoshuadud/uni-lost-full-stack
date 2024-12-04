"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/AuthContext"
import { useState } from "react"
import AuthRequiredDialog from "./dialogs/AuthRequiredDialog"

export default function LoginButton() {
  const { user, isAdmin, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Show user info if logged in
  if (user) {
    return (
      <div className="flex items-center gap-2 text-white">
        <span className="text-sm">
          {user.email} 
          {isAdmin && " (Admin)"}
        </span>
        <Button 
          variant="ghost"
          onClick={logout}
          className="bg-yellow-400 text-[#0052cc] hover:text-004C99 font-bold ml-4"
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
        className="bg-yellow-400 text-[#0052cc] hover:bg-yellow-400/90 font-bold"
      >
        Sign in with Google
      </Button>

      <AuthRequiredDialog 
        open={showModal} 
        onOpenChange={setShowModal}
      />
    </>
  );
} 