"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Package, Eye, Clock, CheckCircle, Inbox, Loader2, XCircle, ExternalLink, MessageSquare, Trash, Filter, Info } from "lucide-react"
import { useState, useEffect } from "react"
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
import { useAuth } from "@/lib/AuthContext";
import { itemApi } from "@/lib/api-client"

// Add this helper function
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function PendingProcessSection({ pendingProcesses = [], onViewDetails, handleDelete, onViewPost }) {
  const { user } = useAuth();
  const [localProcesses, setLocalProcesses] = useState(pendingProcesses);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cancelingItems, setCancelingItems] = useState(new Set());
  const [showAnswerDialog, setShowAnswerDialog] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [verificationQuestions, setVerificationQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showFailedDialog, setShowFailedDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Update localProcesses when pendingProcesses changes
  useEffect(() => {
    setLocalProcesses(pendingProcesses);
  }, [pendingProcesses]);

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

      const response = await fetch(
        `${API_BASE_URL}/api/Item/process/${selectedProcess.id}/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formattedAnswers)
        }
      );

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
      verificationAttempts: process?.verificationAttempts,
      userId: process?.userId,
      requestorUserId: process?.requestorUserId,
      currentUserId: user?.uid,
      reporterId: process?.item?.reporterId
    });

    return process && 
           process.item && 
           process.status !== "awaiting_surrender" && (
               process.userId === user?.uid || // User's reported items
               (process.requestorUserId === user?.uid && process.status === "claim_request") || // User's claim requests
               (process.item.reporterId === user?.uid && process.status === "claim_request") // Claims on user's items
           );
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
    // Add debug logs
    console.log('Process:', process);
    console.log('Current user:', user?.uid);
    console.log('Process status:', process.status);
    console.log('RequestorUserId:', process.requestorUserId);

    let cardStyle = "";
    let statusBadge = null;
    let messageStyle = "";
    let content = null;

    // Common action buttons layout
    const renderActionButtons = (buttons) => (
      <div className="flex gap-2 mt-auto pt-4">
        {buttons}
      </div>
    );

    switch (process.status?.toLowerCase()) {
      case ProcessStatus.CLAIM_REQUEST:
        console.log('Matching requestor?', process.requestorUserId === user?.uid);
        cardStyle = "border-l-4 border-l-blue-500";
        statusBadge = (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
            Claim Request Pending
          </Badge>
        );
        
        // Show different views for requestor and reporter
        if (process.requestorUserId === user?.uid) {
          // Requestor view (person who made the claim)
          return (
            <div key={process.id} className={`bg-white rounded-lg shadow-md overflow-hidden ${cardStyle}`}>
              <div className="p-4 flex flex-col h-full">
                {/* Status Badge */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    {statusBadge}
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(process.createdAt)}
                  </span>
                </div>

                {/* Item Details */}
                <div className="space-y-4 flex-grow">
                  <div className="flex flex-col gap-2">
                    {/* Item Info */}
                    <div className="flex-grow">
                      <h3 className="font-medium text-gray-900">
                        {process.item?.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {process.item?.location}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Category: {process.item?.category}
                      </p>
                    </div>
                  </div>

                  {/* Status Message */}
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    <Info className="h-4 w-4 inline-block mr-2 text-blue-500" />
                    Your claim request is being reviewed. Please wait for admin verification.
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button
                    key="view-post"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onViewPost(process.item)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Post
                  </Button>
                  <Button
                    key="cancel-claim"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleCancelClaimRequest(process.id)}
                    disabled={cancelingItems.has(process.id)}
                  >
                    {cancelingItems.has(process.id) ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Canceling...
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancel Claim
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        } else if (process.item.reporterId === user?.uid) {
          // Reporter view (person who reported the item)
          return (
            <div key={process.id} className={`bg-white rounded-lg shadow-md overflow-hidden ${cardStyle}`}>
              <div className="p-4 flex flex-col h-full">
                {/* Status Badge */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                      New Claim Request
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(process.createdAt)}
                  </span>
                </div>

                {/* Item Details */}
                <div className="space-y-4 flex-grow">
                  <div className="flex flex-col gap-2">
                    {/* Item Info */}
                    <div className="flex-grow">
                      <h3 className="font-medium text-gray-900">
                        {process.item?.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {process.item?.location}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Category: {process.item?.category}
                      </p>
                    </div>
                  </div>

                  {/* Status Message */}
                  <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                    <Info className="h-4 w-4 inline-block mr-2 text-yellow-500" />
                    Someone has claimed this item. Admin will verify their claim.
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex mt-4">
                  <Button
                    key="view-post"
                    variant="outline"
                    className="w-full"
                    onClick={() => onViewPost(process.item)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Post
                  </Button>
                </div>
              </div>
            </div>
          );
        }
        return null;
        break;

      case ProcessStatus.PENDING_APPROVAL:
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
                  key="view-details"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onViewDetails(formatItemForDetails(process))}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button
                  key="cancel-request"
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

      case ProcessStatus.IN_VERIFICATION:
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
              <div className="grid grid-cols-1 gap-2 w-full">
                <Button
                  key="view-details"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onViewDetails(formatItemForDetails(process))}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button
                  key="answer-questions"
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={() => handleAnswerQuestions(process)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Answer Questions
                </Button>
                <Button
                  key="cancel-request"
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

      case ProcessStatus.APPROVED:
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
                  key="view-post"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onViewPost(process.item)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Post
                </Button>
                <Button
                  key="cancel-request"
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
                  key="view-details"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onViewDetails(formatItemForDetails(process))}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button
                  key="cancel-request"
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

      case ProcessStatus.VERIFICATION_FAILED:
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
              <Button
                key="view-details"
                variant="outline"
                className="flex-1"
                onClick={() => onViewDetails(formatItemForDetails(process))}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </Button>
            )}
          </div>
        );
        break;

      case ProcessStatus.PENDING_RETRIEVAL:
        cardStyle = "border-l-4 border-l-orange-500";
        statusBadge = (
          <Badge variant="outline" className="bg-orange-100 text-orange-800">
            Pending Retrieval
          </Badge>
        );
        messageStyle = "text-orange-800 bg-orange-50";
        content = (
          <div className="flex flex-col h-full">
            <div className="space-y-4 flex-1">
              <div className={`p-4 rounded-lg ${messageStyle} flex items-start gap-3`}>
                <div className="flex-shrink-0 mt-1">
                  <Package className="h-5 w-5 text-orange-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {ProcessMessages.PENDING_RETRIEVAL}
                  </p>
                  <p className="text-sm text-orange-600">
                    Ready for pickup since {new Date(process.updatedAt).toLocaleDateString()}
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
              <Button
                key="view-details"
                variant="outline"
                className="flex-1"
                onClick={() => onViewDetails(formatItemForDetails(process))}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </Button>
            )}
          </div>
        );
        break;

      case ProcessStatus.HANDED_OVER:
        cardStyle = "border-l-4 border-l-blue-500";
        statusBadge = (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            Handed Over
          </Badge>
        );
        messageStyle = "text-blue-800 bg-blue-50";
        content = (
          <div className="flex flex-col h-full">
            <div className="space-y-4 flex-1">
              <div className={`p-4 rounded-lg ${messageStyle} flex items-start gap-3`}>
                <div className="flex-shrink-0 mt-1">
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Item has been successfully handed over
                  </p>
                  <p className="text-sm text-blue-600">
                    Completed on {new Date(process.updatedAt).toLocaleDateString()}
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
              <Button
                key="view-details"
                variant="outline"
                className="flex-1"
                onClick={() => onViewDetails(formatItemForDetails(process))}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </Button>
            )}
          </div>
        );
        break;

      case ProcessStatus.NO_SHOW:
        cardStyle = "border-l-4 border-l-red-500";
        statusBadge = (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            No Show
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
                    {ProcessMessages.NO_SHOW}
                  </p>
                  <p className="text-sm text-red-600">
                    Marked as no-show on {new Date(process.updatedAt).toLocaleDateString()}
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
              <Button
                key="view-details"
                variant="outline"
                className="flex-1"
                onClick={() => onViewDetails(formatItemForDetails(process))}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </Button>
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
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg truncate">
                  {process.item?.name || process.item?.Name}
                </h3>
                <Badge variant="outline" className={`${
                  process.item?.status?.toLowerCase() === "lost" 
                    ? "bg-red-100 text-red-800" 
                    : "bg-green-100 text-green-800"
                }`}>
                  {process.item?.status?.toLowerCase() === "lost" ? "Lost" : "Found"}
                </Badge>
              </div>
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

  // Add filter functions
  const filterProcesses = (processes) => {
    return processes.filter(process => {
      // Status filter
      const matchesStatus = statusFilter === "all" || process.status === statusFilter;
      
      // Type filter
      const itemType = process.item?.status?.toLowerCase() || "";
      const matchesType = typeFilter === "all" || itemType === typeFilter;

      return matchesStatus && matchesType;
    });
  };

  // Add this function to handle claim request cancellation
  const handleCancelClaimRequest = async (processId) => {
    try {
        // Set loading state first
        setCancelingItems(prev => new Set([...prev, processId]));

        // Call the API
        const response = await fetch(`${API_BASE_URL}/api/Item/process/${processId}/cancel-claim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to cancel claim request');
        }

        // Update local state
        setLocalProcesses(prevProcesses => 
            prevProcesses.filter(p => p.id !== processId)
        );

        // Trigger parent component refresh by calling fetchUserPendingProcesses
        if (typeof window !== 'undefined') {
            const event = new CustomEvent('refreshPendingProcesses');
            window.dispatchEvent(event);
        }

        toast({
            title: "Success",
            description: "Claim request cancelled successfully",
            variant: "success",
        });
    } catch (error) {
        console.error('Error canceling claim request:', error);
        toast({
            title: "Error",
            description: "Failed to cancel claim request",
            variant: "destructive",
        });
    } finally {
        setCancelingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(processId);
            return newSet;
        });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm drop-shadow-[0_10px_15px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#0052cc]">Pending Processes</h2>
              <p className="text-gray-600 mt-1">Track the status of your reported items</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select
                  value={typeFilter}
                  onValueChange={setTypeFilter}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="lost">Lost Items</SelectItem>
                    <SelectItem value="found">Found Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Status Filter */}
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
            filterProcesses(validProcesses)
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