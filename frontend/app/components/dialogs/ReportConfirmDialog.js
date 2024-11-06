"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function ReportConfirmDialog({ open, onOpenChange, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Submitted Successfully</DialogTitle>
          <DialogDescription>
            Our admin will check if the item is in possession. If not, then this will be posted.
            You can check the status of your report in the Pending Processes section.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onConfirm}>
            View Pending Processes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 