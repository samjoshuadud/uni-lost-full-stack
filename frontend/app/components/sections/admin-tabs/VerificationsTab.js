"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Package, Trash, ExternalLink, Loader2, Activity, RotateCcw, Clock, CheckCircle, XCircle, MessageSquare, CalendarIcon, MapPinIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect } from "react"
import { ProcessStatus, ProcessMessages } from "@/lib/constants"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { toast } from "react-hot-toast"
import { API_BASE_URL } from "@/lib/api-config"
import { useAuth } from "@/lib/AuthContext"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function VerificationsTab({ 
  processes = [], 
  handleViewDetails,
  verificationCounts = {
    inProgress: 0,
    underReview: 0,
    failed: 0,
    claims: 0
  }
}) {
  const [activeSubTab, setActiveSubTab] = useState("in_progress");
  const [cancelingProcessId, setCancelingProcessId] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState(null);
  const [questionsMap, setQuestionsMap] = useState({});
  const [isMarkingWrong, setIsMarkingWrong] = useState(false);
  const [isMarkingCorrect, setIsMarkingCorrect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState({});
  const { makeAuthenticatedRequest } = useAuth();
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);

  // Filter processes based on status
  const verificationProcesses = processes.filter(p => p.status === ProcessStatus.IN_VERIFICATION);
  const answerReviewProcesses = processes.filter(p => p.status === ProcessStatus.AWAITING_REVIEW);
  const claimRequestProcesses = processes.filter(p => p.status === ProcessStatus.CLAIM_REQUEST);

  useEffect(() => {
    const fetchQuestionsForProcess = async (processId) => {
      try {
        console.log('Fetching questions for process:', processId); // Debug log

        const response = await fetch(`${API_BASE_URL}/api/Item/process/${processId}/questions`);
        const data = await response.json();
        
        console.log('Questions API response:', data); // Debug log
        
        if (data && data.success && data.data) {
          // Handle both array and $values structure
          const questions = Array.isArray(data.data) ? data.data : 
                           (data.data.$values || []);
          
          console.log('Processed questions:', questions); // Debug log

          setQuestionsMap(prev => {
            const updated = {
              ...prev,
              [processId]: questions
            };
            console.log('Updated questions map:', updated); // Debug log
            return updated;
          });
        }
      } catch (error) {
        console.error(`Error fetching questions for process ${processId}:`, error);
      }
    };

    // Fetch questions for all relevant processes
    const fetchQuestionsForAllProcesses = async () => {
      console.log('Processes to fetch questions for:', processes); // Debug log
      
      const relevantProcesses = processes.filter(p => 
        p.status === ProcessStatus.IN_VERIFICATION || 
        p.status === ProcessStatus.AWAITING_REVIEW ||
        p.status === ProcessStatus.CLAIM_REQUEST
      );

      console.log('Relevant processes:', relevantProcesses); // Debug log

      for (const process of relevantProcesses) {
        if (!questionsMap[process.id]) {
          await fetchQuestionsForProcess(process.id);
        }
      }
    };

    fetchQuestionsForAllProcesses();
  }, [processes]); // Remove questionsMap from dependencies to prevent infinite loop

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await makeAuthenticatedRequest('/api/Auth/users');
        if (response) {
          // Create a map of email to user details
          const userMap = {};
          // Check if response is an array or has a special structure
          const userArray = Array.isArray(response) ? response : 
                           (response.$values || []);
          
          userArray.forEach(user => {
            // Map both email and id as keys for easier lookup
            userMap[user.email] = user;
            userMap[user.id] = user;
          });
          
          console.log('Fetched users:', userMap); // Debug log
          setUsers(userMap);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, [makeAuthenticatedRequest]);

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

  const handleViewDetailsClick = (process) => {
    if (!process) return;
    handleViewDetails(formatItemForDetails(process));
  };

  const handleCancelVerification = async (processId) => {
    try {
      setCancelingProcessId(processId);
      
      const response = await fetch(`${API_BASE_URL}/api/Item/process/${processId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to cancel verification');
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Verification cancelled successfully",
          variant: "success",
        });
        // Optionally refresh the data or update UI
      }
    } catch (error) {
      console.error('Error canceling verification:', error);
      toast({
        title: "Error",
        description: "Failed to cancel verification",
        variant: "destructive",
      });
    } finally {
      setCancelingProcessId(null);
      setShowCancelDialog(false);
      setSelectedProcessId(null);
    }
  };

  const handleWrongAnswer = async (processId) => {
    try {
      setIsMarkingWrong(true);
      
      const response = await fetch(`${API_BASE_URL}/api/Item/process/${processId}/wrong-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark answers as wrong');
      }

      const data = await response.json();
      
      // Show appropriate toast message
      if (data.success) {
        toast({
          title: "Verification Failed",
          description: data.message,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Error marking answers as wrong:', error);
      toast({
        title: "Error",
        description: "Failed to process wrong answers",
        variant: "destructive",
      });
    } finally {
      setIsMarkingWrong(false);
    }
  };

  const handleCorrectAnswer = async (processId) => {
    try {
      setIsMarkingCorrect(true);
      
      const response = await fetch(`${API_BASE_URL}/api/Item/process/${processId}/correct-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark answers as correct');
      }

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Verification Successful",
          description: data.message,
          variant: "success",
        });
      }

    } catch (error) {
      console.error('Error marking answers as correct:', error);
      toast({
        title: "Error",
        description: "Failed to process correct answer",
        variant: "destructive",
      });
    } finally {
      setIsMarkingCorrect(false);
    }
  };

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

  const handleApproveVerification = async (processId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/Item/process/${processId}/approve-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to approve claim');
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Claim approved successfully",
          variant: "success",
        });
        // Trigger refresh of processes
        window.dispatchEvent(new Event('refreshPendingProcesses'));
      }
    } catch (error) {
      console.error('Error approving claim:', error);
      toast({
        title: "Error",
        description: "Failed to approve claim",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectVerification = async (processId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/Item/process/${processId}/reject-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reject claim');
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Claim Rejected",
          description: "The claim has been rejected successfully",
          variant: "success",
        });
        // Trigger refresh of processes
        window.dispatchEvent(new Event('refreshPendingProcesses'));
      }
    } catch (error) {
      console.error('Error rejecting claim:', error);
      toast({
        title: "Error",
        description: "Failed to reject claim",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderVerificationCard = (process) => {
    // ... existing code ...
  };

  const renderClaimRequestCard = (process) => {
    // Get user details from the users map
    console.log('Process:', process); // Debug log
    console.log('Users map:', users); // Debug log
    
    const reporterUser = users[process.item?.reporterId] || 
                        users[process.item?.ReporterId] || {};
    const claimantUser = users[process.requestorUserId] || 
                        users[process.RequestorUserId] || {};

    console.log('Reporter user:', reporterUser); // Debug log
    console.log('Claimant user:', claimantUser); // Debug log

    // Debug logs
    console.log('Rendering claim request for process:', process.id);
    console.log('Current questions map:', questionsMap);
    console.log('Questions for this process:', questionsMap[process.id]);

    return (
      <Card key={process.id} className="border-l-4 border-l-purple-500">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            {/* Header with Status and Date */}
            <div className="flex justify-between items-start">
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
                {ProcessMessages.CLAIM_REQUEST}
              </Badge>
              <span className="text-sm text-gray-500">
                {formatDate(process.createdAt)}
              </span>
            </div>

            {/* Item Details */}
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {process.item?.imageUrl ? (
                  <img
                    src={process.item.imageUrl}
                    alt={process.item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-medium text-lg">{process.item?.name}</h3>
                <p className="text-sm text-gray-500">Location: {process.item?.location}</p>
                <p className="text-sm text-gray-500">Category: {process.item?.category}</p>
              </div>
            </div>

            {/* User Details */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Original Reporter</h4>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Student ID:</span> {reporterUser.studentId || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Name:</span> {reporterUser.displayName || 'N/A'}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Claimant</h4>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Student ID:</span> {claimantUser.studentId || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Name:</span> {claimantUser.displayName || 'N/A'}
                </p>
              </div>
            </div>

            {/* Verification Questions and Answers */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Verification Questions & Answers</h4>
              {questionsMap[process.id] ? (
                questionsMap[process.id].length > 0 ? (
                  questionsMap[process.id].map((qa, index) => (
                    <div key={index} className="bg-white border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">
                            Q{index + 1}: {qa.question || qa.Question}
                          </p>
                          <p className="text-sm text-gray-600 mt-1 pl-4">
                            <span className="font-medium">Answer:</span> {qa.answer || qa.Answer || 'No answer provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">No questions available</p>
                  </div>
                )
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Loading questions and answers...</p>
                </div>
              )}
            </div>

            {/* Additional Info */}
            {process.additionalInfo && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Additional Information</h4>
                <p className="text-sm text-gray-600">{process.additionalInfo}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-green-500 hover:bg-green-50 text-green-600"
                onClick={() => handleApproveVerification(process.id)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve Claim
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleRejectVerification(process.id)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Reject Claim
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleItemClick = (item) => {
    setSelectedItemForDetails(item);
    setShowDetailsDialog(true);
  };

  // Update the container styles
  const tabContentContainerStyles = "bg-white rounded-lg border border-gray-100 shadow-sm p-6";
  const scrollContainerStyles = "space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50";

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Verifications Management
        </h3>
        <p className="text-gray-600 mt-2">
          Monitor and process item verifications. Review student responses to verification questions, 
          handle claim requests, and ensure legitimate ownership before item retrieval.
        </p>
      </div>

      {/* Tabs Section - Add mt-6 for consistent spacing */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full mt-6">
        <TabsList className="w-full grid grid-cols-4 gap-2 bg-gray-100/80 p-1.5 rounded-lg mb-6 min-h-[48px]">
          <TabsTrigger 
            value="in_progress"
            className="relative group flex items-center justify-center gap-2 h-[38px] text-gray-600 rounded-md transition-all duration-200
              data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm
              hover:bg-white/60 px-3"
          >
            <Clock className="h-4 w-4" />
            <span className="font-medium">In Progress</span>
            {verificationCounts.inProgress > 0 && (
              <Badge variant="secondary" className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white border-2 border-white shadow-sm h-5 min-w-[20px] flex items-center justify-center">
                {verificationCounts.inProgress}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger 
            value="awaiting_review"
            className="relative group flex items-center justify-center gap-2 h-[38px] text-gray-600 rounded-md transition-all duration-200
              data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm
              hover:bg-white/60 px-3"
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Under Review</span>
            {verificationCounts.underReview > 0 && (
              <Badge variant="secondary" className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white border-2 border-white shadow-sm h-5 min-w-[20px] flex items-center justify-center">
                {verificationCounts.underReview}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger 
            value="failed"
            className="relative group flex items-center justify-center gap-2 h-[38px] text-gray-600 rounded-md transition-all duration-200
              data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm
              hover:bg-white/60 px-3"
          >
            <XCircle className="h-4 w-4" />
            <span className="font-medium">Failed</span>
            {verificationCounts.failed > 0 && (
              <Badge variant="secondary" className="absolute -top-1.5 -right-1.5 bg-red-500 text-white border-2 border-white shadow-sm h-5 min-w-[20px] flex items-center justify-center">
                {verificationCounts.failed}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger 
            value="claims"
            className="relative group flex items-center justify-center gap-2 h-[38px] text-gray-600 rounded-md transition-all duration-200
              data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm
              hover:bg-white/60 px-3"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="font-medium">Claim Requests</span>
            {verificationCounts.claims > 0 && (
              <Badge variant="secondary" className="absolute -top-1.5 -right-1.5 bg-purple-500 text-white border-2 border-white shadow-sm h-5 min-w-[20px] flex items-center justify-center">
                {verificationCounts.claims}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in_progress">
          <div className={tabContentContainerStyles}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                In Progress Verifications
              </h4>
            </div>
            <div className={scrollContainerStyles}>
              {verificationProcesses.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No verifications in progress</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4 pb-4">
                  {verificationProcesses.map((process) => (
                    <Card 
                      key={process.id} 
                      className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleItemClick(process)}
                    >
                      <CardContent className="p-6">
                        <div className="flex gap-6">
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

                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h4 className="font-bold text-lg">
                                  {process.item?.name}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Student ID: {process.item?.studentId}
                                </p>
                              </div>
                              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                In Verification
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm">
                                <strong>Category:</strong> {process.item?.category}
                              </p>
                              <p className="text-sm">
                                <strong>Location:</strong> {process.item?.location}
                              </p>
                              <div className="mt-4 space-y-2">
                                <p className="text-sm font-medium text-blue-600">Verification Questions:</p>
                                {questionsMap[process.id]?.map((q, index) => (
                                  <div key={index} className="bg-blue-50 p-3 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                      {index + 1}. {q.question}
                                    </p>
                                  </div>
                                ))}
                                {!questionsMap[process.id] && (
                                  <p className="text-sm text-gray-500 italic">Loading questions...</p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => handleViewDetailsClick(process)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            
                            <Button
                              variant="outline"
                              className="w-full text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => {
                                setSelectedProcessId(process.id);
                                setShowCancelDialog(true);
                              }}
                              disabled={cancelingProcessId === process.id}
                            >
                              {cancelingProcessId === process.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Canceling...
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Cancel Verification
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="awaiting_review">
          <div className={tabContentContainerStyles}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-indigo-600" />
                Items Under Review
              </h4>
            </div>
            <div className={scrollContainerStyles}>
              {answerReviewProcesses.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No verifications awaiting review</p>
                  </CardContent>
                </Card>
              ) : (
                answerReviewProcesses
                  .map((process) => (
                    <Card key={process.id} className="border-l-4 border-l-indigo-500">
                      <CardContent className="p-6">
                        <div className="flex gap-6">
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

                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h4 className="font-bold text-lg">
                                  {process.item?.name}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Student ID: {process.item?.studentId}
                                </p>
                              </div>
                              <Badge variant="outline" className="bg-indigo-100 text-indigo-800">
                                Under Review
                              </Badge>
                            </div>
                            <div className="space-y-3">
                              <p className="text-sm font-medium text-indigo-600">Verification Questions & Answers:</p>
                              {questionsMap[process.id] ? (
                                questionsMap[process.id].map((qa, index) => (
                                  <div key={qa.id} className="bg-indigo-50 p-4 rounded-lg space-y-2">
                                    <p className="text-sm text-indigo-800">
                                      <span className="font-medium">Q{index + 1}:</span> {qa.question}
                                    </p>
                                    {qa.answer && (
                                      <p className="text-sm text-indigo-600 pl-4">
                                        <span className="font-medium">Answer:</span> {qa.answer}
                                      </p>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500 italic">Loading questions and answers...</p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => handleViewDetailsClick(process)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            
                            <Button
                              variant="outline"
                              className="w-full text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => {
                                setSelectedProcessId(process.id);
                                setShowCancelDialog(true);
                              }}
                              disabled={cancelingProcessId === process.id}
                            >
                              {cancelingProcessId === process.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Canceling...
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Cancel Verification
                                </>
                              )}
                            </Button>
                            
                            <div className="flex gap-2 mt-4">
                              <Button
                                variant="outline"
                                className="flex-1 border-green-500 hover:bg-green-50 text-green-600"
                                onClick={() => handleCorrectAnswer(process.id)}
                                disabled={isMarkingCorrect}
                              >
                                {isMarkingCorrect ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Correct
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={() => handleWrongAnswer(process.id)}
                                disabled={isMarkingWrong}
                              >
                                {isMarkingWrong ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Wrong
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="failed">
          <div className={tabContentContainerStyles}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Failed Verifications
              </h4>
            </div>
            <div className={scrollContainerStyles}>
              {processes.filter(process => process.status === "verification_failed").length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No failed verifications</p>
                  </CardContent>
                </Card>
              ) : (
                processes
                  .filter(process => process.status === "verification_failed")
                  .map((process) => (
                    <Card key={process.id} className="border-l-4 border-l-red-500">
                      <CardContent className="p-6">
                        <div className="flex gap-6">
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

                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h4 className="font-bold text-lg">
                                  {process.item?.name}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Student ID: {process.item?.studentId}
                                </p>
                              </div>
                              <Badge variant="destructive">
                                Failed Verification
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm">
                                <strong>Category:</strong> {process.item?.category}
                              </p>
                              <p className="text-sm">
                                <strong>Location:</strong> {process.item?.location}
                              </p>
                              <p className="text-sm text-red-600">
                                Failed verification after {process.verificationAttempts} attempts
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => handleViewDetailsClick(process)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <div className={tabContentContainerStyles}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                Claim Requests
              </h4>
            </div>
            <div className={scrollContainerStyles}>
              {claimRequestProcesses.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No pending claim requests</p>
                    <p className="text-sm mt-2">When users submit claims for lost items, they will appear here</p>
                  </CardContent>
                </Card>
              ) : (
                claimRequestProcesses.map((process) => renderClaimRequestCard(process))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Verification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this verification process? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelingProcessId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleCancelVerification(selectedProcessId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelingProcessId !== null}
            >
              {cancelingProcessId ? "Canceling..." : "Yes, Cancel Verification"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {/* Header Section */}
          <div className="px-6 py-4 border-b bg-[#f8f9fa]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <DialogTitle className="text-xl font-semibold text-[#0052cc]">Item Details</DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4" />
                    {selectedItemForDetails?.item?.dateReported ? 
                      format(new Date(selectedItemForDetails.item.dateReported), 'MMMM do, yyyy') 
                      : 'Date not available'
                    }
                  </div>
                </div>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 capitalize px-3 py-1.5">
                  In Verification
                </Badge>
              </div>
            </DialogHeader>
          </div>

          {selectedItemForDetails && (
            <>
              {/* Content Section */}
              <div className="p-6 space-y-6">
                {/* Image and Details Grid */}
                <div className="grid md:grid-cols-[240px,1fr] gap-6">
                  {/* Image Section */}
                  <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                    {selectedItemForDetails.item?.imageUrl ? (
                      <img
                        src={selectedItemForDetails.item.imageUrl}
                        alt={selectedItemForDetails.item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Package className="h-12 w-12 mb-2" />
                        <p className="text-sm">No Image</p>
                      </div>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-gray-500">Item Name</h4>
                        <p className="font-medium">{selectedItemForDetails.item?.name}</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-gray-500">Status</h4>
                        <p className="font-medium capitalize">In Verification</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-gray-500">Category</h4>
                        <p className="font-medium">{selectedItemForDetails.item?.category}</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-gray-500">Location</h4>
                        <p className="font-medium flex items-center gap-1.5">
                          <MapPinIcon className="h-4 w-4 text-gray-400" />
                          {selectedItemForDetails.item?.location}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-gray-500">Description</h4>
                      <p className="text-gray-700">{selectedItemForDetails.item?.description}</p>
                    </div>

                    {/* Verification Questions */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-blue-600">Verification Questions:</h4>
                      <div className="space-y-2">
                        {questionsMap[selectedItemForDetails.id]?.map((q, index) => (
                          <div key={index} className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm text-blue-800">
                              {index + 1}. {q.question}
                            </p>
                          </div>
                        ))}
                        {!questionsMap[selectedItemForDetails.id] && (
                          <p className="text-sm text-gray-500 italic">Loading questions...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Section */}
              <div className="px-6 py-4 border-t bg-[#f8f9fa] flex justify-end gap-3">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setSelectedProcessId(selectedItemForDetails.id);
                    setShowCancelDialog(true);
                    setShowDetailsDialog(false);
                  }}
                  disabled={cancelingProcessId === selectedItemForDetails.id}
                >
                  {cancelingProcessId === selectedItemForDetails.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Canceling...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Cancel Verification
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
