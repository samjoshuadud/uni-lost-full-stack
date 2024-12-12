"use client"

import React from "react";
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Package, Eye, Clock, CheckCircle, Inbox, Loader2, XCircle, ExternalLink, MessageSquare, Trash, Filter, Info, MapPin } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"

// Add these animation variants at the top of the file
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { 
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: {
      duration: 0.2
    }
  }
};

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
    });const formatDate = (dateString) => {
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
};

// Add this function at the top of the component, after the state declarations
const canDelete = (process) => {
  return process.status !== ProcessStatus.HANDED_OVER && 
         (process.userId === user?.uid || // User's reported items
          process.requestorUserId === user?.uid || // User's claim requests
          process.item?.reporterId === user?.uid); // Claims on user's items
};

// Simplified grouping helper
const groupProcesses = (processes) => {
  const groups = {
    pending_retrieval: [],
    claim_request: [],
    pending_approval: [],
    approved: [],
    handed_over: [],
    no_show: []
  };

  processes.forEach(process => {
    const status = process.status?.toLowerCase();
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(process);
  });

  return groups;
};

// Simplified section title helper
const getSectionTitle = (status) => {
  const titles = {
    'pending_retrieval': 'Ready for Pickup',
    'claim_request': 'Claim Requests',
    'pending_approval': 'Pending Approval',
    'approved': 'Posted Items',
    'handed_over': 'Handed Over',
    'no_show': 'No Show'
  };

  return titles[status] || status.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Add this new function to render Ready for Pickup cards
const renderPickupCard = (process) => {
  const isLost = process.item?.status?.toLowerCase() === 'lost';
  
  return (
    <Card key={process.id} className={`overflow-hidden border-l-4 ${
      isLost ? 'border-l-red-500' : 'border-l-green-500'
    }`}>
      <CardContent className="p-4">
        {/* Title and Status Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">{process.item?.name}</h3>
            <Badge variant="secondary" className={`${
              isLost ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {isLost ? 'Lost' : 'Found'}
            </Badge>
          </div>
          <Badge variant="secondary" className="bg-orange-50 text-orange-700 ml-auto">
            Pending Retrieval
          </Badge>
        </div>

        {/* Pickup Status Message */}
        <div className="bg-orange-50/50 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <Package className="h-5 w-5 text-orange-500 mt-0.5" />
            <div>
              <p className="text-orange-800 font-medium">Waiting for item retrieval</p>
              <p className="text-sm text-orange-600">
                Ready for pickup since {formatDate(process.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Item Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">Category:</span>
            <span>{process.item?.category || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Location:</span>
            <span>{process.item?.location}</span>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => onViewDetails(formatItemForDetails(process))}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};

// Update the renderActionButtons function to handle both single and multiple buttons
const renderActionButtons = (buttons) => {
  // If buttons is a single button (not wrapped in a Fragment)
  if (React.isValidElement(buttons)) {
    return (
      <div className="grid grid-cols-2 gap-2 mt-4">
        {React.cloneElement(buttons, {
          className: `${buttons.props.className} h-10 px-4 text-sm font-medium`
        })}
      </div>
    );
  }

  // If buttons are multiple (wrapped in Fragment)
  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {React.Children.map(buttons.props.children, (button) =>
        React.cloneElement(button, {
          className: `h-10 px-4 text-sm font-medium`
        })
      )}
    </div>
  );
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
            <div 
              key={process.id} 
              className={`bg-white rounded-lg shadow-md overflow-hidden ${cardStyle} transition-all duration-300 hover:shadow-xl hover:-translate-y-1 drop-shadow-[0_4px_8px_rgba(0,0,0,0.08)]`}
            >
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
            <div 
              key={process.id} 
              className={`bg-white rounded-lg shadow-md overflow-hidden ${cardStyle} transition-all duration-300 hover:shadow-xl hover:-translate-y-1 drop-shadow-[0_4px_8px_rgba(0,0,0,0.08)]`}
            >
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
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button
                  key="view-details"
                  variant="outline"
                  onClick={() => onViewDetails(formatItemForDetails(process))}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button
                  key="cancel-request"
                  variant="destructive"
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
                className="col-span-2"
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
                className="col-span-2"
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
                className="col-span-2"
                onClick={() => onViewDetails(formatItemForDetails(process))}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </Button>
            )}
          </div>
        );
        break;

      case ProcessStatus.APPROVED:
        const isLostItem = process.item?.status?.toLowerCase() === 'lost';
        cardStyle = "border-l-4 border-l-green-500";
        statusBadge = (
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Posted
            </Badge>
            <Badge variant="outline" className={`${
              isLostItem 
                ? 'bg-red-100 text-red-800' 
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {isLostItem ? 'Lost Item' : 'Found Item'}
            </Badge>
          </div>
        );
        messageStyle = "text-green-800 bg-green-50";
        content = (
          <div className="flex flex-col h-full">
            <div className="space-y-4 flex-1">
              <div className={`p-4 rounded-lg ${messageStyle} flex items-start gap-3`}>
                <div className="flex-shrink-0 mt-1">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Your {isLostItem ? 'lost' : 'found'} item has been posted and is now visible on the dashboard!
                  </p>
                  <p className="text-sm text-green-600">
                    Posted on {new Date(process.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Item Name:</strong> {process.item?.name}
                </p>
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
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button
                  key="view-post"
                  variant="outline"
                  onClick={() => onViewPost(process.item)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Post
                </Button>
                <Button
                  key="cancel-request"
                  variant="destructive"
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
                      Cancel Post
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        );
        break;

      default:
        return null;
    }

    return (
      <Card 
        key={process.id} 
        className={`${cardStyle} transition-all duration-300 hover:shadow-xl hover:-translate-y-1 drop-shadow-[0_4px_8px_rgba(0,0,0,0.08)]`}
      >
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

  // Filter processes based on selected filters
  const filteredProcesses = validProcesses.filter(process => {
    const matchesStatus = statusFilter === "all" || process.status === statusFilter;
    const matchesType = typeFilter === "all" || process.item?.status?.toLowerCase() === typeFilter;
    return matchesStatus && matchesType;
  });

  // Group filtered processes
  const groupedProcesses = groupProcesses(filteredProcesses);

  // Define section order
  const sectionOrder = [
    'pending_retrieval',    // Ready for Pickup
    'claim_request',        // Claim Requests
    'pending_approval',     // Pending Approval
    'approved',            // Posted Items
    'handed_over',         // Handed Over
    'no_show'              // No Show
  ];

  return (
    <div className="max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
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
      {!filteredProcesses || filteredProcesses.length === 0 ? (
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
        <Tabs defaultValue="pending_retrieval" className="w-full">
          <div className="bg-[#2E3F65] rounded-full shadow-lg h-14">
            <TabsList className="flex w-full bg-transparent h-full px-1 justify-between overflow-x-auto">
              {sectionOrder.map(status => {
                const count = groupedProcesses[status]?.length || 0;
                return (
                  <TabsTrigger
                    key={status}
                    value={status}
                    className={`
                      flex-shrink-0
                      px-4 py-2 rounded-full
                      data-[state=active]:bg-[#FFD43B]
                      data-[state=active]:text-[#2E3F65]
                      data-[state=active]:shadow-sm
                      data-[state=active]:scale-95
                      data-[state=active]:hover:bg-[#F5B800]
                      text-white/90
                      transition-all duration-200
                      hover:bg-white
                      hover:text-[#003D99]
                      group
                      text-xs sm:text-sm
                      whitespace-nowrap
                      mx-0.5
                    `}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="font-medium group-hover:text-inherit">
                        {getSectionTitle(status)}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`
                          px-1.5 py-0.5 rounded-full text-xs font-medium
                          ${status === 'pending_retrieval' 
                            ? 'bg-red-500 text-white group-hover:bg-red-600'
                            : status === 'claim_request'
                            ? 'bg-blue-500 text-white group-hover:bg-blue-600'
                            : status === 'pending_approval'
                            ? 'bg-[#FFD43B] text-[#2E3F65] group-hover:bg-[#FFB800]'
                            : status === 'approved'
                            ? 'bg-emerald-500 text-white group-hover:bg-emerald-600'
                            : 'bg-blue-500 text-white group-hover:bg-blue-600'
                          }
                          transition-colors duration-200
                        `}
                      >
                        {count}
                      </Badge>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {sectionOrder.map(status => {
            const processes = groupedProcesses[status] || [];
            return (
              <TabsContent 
                key={status} 
                value={status} 
                className="mt-8 focus-visible:outline-none"
              >
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                  {processes.length === 0 ? (
                    <motion.div
                      variants={itemVariants}
                      className="col-span-full"
                    >
                      <Card className="border-0 shadow-sm bg-white">
                        <CardContent className="p-8 text-center">
                          <div className="bg-gray-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <Inbox className="h-8 w-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Items</h3>
                          <p className="text-gray-500 max-w-sm mx-auto">
                            There are no items with {getSectionTitle(status).toLowerCase()} status.
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {processes
                        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                        .map((process) => (
                          <motion.div
                            key={process.id}
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            layout
                            layoutId={process.id}
                            className="h-full"
                            style={{
                              transformOrigin: "center center",
                              position: "relative"
                            }}
                            whileHover={{ 
                              scale: 1.02,
                              transition: { 
                                duration: 0.2,
                                ease: "easeOut"
                              }
                            }}
                          >
                            {status === 'pending_retrieval' 
                              ? renderPickupCard(process)
                              : renderProcessCard(process)
                            }
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  )}
                </motion.div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

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
  );
} 