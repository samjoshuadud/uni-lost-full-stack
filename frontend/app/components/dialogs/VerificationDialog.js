"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function VerificationDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  onCancel,
  questions = [], 
  answers = [], 
  onAnswerChange 
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Your Item</DialogTitle>
          <DialogDescription>
            Please answer these verification questions. Your answers will be reviewed by an admin.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={index}>
              <label className="text-sm font-medium">{question}</label>
              <Input
                value={answers[index] || ""}
                onChange={(e) => onAnswerChange(index, e.target.value)}
                placeholder="Your answer"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button onClick={onSubmit}>
            Submit Answers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 