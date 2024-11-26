"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { ProcessMessages } from "@/lib/constants";

export default function FailedVerificationDialog({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Verification Failed</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {ProcessMessages.VERIFICATION_FAILED}
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700">
                Please visit the admin office during office hours (Mon-Sat) with:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Valid University ID</li>
                  <li>Additional proof of ownership</li>
                </ul>
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 