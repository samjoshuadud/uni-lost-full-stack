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
import { Textarea } from "@/components/ui/textarea";
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
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && item) {
      generateQuestions();
    }
  }, [isOpen, item]);

  const generateQuestions = async () => {
    if (!item) return;

    try {
      setIsLoading(true);
      setError(null);

      const generatedQuestions = await generateVerificationQuestions({
        name: item.name,
        category: item.category,
        description: item.description,
        location: item.location,
        imageUrl: item.imageUrl
      });

      setQuestions(generatedQuestions);
      setAnswers(new Array(generatedQuestions.length).fill(''));
      setAdditionalInfo('');
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
    const formattedAnswers = questions.map((q, index) => ({
        question: q,
        answer: answers[index] || ''
    }));
    
    console.log('Formatted answers:', formattedAnswers);  // Debug log
    console.log('Additional info:', additionalInfo);      // Debug log
    
    onSubmit(formattedAnswers, additionalInfo);
    onClose();
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setQuestions([]);
      setAnswers([]);
      setAdditionalInfo('');
      setError(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Verify Item Ownership</DialogTitle>
          <DialogDescription>
            Please answer these questions to verify that this is your item.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
              <p className="text-sm text-muted-foreground">
                Generating verification questions...
              </p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center py-8">
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
            <div className="space-y-6 py-4">
              {/* Item Details */}
              {item && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Category: {item.category}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Location: {item.location}
                  </p>
                </div>
              )}

              {/* Questions */}
              <div className="space-y-6">
                {questions.map((question, index) => (
                  <div key={index} className="space-y-2">
                    <label className="text-sm font-medium">
                      Question {index + 1}:
                    </label>
                    <p className="text-sm text-blue-600">{question}</p>
                    <Input
                      value={answers[index]}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      placeholder="Your answer"
                    />
                  </div>
                ))}
              </div>

              {/* Additional Information Section */}
              {questions.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <label className="text-sm font-medium">
                    Additional Information
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Is there anything else that could help verify your ownership?
                  </p>
                  <Textarea
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="Add any other details that could help verify this is your item..."
                    className="min-h-[100px]"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-4 border-t">
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
            className="bg-blue-600 hover:bg-blue-700"
          >
            Submit Claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 