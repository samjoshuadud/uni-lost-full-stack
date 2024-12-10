"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function ClaimInstructionsDialog({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#0052cc]">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Item Claim Instructions
          </DialogTitle>
          <div className="pt-4 space-y-4">
            <DialogDescription>
              To claim this item, please visit the OSHO (Occupational Safety and Health Office) 
              for verification. Here's what you need to do:
            </DialogDescription>
            <div className="space-y-3 bg-blue-50 p-4 rounded-lg text-sm">
              <p className="font-medium text-blue-900">Requirements:</p>
              <ul className="list-disc pl-5 space-y-2 text-blue-800">
                <li>Bring your valid student ID</li>
                <li>Be prepared to provide detailed information about the item</li>
                <li>Office hours: Monday to Friday, 8:00 AM to 5:00 PM</li>
                <li>Location: Basement Floor, Admin Building</li>
              </ul>
            </div>
            <DialogDescription className="text-sm text-gray-600">
              For security purposes, you will be asked to provide specific details about the item 
              to verify your ownership.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button onClick={onClose}>I Understand</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 