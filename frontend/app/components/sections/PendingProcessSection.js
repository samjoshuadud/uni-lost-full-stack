"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Eye, Clock, CheckCircle, Inbox, Loader2, XCircle, ExternalLink, MessageSquare, Trash, Filter } from "lucide-react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import FailedVerificationDialog from "../dialogs/FailedVerificationDialog";
import VerificationDialog from "../dialogs/VerificationDialog";
import { ProcessStatus, ProcessMessages } from "@/lib/constants";
import { toast } from "react-hot-toast";
import { API_BASE_URL } from "@/lib/api-config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PendingProcessSection({ pendingProcesses = [], onViewDetails, handleDelete, onViewPost }) {
  const [cancelingItems, setCancelingItems] = useState(new Set());
  const [showAnswerDialog, setShowAnswerDialog] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [verificationQuestions, setVerificationQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showFailedDialog, setShowFailedDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const handleAnswerQuestions = async (process) => {
    try {
      console.log('Fetching questions for process:', process.id);
      const response = await fetch(`${API_BASE_URL}/api/Item/process/${process.id}/questions`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch questions: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Raw API response:', data);

      // Extract questions from the response structure
      let questions = [];
      if (data.data?.$values) {
        questions = data.data.$values.map(q => q.question).filter(Boolean);
      }

      console.log('Parsed questions:', questions);
      
      if (!questions || questions.length === 0) {
        toast({
          title: "No Questions Found",
          description: "No verification questions are available for this item.",
          variant: "destructive",
        });
        return;
      }

      setVerificationQuestions(questions);
      setAnswers(new Array(questions.length).fill(''));
      setSelectedProcess(process);
      setShowAnswerDialog(true);
      
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch verification questions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitAnswers = async () => {
    if (!selectedProcess) return;

    try {
      setIsSubmitting(true);
      
      const formattedAnswers = {
        processId: selectedProcess.id,
        answers: verificationQuestions.map((question, index) => ({
          processId: selectedProcess.id,
          question: question,
          answer: answers[index]
        }))
      };

      console.log('Submitting answers:', formattedAnswers);

      const response = await fetch(`${API_BASE_URL}/api/Item/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formattedAnswers)
      });

      if (!response.ok) {
        throw new Error(`Failed to submit answers: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Submit response:', data);
      
      if (data.success) {
        // Close the answer dialog
        setShowAnswerDialog(false);
        setSelectedProcess(null);
        setAnswers([]);
        setVerificationQuestions([]);
        
        toast({
          title: "Success",
          description: data.message || "Your answers have been submitted for review",
          variant: "success",
        });
      } else {
        // Handle failed verification
        if (data.data?.attemptsRemaining > 0) {
          toast({
            title: "Verification Failed",
            description: data.message || `Incorrect answers. ${data.data.attemptsRemaining} attempt(s) remaining.`,
            variant: "destructive",
          });
          // Reset answers but keep the dialog open
          setAnswers(new Array(verificationQuestions.length).fill(''));
        } else {
          // No attempts remaining
          setShowAnswerDialog(false);
          setSelectedProcess(null);
          setAnswers([]);
          setVerificationQuestions([]);
          
          toast({
            title: "Verification Failed",
            description: data.message || "No more attempts remaining. Please contact admin.",
            variant: "destructive",
          });
          
          // Show failed verification dialog
          setShowFailedDialog(true);
        }
      }

    } catch (error) {
      console.error('Error submitting answers:', error);
      toast({
        title: "Error",
        description: "Failed to submit verification answers. Please try again.",
        variant: "destructive",
      });
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

  const handleVerificationComplete = async () => {
    // Refresh the process list
    setShowVerificationDialog(false);
    setSelectedProcess(null);
    setVerificationQuestions([]);
  };

  // Filter out null or undefined processes
  const validProcesses = pendingProcesses.filter(process => {
    console.log("Processing process:", {
      id: process?.id,
      hasItem: !!process?.item,
      status: process?.status,
      message: process?.message,
      verificationAttempts: process?.verificationAttempts
    });
    return process && process.item;
  });

  const getUniqueStatuses = (processes) => {
    const statuses = processes
      .map(p => p.status)
      .filter(status => status !== ProcessStatus.AWAITING_SURRENDER);
    return ["all", ...new Set(statuses)];
  };

  const formatStatus = (status) => {
    if (status === "all") return "All Statuses";
    if (status === "approved") return "Posted";
    
    return status.split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

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
    // Debug logs with correct case
    console.log("Rendering process:", {
      id: process.id,
      status: process.status,
      message: process.message,
      verificationAttempts: process.verificationAttempts
    });

    let cardStyle = "";
    let statusBadge = null;
    let messageStyle = "";
    let content = null;

    // Common action buttons layout
    const renderActionButtons = (buttons) => (
      <div className="flex flex-col gap-2 mt-auto pt-4">
        {buttons}
      </div>
    );

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
          <div className="flex flex-col h-full">
            <div className="space-y-4 flex-1">
              <p className={`text-sm p-4 rounded-lg ${messageStyle}`}>
                Your report is currently under review by our administrators. This usually takes 1-2 business days.
              </p>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Category:</strong> {process.item?.category}
                </p>
                <p className="text-sm">
                  <strong>Location:</strong> {process.item?.location}
                </p>
                <p className="text-sm">
                  <strong>Submitted:</strong> {new Date(process.createdAt).toLocaleDateString()}
                </p>
                {process.item?.additionalDescriptions?.$values?.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    +{process.item.additionalDescriptions.$values.length} additional details
                  </p>
                )}
              </div>
            </div>
            {renderActionButtons(
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onViewDetails(formatItemForDetails(process))}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
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
                      <Trash className="h-4 w-4 mr-2" />
                      Cancel Request
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        );
        break;

      case "in_verification":
        console.log("Rendering in_verification card:", {
          message: process.message,
          attempts: process.verificationAttempts
        });
        
        cardStyle = "border-l-4 border-l-blue-500";
        statusBadge = (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            In Verification
          </Badge>
        );
        messageStyle = "text-blue-800 bg-blue-50";
        content = (
          <div className="flex flex-col h-full">
            <div className="space-y-4 flex-1">
              <div className={`text-sm p-4 rounded-lg ${messageStyle}`}>
                {console.log("Message display data:", {
                  verificationAttempts: process.verificationAttempts,
                  message: process.message,
                  rawProcess: process
                })}
                {process.verificationAttempts > 0 ? (
                  <>
                    <p className="font-medium">{process.message || "No message available"}</p>
                    <p className="mt-1">
                      Attempts remaining: {3 - process.verificationAttempts}
                    </p>
                  </>
                ) : (
                  <p>Your item has been matched! Please answer the verification questions to confirm ownership.</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Category:</strong> {process.item?.category}
                </p>
                <p className="text-sm">
                  <strong>Location:</strong> {process.item?.location}
                </p>
                <p className="text-sm">
                  <strong>Status Updated:</strong> {new Date(process.updatedAt).toLocaleDateString()}
                </p>
                {process.item?.additionalDescriptions?.$values?.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    +{process.item.additionalDescriptions.$values.length} additional details
                  </p>
                )}
              </div>
            </div>
            {renderActionButtons(
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onViewDetails(formatItemForDetails(process))}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={() => handleAnswerQuestions(process)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Answer Questions
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
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
                      <Trash className="h-4 w-4 mr-2" />
                      Cancel Request
                    </>
                  )}
                </Button>
              </div>
            )}
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
          <div className="flex flex-col h-full">
            <div className="space-y-4 flex-1">
              <p className={`text-sm p-4 rounded-lg ${messageStyle}`}>
                Your item has been approved and is now visible on the dashboard!
              </p>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Category:</strong> {process.item?.category}
                </p>
                <p className="text-sm">
                  <strong>Location:</strong> {process.item?.location}
                </p>
                <p className="text-sm">
                  <strong>Approved:</strong> {new Date(process.updatedAt).toLocaleDateString()}
                </p>
                {process.item?.additionalDescriptions?.$values?.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    +{process.item.additionalDescriptions.$values.length} additional details
                  </p>
                )}
              </div>
            </div>
            {renderActionButtons(
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onViewPost(process.item)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Post
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
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
                      <Trash className="h-4 w-4 mr-2" />
                      Cancel Request
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        );
        break;

      case ProcessStatus.AWAITING_REVIEW:
        cardStyle = "border-l-4 border-l-indigo-500";
        statusBadge = (
          <Badge variant="outline" className="bg-indigo-100 text-indigo-800">
            Under Admin Review
          </Badge>
        );
        messageStyle = "text-indigo-800 bg-indigo-50";
        content = (
          <div className="flex flex-col h-full">
            <div className="space-y-4 flex-1">
              <div className={`p-4 rounded-lg ${messageStyle} flex items-start gap-3`}>
                <div className="flex-shrink-0 mt-1">
                  <Clock className="h-5 w-5 text-indigo-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {ProcessMessages.AWAITING_ANSWER_REVIEW}
                  </p>
                  <p className="text-sm text-indigo-600">
                    Submitted on {new Date(process.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Category:</strong> {process.item?.category}
                </p>
                <p className="text-sm">
                  <strong>Location:</strong> {process.item?.location}
                </p>
                {process.item?.additionalDescriptions?.$values?.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    +{process.item.additionalDescriptions.$values.length} additional details
                  </p>
                )}
              </div>
            </div>
            {renderActionButtons(
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onViewDetails(formatItemForDetails(process))}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
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
                      <Trash className="h-4 w-4 mr-2" />
                      Cancel Request
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        );
        break;

      case "verification_failed":
        cardStyle = "border-l-4 border-l-red-500";
        statusBadge = (
          <Badge variant="destructive">
            Verification Failed
          </Badge>
        );
        messageStyle = "text-red-800 bg-red-50";
        content = (
          <div className="flex flex-col h-full">
            <div className="space-y-4 flex-1">
              <div className={`p-4 rounded-lg ${messageStyle} flex items-start gap-3`}>
                <div className="flex-shrink-0 mt-1">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {process.message || ProcessMessages.VERIFICATION_FAILED_FINAL}
                  </p>
                  <p className="text-sm text-red-600">
                    Failed verification after {process.verificationAttempts} attempts
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Category:</strong> {process.item?.category}
                </p>
                <p className="text-sm">
                  <strong>Location:</strong> {process.item?.location}
                </p>
                {process.item?.additionalDescriptions?.$values?.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    +{process.item.additionalDescriptions.$values.length} additional details
                  </p>
                )}
              </div>
            </div>
            {renderActionButtons(
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onViewDetails(formatItemForDetails(process))}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
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
                      <Trash className="h-4 w-4 mr-2" />
                      Delete Request
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        );
        break;

      default:
        return null;
    }

    return (
      <Card key={process.id} className={cardStyle}>
        <CardContent className="p-6 h-full">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{process.item?.name}</h3>
              {statusBadge}
            </div>
            {content}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Add this function to render verification status
  const renderVerificationStatus = (process) => {
    if (process.status === ProcessStatus.IN_VERIFICATION) {
      return (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            {process.Message || "Please answer the verification questions"}
            {process.VerificationAttempts > 0 && (
              <span className="block mt-1 font-medium">
                Attempts remaining: {3 - process.VerificationAttempts}
              </span>
            )}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#0052cc]">Pending Processes</h2>
              <p className="text-gray-600 mt-1">Track the status of your reported items</p>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {getUniqueStatuses(validProcesses).map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
            validProcesses
              .filter(process => statusFilter === "all" || process.status === statusFilter)
              .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
              .map(renderProcessCard)
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

        {/* Verification Dialog */}
        <VerificationDialog
          isOpen={showVerificationDialog}
          onClose={() => setShowVerificationDialog(false)}
          processId={selectedProcess?.id}
          questions={verificationQuestions}
          onVerificationComplete={handleVerificationComplete}
        />

        {/* Failed Verification Dialog */}
        <FailedVerificationDialog
          isOpen={showFailedDialog}
          onClose={() => setShowFailedDialog(false)}
        />
      </div>
    </div>
  );
} 