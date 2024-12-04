"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Package, Trash, ExternalLink, Loader2, Activity, RotateCcw, Clock, CheckCircle, XCircle, MessageSquare } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect } from "react"
import { ProcessStatus, ProcessMessages } from "@/lib/constants"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { toast } from "react-hot-toast"
import { API_BASE_URL } from "@/lib/api-config"
export default function VerificationsTab({ processes = [] }) {
  const [activeSubTab, setActiveSubTab] = useState("in_progress");
  const [cancelingProcessId, setCancelingProcessId] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState(null);
  const [questionsMap, setQuestionsMap] = useState({});
  const [isMarkingWrong, setIsMarkingWrong] = useState(false);
  const [isMarkingCorrect, setIsMarkingCorrect] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter processes based on status
  const verificationProcesses = processes.filter(p => p.status === ProcessStatus.IN_VERIFICATION);
  const answerReviewProcesses = processes.filter(p => p.status === ProcessStatus.AWAITING_REVIEW);
  const claimRequestProcesses = processes.filter(p => p.status === ProcessStatus.CLAIM_REQUEST);

  useEffect(() => {
    const fetchQuestionsForProcess = async (processId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Item/process/${processId}/questions`);
        if (!response.ok) {
          console.error('Failed to fetch questions for process:', processId);
          return;
        }
        const data = await response.json();
        
        if (data && data.success && data.data && data.data.$values) {
          setQuestionsMap(prev => ({
            ...prev,
            [processId]: data.data.$values.map(q => ({
              question: q.question,
              answer: q.answer,
              id: q.id
            }))
          }));
        }
      } catch (error) {
        console.error(`Error fetching questions for process ${processId}:`, error);
      }
    };

    const processesToFetch = processes.filter(p => 
      p.status === ProcessStatus.IN_VERIFICATION || 
      p.status === ProcessStatus.AWAITING_REVIEW
    );
    
    processesToFetch.forEach(process => {
      if (!questionsMap[process.id]) {
        fetchQuestionsForProcess(process.id);
      }
    });
  }, [processes]);

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
    // ... existing code ...
  };

  const handleRejectVerification = async (processId) => {
    // ... existing code ...
  };

  const renderVerificationCard = (process) => {
    // ... existing code ...
  };

  const renderClaimRequestCard = (process) => {
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
                <p className="text-sm text-gray-600">ID: {process.item?.reporterId}</p>
                <p className="text-sm text-gray-600">Student ID: {process.item?.studentId}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Claimant</h4>
                <p className="text-sm text-gray-600">ID: {process.requestorUserId}</p>
              </div>
            </div>

            {/* Verification Questions and Answers */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Verification Questions</h4>
              {process.verificationQuestions?.map((question, index) => (
                <div key={index} className="bg-white border rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700">Q{index + 1}: {question.question}</p>
                  <p className="text-sm text-gray-600 mt-1">A: {question.answer || 'No answer yet'}</p>
                </div>
              ))}
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
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Claim
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleRejectVerification(process.id)}
                disabled={loading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Claim
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        Verifications
      </h3>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="w-full flex justify-between bg-muted p-1 rounded-lg mb-6">
          <TabsTrigger 
            value="in_progress"
            className="flex-1 text-center data-[state=active]:bg-[#0052cc] data-[state=active]:text-white"
          >
            In Progress
          </TabsTrigger>
          <TabsTrigger 
            value="awaiting_review"
            className="flex-1 text-center data-[state=active]:bg-[#0052cc] data-[state=active]:text-white"
          >
            Under Review
          </TabsTrigger>
          <TabsTrigger 
            value="failed"
            className="flex-1 text-center data-[state=active]:bg-[#0052cc] data-[state=active]:text-white"
          >
            Failed
          </TabsTrigger>
          <TabsTrigger 
          value="claims" 
          className="flex-1 text-center data-[state=active]:bg-[#0052cc] data-[state=active]:text-white"
          
          >
            Claim Requests
            {claimRequestProcesses.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-700">
                    {claimRequestProcesses.length}
                </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in_progress">
          <div className="space-y-4">
            {verificationProcesses.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No verifications in progress</p>
                </CardContent>
              </Card>
            ) : (
              verificationProcesses
                .map((process) => (
                  <Card 
                    key={process.id}
                    className="border-l-4 border-l-blue-500"
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
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="awaiting_review">
          <div className="space-y-4">
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
        </TabsContent>

        <TabsContent value="failed">
          <div className="space-y-4">
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
                          <Button
                            variant="destructive"
                            className="w-full"
                            onClick={() => onDelete(process.item.id)}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete Item
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
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
    </div>
  );
}
