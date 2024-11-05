"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function VerificationSuccessDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verification Successful!</DialogTitle>
          <DialogDescription>
            Your answers have been verified. Please proceed to the student center to retrieve your item.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Okay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 