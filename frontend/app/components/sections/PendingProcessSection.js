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

  const formatItemForDetails = (process) => {
    const additionalDescs = process.item?.additionalDescriptions?.$values || 
                           process.item?.AdditionalDescriptions?.$values || [];
                         
    return {
      id: process.item?.id || process.item?.Id,
      name: process.item?.name || process.item?.Name,
      description: process.item?.description || process.item?.Description,
      location: process.item?.location || process.item?.Location,
      category: process.item?.category || process.item?.Category,
      status: process.item?.status || process.item?.Status,
      imageUrl: process.item?.imageUrl || process.item?.ImageUrl,
      dateReported: process.item?.dateReported || process.item?.DateReported,
      reporterId: process.item?.reporterId || process.item?.ReporterId,
      studentId: process.item?.studentId || process.item?.StudentId,
      additionalDescriptions: Array.isArray(additionalDescs) ? additionalDescs : [],
      approved: process.item?.approved || process.item?.Approved
    };
  };

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
      <Card key={process.id} className={`${cardStyle} h-full`}>
        <CardContent className="p-6">
          <div className="flex flex-col h-full gap-6">
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
            <div className="flex flex-col gap-2 mt-auto pt-4">
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
                    onClick={() => onViewDetails(formatItemForDetails(process))}
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
    <div className="min-h-screen bg-[#f8f9fa] p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0052cc]">Pending Processes</h2>
          <p className="text-gray-600 mt-1">Track the status of your reported items</p>
        </div>

        {/* Process Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {!validProcesses || validProcesses.length === 0 ? (
            <div className="col-span-full">
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-8 text-center">
                  <div className="bg-gray-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Inbox className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Pending Processes</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    You don't have any pending processes at the moment. Your reported items and their status updates will appear here.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            validProcesses.map(renderProcessCard)
          )}
        </div>

        {/* Answer Questions Dialog */}
        <Dialog open={showAnswerDialog} onOpenChange={setShowAnswerDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-[#0052cc]">Verification Questions</DialogTitle>
              <DialogDescription>
                Please answer the following questions to verify your ownership of{" "}
                <span className="font-medium text-gray-700">
                  {selectedProcess?.item?.name}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {verificationQuestions.map((question, index) => (
                <div key={index} className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">
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
                    className="bg-white border-gray-200"
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
                className="border-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAnswers}
                disabled={isSubmitting || answers.some(a => !a.trim())}
                className="bg-[#0052cc] hover:bg-[#0052cc]/90 text-white"
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
    </div>
  );
} 