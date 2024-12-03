"use client"

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { generateVerificationQuestions } from "@/lib/gemini";

export default function ClaimVerificationDialog({ 
  isOpen, 
  onClose, 
  item,
  onSubmit 
}) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && item) {
      generateQuestions();
    }
  }, [isOpen, item]);

  const generateQuestions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const generatedQuestions = await generateVerificationQuestions({
        name: item.name,
        category: item.category,
        description: item.description,
        location: item.location,
        imageUrl: item.imageUrl // Pass image URL if available
      });

      setQuestions(generatedQuestions);
      setAnswers(new Array(generatedQuestions.length).fill(''));
    } catch (err) {
      console.error('Error generating questions:', err);
      setError('Failed to generate verification questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    onSubmit(questions.map((q, i) => ({
      question: q,
      answer: answers[i]
    })));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Verify Item Ownership</DialogTitle>
          <DialogDescription>
            Please answer these questions to verify that this is your item.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              Generating verification questions...
            </p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <Button
              variant="outline"
              onClick={generateQuestions}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {questions.map((question, index) => (
              <div key={index} className="space-y-2">
                <label className="text-sm font-medium">
                  {question}
                </label>
                <Input
                  value={answers[index]}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  placeholder="Your answer"
                />
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || answers.some(a => !a.trim()) || error}
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 