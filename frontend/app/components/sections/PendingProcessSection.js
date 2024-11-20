"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Eye, Clock, CheckCircle, Inbox, Loader2, XCircle, ExternalLink, MessageSquare } from "lucide-react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export default function PendingProcessSection({ pendingProcesses = [], onViewDetails, handleDelete, onViewPost }) {
  const [cancelingItems, setCancelingItems] = useState(new Set());
  const [showAnswerDialog, setShowAnswerDialog] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [verificationQuestions, setVerificationQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswerQuestions = async (process) => {
    try {
      const response = await fetch(`http://localhost:5067/api/Item/process/${process.id}/questions`);
      if (!response.ok) throw new Error('Failed to fetch questions');
      const data = await response.json();
      
      setVerificationQuestions(data.questions.$values || data.questions);
      setAnswers(new Array(data.questions.$values?.length || 0).fill(''));
      setSelectedProcess(process);
      setShowAnswerDialog(true);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const handleSubmitAnswers = async () => {
    if (!selectedProcess) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`http://localhost:5067/api/Item/process/${selectedProcess.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });

      if (!response.ok) throw new Error('Failed to submit answers');

      // Close dialog and reset state
      setShowAnswerDialog(false);
      setSelectedProcess(null);
      setAnswers([]);
      setVerificationQuestions([]);
    } catch (error) {
      console.error('Error submitting answers:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (itemId) => {
    try {
      setCancelingItems(prev => new Set(prev).add(itemId));
      await handleDelete(itemId);
    } finally {
      setCancelingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  // Filter out null or undefined processes
  const validProcesses = pendingProcesses.filter(process => process && process.item);

  // If there are no processes at all, show empty state
  if (!validProcesses || validProcesses.length === 0) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
        <div className="bg-muted/50 rounded-full p-4 mb-4">
          <Inbox className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No Pending Processes</h2>
        <p className="text-muted-foreground max-w-sm">
          You don't have any pending processes at the moment. Your reported items and their status updates will appear here.
        </p>
      </div>
    );
  }

  const renderProcessCard = (process) => {
    if (!process || !process.item) return null;

    // Different card styles based on status
    let cardStyle = "";
    let statusBadge = null;
    let messageStyle = "";
    let content = null;

    switch (process.status) {
      case "pending_approval":
        cardStyle = "border-l-4 border-l-yellow-500";
        statusBadge = (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Pending Approval
          </Badge>
        );
        messageStyle = "text-yellow-800 bg-yellow-50";
        content = (
          <div className="space-y-4">
            <p className={`text-sm p-4 rounded-lg ${messageStyle}`}>
              Your report is currently under review by our administrators. This usually takes 1-2 business days.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Category: {process.item?.category}
              </p>
              <p className="text-sm text-muted-foreground">
                Location: {process.item?.location}
              </p>
              <p className="text-sm text-muted-foreground">
                Submitted: {new Date(process.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
        break;

      case "in_verification":
        cardStyle = "border-l-4 border-l-blue-500";
        statusBadge = (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            In Verification
          </Badge>
        );
        messageStyle = "text-blue-800 bg-blue-50";
        content = (
          <div className="space-y-4">
            <p className={`text-sm p-4 rounded-lg ${messageStyle}`}>
              Your item has been matched! Please answer the verification questions to confirm ownership.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Category: {process.item?.category}
              </p>
              <p className="text-sm text-muted-foreground">
                Location: {process.item?.location}
              </p>
              <p className="text-sm text-muted-foreground">
                Status Updated: {new Date(process.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
        break;

      case "approved":
        cardStyle = "border-l-4 border-l-green-500";
        statusBadge = (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Approved!
          </Badge>
        );
        messageStyle = "text-green-800 bg-green-50";
        content = (
          <div className="space-y-4">
            <p className={`text-sm p-4 rounded-lg ${messageStyle}`}>
              Your item has been approved and is now visible on the dashboard!
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Category: {process.item?.category}
              </p>
              <p className="text-sm text-muted-foreground">
                Location: {process.item?.location}
              </p>
              <p className="text-sm text-muted-foreground">
                Approved: {new Date(process.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
        break;

      default:
        return null;
    }

    return (
      <Card key={process.id} className={cardStyle}>
        <CardContent className="p-6">
          <div className="flex gap-6">
            {/* Image Section */}
            <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
              {process.item?.imageUrl ? (
                <img
                  src={process.item.imageUrl}
                  alt={process.item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Package className="h-8 w-8" />
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-lg">
                    {process.item?.name || 'Unknown Item'}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Student ID: {process.item?.studentId}
                  </p>
                </div>
                {statusBadge}
              </div>
              {content}
            </div>

            {/* Actions Section */}
            <div className="flex flex-col gap-2 justify-start min-w-[140px]">
              {process.status === "approved" ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onViewPost(process.item)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Post
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onViewDetails(process.item)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  {process.status === "in_verification" && (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => handleAnswerQuestions(process)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Answer Questions
                    </Button>
                  )}
                </>
              )}
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => handleCancelRequest(process.item?.id)}
                disabled={cancelingItems.has(process.item?.id)}
              >
                {cancelingItems.has(process.item?.id) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Canceling...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Pending Processes</h2>
      <div className="space-y-4">
        {validProcesses.map(renderProcessCard)}
      </div>

      <Dialog open={showAnswerDialog} onOpenChange={setShowAnswerDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Verification Questions</DialogTitle>
            <DialogDescription>
              Please answer the following questions to verify your ownership of{" "}
              <span className="font-medium">
                {selectedProcess?.item?.name}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {verificationQuestions.map((question, index) => (
              <div key={index} className="space-y-2">
                <label className="text-sm font-medium">
                  Question {index + 1}: {question}
                </label>
                <Input
                  placeholder="Enter your answer..."
                  value={answers[index] || ''}
                  onChange={(e) => {
                    const newAnswers = [...answers];
                    newAnswers[index] = e.target.value;
                    setAnswers(newAnswers);
                  }}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAnswerDialog(false);
                setSelectedProcess(null);
                setAnswers([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAnswers}
              disabled={isSubmitting || answers.some(a => !a.trim())}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Answers"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 