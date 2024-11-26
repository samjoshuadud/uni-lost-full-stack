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

export default function FailedVerificationDialog({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Verification Failed</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            You have exceeded the maximum number of verification attempts. Please visit the admin office during office hours (Mon-Sat) to claim your item.
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-700">
                Please bring:
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