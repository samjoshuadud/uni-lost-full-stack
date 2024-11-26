"use client"

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProcessMessages } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

export default function VerificationDialog({ 
  isOpen, 
  onClose, 
  processId, 
  questions,
  onVerificationComplete,
  verificationAttempts = 0
}) {
  const [answers, setAnswers] = useState(Array(questions?.length || 0).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const response = await fetch('http://localhost:5067/api/Item/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          processId,
          answers: questions.map((q, index) => ({
            questionId: q.id,
            answer: answers[index]
          }))
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Verification Successful",
          description: ProcessMessages.VERIFICATION_SUCCESSFUL,
        });
        onVerificationComplete();
        onClose();
      } else {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: data.message,
        });
        
        if (data.message === ProcessMessages.VERIFICATION_FAILED) {
          onVerificationComplete();
          onClose();
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred during verification",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Verify Item Ownership</DialogTitle>
          {verificationAttempts > 0 && (
            <DialogDescription className="text-yellow-600">
              You have {2 - verificationAttempts} attempt(s) remaining
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {questions?.map((question, index) => (
            <div key={index} className="grid gap-2">
              <label className="text-sm font-medium">
                {question.question}
              </label>
              <Input
                value={answers[index]}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                placeholder="Your answer"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || answers.some(a => !a.trim())}
          >
            {isSubmitting ? "Verifying..." : "Submit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 